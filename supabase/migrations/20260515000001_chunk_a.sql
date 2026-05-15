-- Chunk A: sortie controls, invoicing, reschedule, wishlist resolution

------------------------------------------------------------
-- Sorties
------------------------------------------------------------
create or replace function start_sortie(p_job_id uuid)
returns sorties language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_job jobs;
  v_sortie sorties;
  v_next int;
begin
  select * into v_job from jobs where id = p_job_id for update;
  if v_job.id is null then raise exception 'Job % not found', p_job_id; end if;
  if v_job.state not in ('crew_assigned','in_progress') then
    raise exception 'Cannot start sortie when job state is % (must be crew_assigned or in_progress)', v_job.state;
  end if;
  if v_job.assigned_pilot_id is null or v_job.assigned_drone_id is null then
    raise exception 'Job % has no pilot or drone assigned', p_job_id;
  end if;

  select coalesce(max(sortie_number), 0) + 1 into v_next from sorties where job_id = p_job_id;

  insert into sorties (tenant_id, job_id, sortie_number, pilot_id, drone_id, takeoff_at, state)
  values (v_job.tenant_id, p_job_id, v_next, v_job.assigned_pilot_id, v_job.assigned_drone_id, now(), 'active')
  returning * into v_sortie;

  -- bump job + drone
  if v_job.state = 'crew_assigned' then
    update jobs set state = 'in_progress' where id = p_job_id;
  end if;
  update drones set status = 'in_flight', current_job_id = p_job_id where id = v_job.assigned_drone_id;

  return v_sortie;
end;
$$;

create or replace function close_sortie(
  p_sortie_id uuid,
  p_area_covered numeric,
  p_volume_sprayed numeric
)
returns sorties language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_sortie sorties;
  v_remaining int;
begin
  select * into v_sortie from sorties where id = p_sortie_id for update;
  if v_sortie.id is null then raise exception 'Sortie % not found', p_sortie_id; end if;
  if v_sortie.state <> 'active' then
    raise exception 'Sortie % is not active (state: %)', p_sortie_id, v_sortie.state;
  end if;

  update sorties
    set state = 'closed',
        landing_at = now(),
        area_covered_acres = coalesce(p_area_covered, 0),
        volume_sprayed_l = coalesce(p_volume_sprayed, 0)
    where id = p_sortie_id
    returning * into v_sortie;

  -- if no other active sortie for this drone, mark it ready
  select count(*) into v_remaining from sorties
    where drone_id = v_sortie.drone_id and state = 'active';
  if v_remaining = 0 and v_sortie.drone_id is not null then
    update drones set status = 'ready',
                      hours_flown = hours_flown + extract(epoch from (now() - v_sortie.takeoff_at)) / 3600.0,
                      hours_since_service = hours_since_service + extract(epoch from (now() - v_sortie.takeoff_at)) / 3600.0
      where id = v_sortie.drone_id;
  end if;

  return v_sortie;
end;
$$;

create or replace function abort_sortie(p_sortie_id uuid, p_reason text)
returns sorties language plpgsql security definer set search_path = public, extensions
as $$
declare v_sortie sorties;
begin
  select * into v_sortie from sorties where id = p_sortie_id for update;
  if v_sortie.id is null then raise exception 'Sortie % not found', p_sortie_id; end if;
  if v_sortie.state <> 'active' then
    raise exception 'Sortie % is not active (state: %)', p_sortie_id, v_sortie.state;
  end if;
  update sorties set state = 'aborted', aborted_reason = p_reason, landing_at = now()
    where id = p_sortie_id returning * into v_sortie;
  -- drone returns to ready
  if v_sortie.drone_id is not null then
    update drones set status = 'ready' where id = v_sortie.drone_id;
  end if;
  return v_sortie;
end;
$$;

------------------------------------------------------------
-- Reschedule
------------------------------------------------------------
create or replace function reschedule_job(p_job_id uuid, p_new_date date, p_reason text)
returns jobs language plpgsql security definer set search_path = public, extensions
as $$
declare v_job jobs;
begin
  select * into v_job from jobs where id = p_job_id for update;
  if v_job.id is null then raise exception 'Job % not found', p_job_id; end if;
  if v_job.state in ('complete','paid','cancelled','failed') then
    raise exception 'Cannot reschedule job in terminal state %', v_job.state;
  end if;
  -- release old slot if it was holding one
  if v_job.state in ('confirmed','crew_assigned') then
    perform release_slot(v_job.tenant_id, v_job.scheduled_date);
  end if;
  -- try new slot
  if not reserve_slot(v_job.tenant_id, p_new_date) then
    raise exception 'No capacity on %; pick another date or add capacity', p_new_date;
  end if;
  update jobs
    set scheduled_date = p_new_date,
        reschedule_count = reschedule_count + 1,
        override_reason = coalesce(p_reason, override_reason)
    where id = p_job_id returning * into v_job;
  perform write_audit(v_job.tenant_id, auth.uid(), 'user', 'manual',
    'job', v_job.id, 'job.rescheduled',
    jsonb_build_object('from', v_job.scheduled_date, 'to', p_new_date, 'reason', p_reason));
  return v_job;
end;
$$;

------------------------------------------------------------
-- Invoice
------------------------------------------------------------
create or replace function generate_invoice_number(p_tenant_id uuid)
returns text language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_slug text; v_year text; v_seq int;
begin
  select upper(substr(coalesce(slug,'XXX'), 1, 3)) into v_slug from tenants where id = p_tenant_id;
  v_year := to_char(now(), 'YY');
  select coalesce(max(nullif(regexp_replace(number, '.*-([0-9]{5})$', '\1'), '')::int), 0) + 1
    into v_seq
    from invoices
    where tenant_id = p_tenant_id
      and number like format('INV-%s-%s-%%', v_slug, v_year);
  return format('INV-%s-%s-%s', v_slug, v_year, lpad(v_seq::text, 5, '0'));
end;
$$;

create or replace function generate_invoice(p_job_id uuid)
returns invoices language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_job jobs;
  v_t tenants;
  v_existing invoices;
  v_inv invoices;
  v_pricing jsonb;
  v_subtotal numeric; v_tax numeric; v_total numeric;
  v_upi text;
begin
  select * into v_job from jobs where id = p_job_id;
  if v_job.id is null then raise exception 'Job % not found', p_job_id; end if;
  if v_job.state not in ('complete','invoiced','paid') then
    raise exception 'Job must be complete to invoice (current: %)', v_job.state;
  end if;

  -- idempotent — return existing invoice for this job if any
  select * into v_existing from invoices where job_id = p_job_id limit 1;
  if v_existing.id is not null then return v_existing; end if;

  select * into v_t from tenants where id = v_job.tenant_id;
  v_pricing := coalesce(v_job.pricing_snapshot, calculate_pricing(p_job_id));
  v_subtotal := coalesce((v_pricing->>'subtotal')::numeric, 0);
  v_tax      := coalesce((v_pricing->>'tax')::numeric, 0);
  v_total    := coalesce((v_pricing->>'total')::numeric, 0);

  -- minimal UPI payload (real QR is rendered client-side)
  v_upi := format('upi://pay?pa=%s&pn=%s&am=%s&cu=INR&tn=%s',
                  coalesce(v_t.upi_vpa, 'noreply@upi'),
                  replace(coalesce(v_t.name, 'AgroSpray'), ' ', '%20'),
                  v_total::text,
                  v_job.number);

  insert into invoices (tenant_id, job_id, number, line_items, subtotal, tax_total, total, upi_qr_payload)
  values (
    v_job.tenant_id, v_job.id,
    generate_invoice_number(v_job.tenant_id),
    coalesce(v_pricing->'line_items', '[]'::jsonb),
    v_subtotal, v_tax, v_total, v_upi
  ) returning * into v_inv;

  update jobs set state = 'invoiced' where id = p_job_id and state = 'complete';

  perform write_audit(v_job.tenant_id, auth.uid(), 'user', 'auto',
    'invoice', v_inv.id, 'invoice.created',
    jsonb_build_object('job_id', v_job.id, 'number', v_inv.number, 'total', v_total));

  return v_inv;
end;
$$;

create or replace function mark_invoice_paid(
  p_invoice_id uuid,
  p_method text,
  p_reference text
)
returns invoices language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_inv invoices;
begin
  select * into v_inv from invoices where id = p_invoice_id for update;
  if v_inv.id is null then raise exception 'Invoice % not found', p_invoice_id; end if;
  if v_inv.paid_at is not null then return v_inv; end if;

  update invoices
    set paid_at = now(),
        paid_by_method = p_method,
        paid_reference = p_reference
    where id = p_invoice_id returning * into v_inv;

  update jobs set state = 'paid' where id = v_inv.job_id;

  perform write_audit(v_inv.tenant_id, auth.uid(), 'user', 'manual',
    'invoice', v_inv.id, 'invoice.paid',
    jsonb_build_object('method', p_method, 'ref', p_reference, 'total', v_inv.total));
  return v_inv;
end;
$$;

------------------------------------------------------------
-- Wishlist
------------------------------------------------------------
create or replace function confirm_wishlist(p_wishlist_id uuid)
returns jobs language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_w wishlist_entries;
  v_job jobs;
  v_farmer farmers;
  v_number text;
begin
  select * into v_w from wishlist_entries where id = p_wishlist_id for update;
  if v_w.id is null then raise exception 'Wishlist entry % not found', p_wishlist_id; end if;
  if v_w.status <> 'waiting' and v_w.status <> 'notified' then
    raise exception 'Wishlist entry % is %, cannot confirm', p_wishlist_id, v_w.status;
  end if;

  select * into v_farmer from farmers where id = v_w.farmer_id;
  if v_farmer.id is null then raise exception 'Farmer not found for wishlist'; end if;

  if not reserve_slot(v_w.tenant_id, v_w.preferred_date) then
    raise exception 'Still no capacity on %', v_w.preferred_date;
  end if;

  v_number := generate_job_number(v_w.tenant_id, coalesce(v_w.crop, 'XXX'), v_w.preferred_date);

  insert into jobs (tenant_id, number, farmer_id, crop, area, area_acres, scheduled_date, state)
  values (
    v_w.tenant_id, v_number, v_w.farmer_id,
    coalesce(v_w.crop, 'unknown'),
    coalesce(v_w.area_acres, 1), coalesce(v_w.area_acres, 1),
    v_w.preferred_date,
    'confirmed'
  ) returning * into v_job;

  update jobs set pricing_snapshot = calculate_pricing(v_job.id) where id = v_job.id;

  update wishlist_entries
    set status = 'confirmed', confirmed_at = now()
    where id = p_wishlist_id;

  perform write_audit(v_w.tenant_id, auth.uid(), 'user', 'manual',
    'wishlist', v_w.id, 'wishlist.confirmed',
    jsonb_build_object('job_id', v_job.id, 'job_number', v_job.number));

  return v_job;
end;
$$;

create or replace function cancel_wishlist(p_wishlist_id uuid, p_reason text)
returns wishlist_entries language plpgsql security definer set search_path = public, extensions
as $$
declare v_w wishlist_entries;
begin
  update wishlist_entries set status = 'cancelled'
    where id = p_wishlist_id returning * into v_w;
  if v_w.id is null then raise exception 'Wishlist entry % not found', p_wishlist_id; end if;
  perform write_audit(v_w.tenant_id, auth.uid(), 'user', 'manual',
    'wishlist', v_w.id, 'wishlist.cancelled',
    jsonb_build_object('reason', p_reason));
  return v_w;
end;
$$;
