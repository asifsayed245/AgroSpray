-- AgroSpray V1 business logic: triggers + functions for FSM, audit, slot allocation,
-- pricing, anti-fraud reconciliation. (PRD §6.6, §6.8, §6.9, §7)

------------------------------------------------------------
-- 1. Auto-create profile on signup (PRD §6.5.3)
------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, phone, full_name)
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

------------------------------------------------------------
-- 2. Audit log — hash-chained writer (PRD §6.9.1, §11.10)
------------------------------------------------------------
create or replace function write_audit(
  p_tenant_id uuid,
  p_actor_id uuid,
  p_actor_type text,
  p_source audit_source,
  p_entity_type text,
  p_entity_id uuid,
  p_event_type text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_prev_hash text;
  v_hash text;
  v_row_id uuid := gen_random_uuid();
  v_now timestamptz := now();
  v_canonical text;
begin
  -- get the latest hash within this tenant scope for chaining
  select hash into v_prev_hash
  from audit_events
  where tenant_id = p_tenant_id
  order by created_at desc, id desc
  limit 1;

  v_canonical := concat_ws('|',
    coalesce(v_prev_hash, ''),
    p_tenant_id::text,
    coalesce(p_actor_id::text, ''),
    p_actor_type,
    p_source::text,
    p_entity_type,
    coalesce(p_entity_id::text, ''),
    p_event_type,
    coalesce(p_payload::text, '{}'),
    v_now::text
  );
  v_hash := encode(digest(v_canonical, 'sha256'), 'hex');

  insert into audit_events (
    id, tenant_id, actor_id, actor_type, source,
    entity_type, entity_id, event_type, payload,
    prev_hash, hash, created_at
  ) values (
    v_row_id, p_tenant_id, p_actor_id, p_actor_type, p_source,
    p_entity_type, p_entity_id, p_event_type, p_payload,
    v_prev_hash, v_hash, v_now
  );

  return v_row_id;
end;
$$;

------------------------------------------------------------
-- 3. Trigger: write audit on job state transitions
------------------------------------------------------------
create or replace function audit_job_state_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if tg_op = 'INSERT' then
    perform write_audit(
      new.tenant_id, auth.uid(), 'user', 'auto',
      'job', new.id, 'job.created',
      jsonb_build_object('state', new.state, 'number', new.number)
    );
  elsif tg_op = 'UPDATE' and new.state is distinct from old.state then
    perform write_audit(
      new.tenant_id, auth.uid(), 'user',
      case when new.override_reason is distinct from old.override_reason
             and new.override_reason is not null
           then 'override'::audit_source
           else 'auto'::audit_source
      end,
      'job', new.id, 'job.state_changed',
      jsonb_build_object(
        'from', old.state, 'to', new.state,
        'override_reason', new.override_reason
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_jobs_audit on jobs;
create trigger trg_jobs_audit
  after insert or update on jobs
  for each row execute function audit_job_state_change();

------------------------------------------------------------
-- 4. Job number generator: AGR-{tenant_slug3}-{state2}-{YYMMDD}-{crop3}-{seq4}
------------------------------------------------------------
create or replace function generate_job_number(p_tenant_id uuid, p_crop text, p_date date)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_tenant_slug text;
  v_state text;
  v_crop3 text;
  v_seq int;
  v_date_part text;
begin
  select upper(substr(coalesce(slug,'XXX'), 1, 3)) into v_tenant_slug from tenants where id = p_tenant_id;
  select upper(coalesce(substr(state,1,2),'XX')) into v_state from tenants where id = p_tenant_id;
  v_crop3 := upper(substr(regexp_replace(coalesce(p_crop, 'XXX'), '[^A-Za-z]', '', 'g'), 1, 3));
  v_date_part := to_char(p_date, 'YYMMDD');

  -- count existing same-prefix numbers for this tenant + date to get next seq
  select coalesce(max(
    nullif(regexp_replace(number, '.*-([0-9]{4})$', '\1'), '')::int
  ), 0) + 1
  into v_seq
  from jobs
  where tenant_id = p_tenant_id
    and number like format('AGR-%s-%s-%s-%s-%%', v_tenant_slug, v_state, v_date_part, v_crop3);

  return format('AGR-%s-%s-%s-%s-%s',
    v_tenant_slug, v_state, v_date_part, v_crop3, lpad(v_seq::text, 4, '0')
  );
end;
$$;

------------------------------------------------------------
-- 5. Slot reservation — SELECT FOR UPDATE for concurrency (PRD §6.6.1)
------------------------------------------------------------
create or replace function reserve_slot(p_tenant_id uuid, p_date date)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_capacity int;
  v_booked int;
  v_unavailable boolean;
begin
  select capacity, booked, unavailable
  into v_capacity, v_booked, v_unavailable
  from slots
  where tenant_id = p_tenant_id and date = p_date
  for update;

  if not found then
    -- create slot with default capacity if missing
    insert into slots (tenant_id, date, capacity, booked)
    values (p_tenant_id, p_date, 5, 1);
    return true;
  end if;

  if v_unavailable then
    return false;
  end if;

  if v_booked >= v_capacity then
    return false;
  end if;

  update slots set booked = booked + 1
  where tenant_id = p_tenant_id and date = p_date;

  return true;
end;
$$;

create or replace function release_slot(p_tenant_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update slots
  set booked = greatest(0, booked - 1)
  where tenant_id = p_tenant_id and date = p_date;
end;
$$;

------------------------------------------------------------
-- 6. Compliance checks (PRD §6.8)
------------------------------------------------------------
create or replace function run_compliance_checks(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_job jobs%rowtype;
  v_pilot pilots%rowtype;
  v_drone drones%rowtype;
  v_tenant tenants%rowtype;
  v_pest pesticides_cib%rowtype;
  v_overall_pass boolean := true;
begin
  select * into v_job from jobs where id = p_job_id;
  if not found then return false; end if;
  select * into v_tenant from tenants where id = v_job.tenant_id;

  -- DGCA Operator UIN check
  if coalesce(v_tenant.dgca_operator_uin, '') = '' then
    insert into compliance_checks (tenant_id, job_id, check_type, status, reason)
    values (v_job.tenant_id, v_job.id, 'dgca_uin', 'fail', 'No DGCA Operator UIN on tenant');
    v_overall_pass := false;
  else
    insert into compliance_checks (tenant_id, job_id, check_type, status, reason)
    values (v_job.tenant_id, v_job.id, 'dgca_uin', 'pass', 'Operator UIN present');
  end if;

  -- Pilot RPC check (if pilot assigned)
  if v_job.assigned_pilot_id is not null then
    select * into v_pilot from pilots where id = v_job.assigned_pilot_id;
    if v_pilot.rpc_expiry is null or v_pilot.rpc_expiry < current_date then
      insert into compliance_checks (tenant_id, job_id, check_type, status, reason)
      values (v_job.tenant_id, v_job.id, 'dgca_rpc', 'fail',
        format('Pilot RPC expired or missing (expiry: %s)', v_pilot.rpc_expiry));
      v_overall_pass := false;
    else
      insert into compliance_checks (tenant_id, job_id, check_type, status, reason)
      values (v_job.tenant_id, v_job.id, 'dgca_rpc', 'pass',
        format('RPC valid until %s', v_pilot.rpc_expiry));
    end if;
  end if;

  -- CIB pesticide check
  if coalesce(v_job.pesticide_name, '') <> '' then
    select * into v_pest from pesticides_cib
      where lower(name) = lower(v_job.pesticide_name)
      limit 1;
    if not found then
      insert into compliance_checks (tenant_id, job_id, check_type, status, reason, reference_data)
      values (v_job.tenant_id, v_job.id, 'cib_pesticide', 'fail',
        'Pesticide not found in CIB registry',
        jsonb_build_object('name', v_job.pesticide_name));
      v_overall_pass := false;
    elsif not v_pest.drone_approved then
      insert into compliance_checks (tenant_id, job_id, check_type, status, reason, reference_data)
      values (v_job.tenant_id, v_job.id, 'cib_pesticide', 'fail',
        'Pesticide not CIB-approved for drone application',
        jsonb_build_object('name', v_pest.name));
      v_overall_pass := false;
    elsif not (lower(v_job.crop) = any(v_pest.approved_crops)) then
      insert into compliance_checks (tenant_id, job_id, check_type, status, reason, reference_data)
      values (v_job.tenant_id, v_job.id, 'cib_pesticide', 'fail',
        format('Pesticide not approved for crop %s', v_job.crop),
        jsonb_build_object('name', v_pest.name, 'crop', v_job.crop));
      v_overall_pass := false;
    else
      insert into compliance_checks (tenant_id, job_id, check_type, status, reason)
      values (v_job.tenant_id, v_job.id, 'cib_pesticide', 'pass',
        format('Approved for %s via drone', v_job.crop));
    end if;
  end if;

  -- Pricing presence check
  if v_job.pricing_snapshot is null then
    insert into compliance_checks (tenant_id, job_id, check_type, status, reason)
    values (v_job.tenant_id, v_job.id, 'pricing', 'fail', 'No pricing snapshot');
    v_overall_pass := false;
  else
    insert into compliance_checks (tenant_id, job_id, check_type, status, reason)
    values (v_job.tenant_id, v_job.id, 'pricing', 'pass', 'Pricing locked');
  end if;

  perform write_audit(
    v_job.tenant_id, auth.uid(), 'user', 'auto',
    'job', v_job.id, 'compliance.evaluated',
    jsonb_build_object('overall', case when v_overall_pass then 'pass' else 'fail' end)
  );

  return v_overall_pass;
end;
$$;

------------------------------------------------------------
-- 7. Pricing snapshot (PRD §6.8.3)
------------------------------------------------------------
create or replace function calculate_pricing(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_job jobs%rowtype;
  v_t tenants%rowtype;
  v_base numeric;
  v_subtotal numeric;
  v_tax numeric := 0;
  v_total numeric;
  v_line_items jsonb;
  v_per_acre numeric;
begin
  select * into v_job from jobs where id = p_job_id;
  select * into v_t from tenants where id = v_job.tenant_id;

  v_per_acre := coalesce((v_t.pricing_defaults->>'baseRatePerAcre')::numeric, 600);
  v_base := v_per_acre * coalesce(v_job.area_acres, 0);

  v_line_items := jsonb_build_array(
    jsonb_build_object(
      'description', format('Drone spray service · %s acres × ₹%s', v_job.area_acres, v_per_acre),
      'sac', '9986',
      'amount', v_base,
      'gst_rate', 0,
      'gst_amount', 0
    )
  );

  v_subtotal := v_base;
  v_total := v_subtotal + v_tax;

  return jsonb_build_object(
    'currency', 'INR',
    'line_items', v_line_items,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'total', v_total,
    'cancellation_policy', v_t.cancellation_policy,
    'snapshot_at', now()
  );
end;
$$;

------------------------------------------------------------
-- 8. Anti-fraud reconciliation (PRD §6.8.4, §7.3)
------------------------------------------------------------
create or replace function reconcile_job(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_job jobs%rowtype;
  v_covered numeric;
  v_volume numeric;
  v_coverage_pct numeric;
  v_pass boolean := true;
  v_notes jsonb := '[]'::jsonb;
begin
  select * into v_job from jobs where id = p_job_id;

  select coalesce(sum(area_covered_acres),0), coalesce(sum(volume_sprayed_l),0)
  into v_covered, v_volume
  from sorties
  where job_id = p_job_id and state = 'closed';

  v_coverage_pct := case when v_job.area_acres > 0
                         then (v_covered / v_job.area_acres) * 100
                         else 0
                    end;

  if v_coverage_pct < 90 then
    v_pass := false;
    v_notes := v_notes || jsonb_build_object('check','area_covered','status','fail','value',v_coverage_pct);
  else
    v_notes := v_notes || jsonb_build_object('check','area_covered','status','pass','value',v_coverage_pct);
  end if;

  perform write_audit(
    v_job.tenant_id, auth.uid(), 'system', 'auto',
    'job', v_job.id, 'antifraud.reconciled',
    jsonb_build_object('pass', v_pass, 'coverage_pct', v_coverage_pct,
                       'volume_l', v_volume, 'notes', v_notes)
  );

  return v_pass;
end;
$$;

------------------------------------------------------------
-- 9. Job FSM transitions
------------------------------------------------------------
create or replace function submit_job_for_compliance(p_job_id uuid)
returns jobs
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_job jobs;
  v_pricing jsonb;
  v_pass boolean;
begin
  select * into v_job from jobs where id = p_job_id for update;
  if v_job.state <> 'draft' and v_job.state <> 'wishlist' then
    raise exception 'Job % not in draft/wishlist state (current: %)', p_job_id, v_job.state;
  end if;

  v_pricing := calculate_pricing(p_job_id);
  update jobs set pricing_snapshot = v_pricing, state = 'compliance' where id = p_job_id;
  v_pass := run_compliance_checks(p_job_id);

  if v_pass and reserve_slot(v_job.tenant_id, v_job.scheduled_date) then
    update jobs set state = 'confirmed' where id = p_job_id returning * into v_job;
  elsif v_pass then
    update jobs set state = 'wishlist' where id = p_job_id returning * into v_job;
  else
    update jobs set state = 'comp_fail' where id = p_job_id returning * into v_job;
  end if;

  return v_job;
end;
$$;

create or replace function assign_crew(p_job_id uuid, p_pilot_id uuid, p_drone_id uuid)
returns jobs
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_job jobs;
begin
  select * into v_job from jobs where id = p_job_id for update;
  if v_job.state <> 'confirmed' then
    raise exception 'Job % must be in confirmed state to assign crew (current: %)', p_job_id, v_job.state;
  end if;

  update jobs
  set assigned_pilot_id = p_pilot_id,
      assigned_drone_id = p_drone_id,
      state = 'crew_assigned'
  where id = p_job_id
  returning * into v_job;

  return v_job;
end;
$$;

create or replace function complete_job(p_job_id uuid)
returns jobs
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_job jobs;
  v_pass boolean;
begin
  select * into v_job from jobs where id = p_job_id for update;
  v_pass := reconcile_job(p_job_id);
  update jobs set state = case when v_pass then 'complete'::job_state else 'failed'::job_state end
    where id = p_job_id returning * into v_job;
  return v_job;
end;
$$;

create or replace function cancel_job(p_job_id uuid, p_reason text)
returns jobs
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_job jobs;
begin
  select * into v_job from jobs where id = p_job_id for update;
  if v_job.state in ('confirmed','crew_assigned','in_progress') then
    perform release_slot(v_job.tenant_id, v_job.scheduled_date);
  end if;
  update jobs set state = 'cancelled', cancel_reason = p_reason
    where id = p_job_id returning * into v_job;
  return v_job;
end;
$$;

create or replace function override_state(p_job_id uuid, p_new_state job_state, p_reason text)
returns jobs
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_job jobs;
begin
  if length(coalesce(p_reason,'')) < 20 then
    raise exception 'Override reason must be at least 20 characters';
  end if;
  if not has_override_role() then
    raise exception 'Insufficient permission to override';
  end if;
  update jobs set state = p_new_state, override_reason = p_reason
    where id = p_job_id returning * into v_job;
  return v_job;
end;
$$;

------------------------------------------------------------
-- 10. Slot capacity helpers
------------------------------------------------------------
create or replace function ensure_slot(p_tenant_id uuid, p_date date, p_capacity int)
returns slots
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_slot slots;
begin
  insert into slots (tenant_id, date, capacity)
  values (p_tenant_id, p_date, p_capacity)
  on conflict (tenant_id, date)
    do update set capacity = excluded.capacity
  returning * into v_slot;
  return v_slot;
end;
$$;
