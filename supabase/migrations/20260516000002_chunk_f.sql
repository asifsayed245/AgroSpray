-- Chunk F: windowed bookings, availability checks, supplier-confirmed inquiries.
-- ('inquiry' enum value was added in 20260516000001_chunk_f_enum.sql.)

------------------------------------------------------------
-- jobs: optional date_end + start/end times
------------------------------------------------------------
alter table jobs
  add column scheduled_date_end date,
  add column scheduled_time_start time,
  add column scheduled_time_end time;

create index idx_jobs_window
  on jobs(tenant_id, scheduled_date, scheduled_time_start)
  where scheduled_time_start is not null;

------------------------------------------------------------
-- tenants: working-hours config (defaults 06:00 - 18:00 IST)
------------------------------------------------------------
alter table tenants
  add column working_hours_start time not null default '06:00',
  add column working_hours_end   time not null default '18:00';

------------------------------------------------------------
-- slot_blocks: admin-defined unavailable windows on a specific date
------------------------------------------------------------
create table slot_blocks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  date date not null,
  time_start time not null,
  time_end time not null,
  reason text,
  drone_id uuid references drones(id) on delete cascade,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  check (time_end > time_start)
);
create index idx_slot_blocks_tenant_date on slot_blocks(tenant_id, date);

alter table slot_blocks enable row level security;
create policy sb_select on slot_blocks
  for select using (tenant_id = current_tenant_id());
create policy sb_admin on slot_blocks
  for all using (tenant_id = current_tenant_id() and has_admin_role())
  with check (tenant_id = current_tenant_id());

------------------------------------------------------------
-- check_window_conflict — single source of truth for "can I book this?"
-- Returns { ok, out_of_hours, working_hours, blocks: [], jobs: [] }
------------------------------------------------------------
create or replace function check_window_conflict(
  p_tenant_id uuid,
  p_date date,
  p_time_start time,
  p_time_end time,
  p_exclude_job_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_t tenants;
  v_blocks jsonb := '[]'::jsonb;
  v_jobs jsonb := '[]'::jsonb;
  v_out_of_hours boolean := false;
  v_ok boolean := true;
begin
  if p_time_start is null or p_time_end is null then
    -- "All day" bookings just consume capacity, no time check; ok unless
    -- a block covers the whole working day, but for V1 treat all-day as ok.
    return jsonb_build_object('ok', true, 'out_of_hours', false, 'blocks', '[]'::jsonb, 'jobs', '[]'::jsonb);
  end if;
  if p_time_end <= p_time_start then
    return jsonb_build_object('ok', false, 'out_of_hours', false, 'blocks', '[]'::jsonb, 'jobs', '[]'::jsonb,
      'reason', 'End time must be after start time.');
  end if;

  select * into v_t from tenants where id = p_tenant_id;
  if p_time_start < v_t.working_hours_start or p_time_end > v_t.working_hours_end then
    v_out_of_hours := true;
    v_ok := false;
  end if;

  -- Overlapping blocks
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', id, 'time_start', time_start, 'time_end', time_end, 'reason', reason
    )
  ), '[]'::jsonb) into v_blocks
  from slot_blocks
  where tenant_id = p_tenant_id
    and date = p_date
    and time_start < p_time_end
    and time_end > p_time_start;

  if jsonb_array_length(v_blocks) > 0 then v_ok := false; end if;

  -- Overlapping windowed jobs (only consider jobs that hold a window).
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'number', number,
      'state', state,
      'time_start', scheduled_time_start,
      'time_end', scheduled_time_end
    )
  ), '[]'::jsonb) into v_jobs
  from jobs
  where tenant_id = p_tenant_id
    and scheduled_date = p_date
    and scheduled_time_start is not null
    and scheduled_time_end   is not null
    and state in ('inquiry','confirmed','crew_assigned','in_progress')
    and scheduled_time_start < p_time_end
    and scheduled_time_end   > p_time_start
    and (p_exclude_job_id is null or id <> p_exclude_job_id);

  if jsonb_array_length(v_jobs) > 0 then v_ok := false; end if;

  return jsonb_build_object(
    'ok', v_ok,
    'out_of_hours', v_out_of_hours,
    'working_hours', jsonb_build_object('start', v_t.working_hours_start, 'end', v_t.working_hours_end),
    'blocks', v_blocks,
    'jobs', v_jobs
  );
end;
$$;

------------------------------------------------------------
-- reserve_date_range — loops day-by-day, rolling back on first failure.
------------------------------------------------------------
create or replace function reserve_date_range(
  p_tenant_id uuid,
  p_date_start date,
  p_date_end date
)
returns boolean language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_d date;
  v_reserved date[] := array[]::date[];
begin
  v_d := p_date_start;
  while v_d <= p_date_end loop
    if not reserve_slot(p_tenant_id, v_d) then
      foreach v_d in array v_reserved loop
        perform release_slot(p_tenant_id, v_d);
      end loop;
      return false;
    end if;
    v_reserved := array_append(v_reserved, v_d);
    v_d := v_d + 1;
  end loop;
  return true;
end;
$$;

------------------------------------------------------------
-- confirm_inquiry — supplier-side commit of a bot-created inquiry.
------------------------------------------------------------
create or replace function confirm_inquiry(
  p_job_id uuid,
  p_time_start time,
  p_time_end time,
  p_date_end date default null
)
returns jobs language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_job jobs;
  v_conflict jsonb;
  v_date_end date;
begin
  select * into v_job from jobs where id = p_job_id for update;
  if v_job.id is null then raise exception 'Job % not found', p_job_id; end if;
  if v_job.state <> 'inquiry' then
    raise exception 'Job is not in inquiry state (current: %)', v_job.state;
  end if;
  v_date_end := coalesce(p_date_end, v_job.scheduled_date);

  v_conflict := check_window_conflict(v_job.tenant_id, v_job.scheduled_date, p_time_start, p_time_end, v_job.id);
  if (v_conflict->>'ok')::boolean is not true then
    raise exception 'Window conflict: %', v_conflict::text;
  end if;

  if not reserve_date_range(v_job.tenant_id, v_job.scheduled_date, v_date_end) then
    raise exception 'No capacity for one or more days in % to %', v_job.scheduled_date, v_date_end;
  end if;

  update jobs set
    scheduled_time_start = p_time_start,
    scheduled_time_end = p_time_end,
    scheduled_date_end = v_date_end,
    state = 'confirmed'
  where id = p_job_id
  returning * into v_job;

  perform write_audit(
    v_job.tenant_id, auth.uid(), 'user', 'manual',
    'job', v_job.id, 'inquiry.confirmed',
    jsonb_build_object(
      'time_start', p_time_start, 'time_end', p_time_end,
      'date_end', v_date_end
    )
  );

  return v_job;
end;
$$;

------------------------------------------------------------
-- reschedule_job — extended signature with optional time window + date range.
-- Keeps old single-date callers working via overload of 3-arg legacy form.
------------------------------------------------------------
create or replace function reschedule_job(
  p_job_id uuid,
  p_new_date date,
  p_new_date_end date,
  p_time_start time,
  p_time_end time,
  p_reason text
)
returns jobs language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_job jobs;
  v_old_start date;
  v_old_end date;
  v_d date;
  v_conflict jsonb;
begin
  select * into v_job from jobs where id = p_job_id for update;
  if v_job.id is null then raise exception 'Job % not found', p_job_id; end if;
  if v_job.state in ('complete','paid','cancelled','failed') then
    raise exception 'Cannot reschedule job in terminal state %', v_job.state;
  end if;

  v_old_start := v_job.scheduled_date;
  v_old_end := coalesce(v_job.scheduled_date_end, v_job.scheduled_date);

  -- Validate the new window first (only if time provided)
  if p_time_start is not null and p_time_end is not null then
    v_conflict := check_window_conflict(v_job.tenant_id, p_new_date, p_time_start, p_time_end, v_job.id);
    if (v_conflict->>'ok')::boolean is not true then
      raise exception 'Window conflict: %', v_conflict::text;
    end if;
  end if;

  -- Release old day-level reservations
  if v_job.state in ('confirmed','crew_assigned') then
    v_d := v_old_start;
    while v_d <= v_old_end loop
      perform release_slot(v_job.tenant_id, v_d);
      v_d := v_d + 1;
    end loop;
  end if;

  -- Reserve new range
  if not reserve_date_range(v_job.tenant_id, p_new_date, coalesce(p_new_date_end, p_new_date)) then
    -- Roll back: re-reserve the old range
    if v_job.state in ('confirmed','crew_assigned') then
      v_d := v_old_start;
      while v_d <= v_old_end loop
        perform reserve_slot(v_job.tenant_id, v_d);
        v_d := v_d + 1;
      end loop;
    end if;
    raise exception 'No capacity on one or more days in % to %', p_new_date, coalesce(p_new_date_end, p_new_date);
  end if;

  update jobs set
    scheduled_date = p_new_date,
    scheduled_date_end = coalesce(p_new_date_end, p_new_date),
    scheduled_time_start = p_time_start,
    scheduled_time_end = p_time_end,
    reschedule_count = reschedule_count + 1,
    override_reason = coalesce(p_reason, override_reason)
  where id = p_job_id returning * into v_job;

  perform write_audit(
    v_job.tenant_id, auth.uid(), 'user', 'manual',
    'job', v_job.id, 'job.rescheduled',
    jsonb_build_object(
      'from_date', v_old_start, 'to_date', p_new_date,
      'from_end', v_old_end, 'to_end', coalesce(p_new_date_end, p_new_date),
      'time_start', p_time_start, 'time_end', p_time_end,
      'reason', p_reason
    )
  );
  return v_job;
end;
$$;

-- Backwards-compatible 3-arg overload (existing JobDetail caller). Drops the
-- legacy implementation and forwards to the new function.
drop function if exists reschedule_job(uuid, date, text);
create or replace function reschedule_job(
  p_job_id uuid,
  p_new_date date,
  p_reason text
)
returns jobs language plpgsql security definer set search_path = public, extensions
as $$
declare v_job jobs;
begin
  select * into v_job from jobs where id = p_job_id;
  return reschedule_job(p_job_id, p_new_date, p_new_date,
                        v_job.scheduled_time_start, v_job.scheduled_time_end, p_reason);
end;
$$;

------------------------------------------------------------
-- tg_finalize_booking — change to land bot bookings in 'inquiry' state.
-- Bot does not reserve a slot at this stage; supplier confirms time and
-- reserves via confirm_inquiry.
------------------------------------------------------------
create or replace function tg_finalize_booking(
  p_tenant_id uuid,
  p_telegram_chat_id text
)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_session farmer_sessions;
  v_farmer farmers;
  v_job jobs;
  v_draft jsonb;
  v_pricing jsonb;
  v_pass boolean;
  v_number text;
  v_draft_name text;
  v_draft_phone text;
begin
  select * into v_session from farmer_sessions
    where tenant_id = p_tenant_id and telegram_chat_id = p_telegram_chat_id
    for update;
  if v_session.id is null then
    return jsonb_build_object('status','error','message','session not found');
  end if;
  v_draft := v_session.draft;
  v_draft_name := nullif(v_draft->>'name', '');
  v_draft_phone := nullif(v_draft->>'phone', '');

  if v_session.farmer_id is not null then
    select * into v_farmer from farmers where id = v_session.farmer_id;
  end if;
  if v_farmer.id is null then
    select * into v_farmer from farmers
      where tenant_id = p_tenant_id and telegram_id = v_session.telegram_user_id
      limit 1;
  end if;
  if v_farmer.id is null then
    insert into farmers (tenant_id, name, phone, telegram_id, village, default_language)
    values (p_tenant_id,
      coalesce(v_draft_name, coalesce(v_session.username, 'Telegram user')),
      v_draft_phone,
      v_session.telegram_user_id,
      v_draft->>'village',
      coalesce(v_session.language, 'en'))
    returning * into v_farmer;
  else
    update farmers set
      name = case
               when v_draft_name is not null then v_draft_name
               when name in ('Telegram user','') or name is null then coalesce(v_session.username, name)
               else name
             end,
      phone = coalesce(v_draft_phone, phone),
      village = coalesce(v_draft->>'village', village)
    where id = v_farmer.id
    returning * into v_farmer;
  end if;
  update farmer_sessions set farmer_id = v_farmer.id where id = v_session.id;

  v_number := generate_job_number(p_tenant_id, coalesce(v_draft->>'crop','XXX'),
                                  (v_draft->>'scheduled_date')::date);

  insert into jobs (
    tenant_id, number, farmer_id, crop, area, area_acres, scheduled_date,
    village, spray_type, pesticide_name, state
  ) values (
    p_tenant_id, v_number, v_farmer.id,
    coalesce(v_draft->>'crop','unknown'),
    coalesce((v_draft->>'area_acres')::numeric, 1),
    coalesce((v_draft->>'area_acres')::numeric, 1),
    (v_draft->>'scheduled_date')::date,
    v_draft->>'village',
    v_draft->>'spray_type',
    v_draft->>'pesticide_name',
    'draft'
  ) returning * into v_job;

  -- Pricing snapshot
  v_pricing := calculate_pricing(v_job.id);
  update jobs set pricing_snapshot = v_pricing, state = 'compliance' where id = v_job.id;

  v_pass := run_compliance_checks(v_job.id);

  if v_pass then
    -- Land in inquiry — supplier will confirm time + reserve slot via confirm_inquiry.
    update jobs set state = 'inquiry' where id = v_job.id;
    update farmer_sessions set state = 'idle', draft = '{}'::jsonb where id = v_session.id;
    return jsonb_build_object(
      'status', 'inquiry',
      'job_id', v_job.id,
      'job_number', v_job.number,
      'total', v_pricing->>'total'
    );
  else
    update jobs set state = 'comp_fail' where id = v_job.id;
    update farmer_sessions set state = 'idle', draft = '{}'::jsonb where id = v_session.id;
    return jsonb_build_object('status','comp_fail','job_id',v_job.id,'job_number',v_job.number);
  end if;
end;
$$;
