-- Chunk F follow-up: per-day time windows.
--
-- Before this migration: each job had a single (scheduled_time_start, scheduled_time_end)
-- applied to every day in the date range. That hides the real-world case where a
-- supplier wants "May 18 morning + May 19 afternoon".
--
-- After this migration: job_windows is the source of truth. One row per day per job,
-- each row carries its own time window. jobs.scheduled_time_start/_end remain as a
-- denormalised "first-day window" for older readers, but new code reads job_windows.

------------------------------------------------------------
-- job_windows table
------------------------------------------------------------
create table if not exists job_windows (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  date date not null,
  time_start time not null,
  time_end time not null,
  created_at timestamptz not null default now(),
  unique (job_id, date),
  check (time_end > time_start)
);
create index if not exists idx_job_windows_job on job_windows(job_id);
create index if not exists idx_job_windows_date on job_windows(date, time_start);

alter table job_windows enable row level security;

drop policy if exists jw_select on job_windows;
create policy jw_select on job_windows for select using (
  exists (select 1 from jobs j where j.id = job_windows.job_id and j.tenant_id = current_tenant_id())
);

drop policy if exists jw_admin on job_windows;
create policy jw_admin on job_windows for all
  using (
    exists (select 1 from jobs j where j.id = job_windows.job_id
                                   and j.tenant_id = current_tenant_id()
                                   and has_admin_role())
  )
  with check (
    exists (select 1 from jobs j where j.id = job_windows.job_id
                                   and j.tenant_id = current_tenant_id())
  );

------------------------------------------------------------
-- Backfill: existing jobs that already have a single time window get
-- expanded into one job_windows row per day in their range.
------------------------------------------------------------
insert into job_windows (job_id, date, time_start, time_end)
select j.id,
       gs::date,
       j.scheduled_time_start,
       j.scheduled_time_end
from jobs j,
     lateral generate_series(j.scheduled_date,
                             coalesce(j.scheduled_date_end, j.scheduled_date),
                             interval '1 day') gs
where j.scheduled_time_start is not null
  and j.scheduled_time_end is not null
on conflict (job_id, date) do nothing;

------------------------------------------------------------
-- check_window_conflict: now reads from job_windows (not jobs.scheduled_time_*).
-- Signature unchanged so existing callers keep working.
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
    return jsonb_build_object('ok', true, 'out_of_hours', false,
                              'blocks', '[]'::jsonb, 'jobs', '[]'::jsonb);
  end if;
  if p_time_end <= p_time_start then
    return jsonb_build_object('ok', false, 'out_of_hours', false,
                              'blocks', '[]'::jsonb, 'jobs', '[]'::jsonb,
                              'reason', 'End time must be after start time.');
  end if;

  select * into v_t from tenants where id = p_tenant_id;
  if p_time_start < v_t.working_hours_start or p_time_end > v_t.working_hours_end then
    v_out_of_hours := true;
    v_ok := false;
  end if;

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

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', j.id,
      'number', j.number,
      'state', j.state,
      'time_start', w.time_start,
      'time_end', w.time_end
    )
  ), '[]'::jsonb) into v_jobs
  from job_windows w
  join jobs j on j.id = w.job_id
  where j.tenant_id = p_tenant_id
    and w.date = p_date
    and j.state in ('inquiry','confirmed','crew_assigned','in_progress')
    and w.time_start < p_time_end
    and w.time_end > p_time_start
    and (p_exclude_job_id is null or j.id <> p_exclude_job_id);
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
-- check_windows_conflict: array-of-windows variant. One call covers a
-- multi-day booking with potentially different times per day.
-- Returns { ok, per_day: [{date, result: <single-day result>}] }.
------------------------------------------------------------
create or replace function check_windows_conflict(
  p_tenant_id uuid,
  p_windows jsonb,
  p_exclude_job_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_w jsonb;
  v_r jsonb;
  v_results jsonb := '[]'::jsonb;
  v_all_ok boolean := true;
begin
  if p_windows is null or jsonb_array_length(p_windows) = 0 then
    return jsonb_build_object('ok', true, 'per_day', '[]'::jsonb);
  end if;
  for v_w in select * from jsonb_array_elements(p_windows) loop
    v_r := check_window_conflict(
      p_tenant_id,
      (v_w->>'date')::date,
      (v_w->>'time_start')::time,
      (v_w->>'time_end')::time,
      p_exclude_job_id
    );
    if (v_r->>'ok')::boolean is not true then
      v_all_ok := false;
    end if;
    v_results := v_results || jsonb_build_array(jsonb_build_object('date', v_w->>'date', 'result', v_r));
  end loop;
  return jsonb_build_object('ok', v_all_ok, 'per_day', v_results);
end;
$$;

------------------------------------------------------------
-- confirm_inquiry: now takes an array of per-day windows.
-- Drops the old (uuid, time, time, date) signature so callers must update.
------------------------------------------------------------
drop function if exists confirm_inquiry(uuid, time, time, date);

create or replace function confirm_inquiry(
  p_job_id uuid,
  p_windows jsonb
)
returns jobs language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_job jobs;
  v_check jsonb;
  v_w jsonb;
  v_min_date date;
  v_max_date date;
  v_first_start time;
  v_first_end time;
begin
  select * into v_job from jobs where id = p_job_id for update;
  if v_job.id is null then raise exception 'Job % not found', p_job_id; end if;
  if v_job.state <> 'inquiry' then
    raise exception 'Job is not in inquiry state (current: %)', v_job.state;
  end if;
  if p_windows is null or jsonb_array_length(p_windows) < 1 then
    raise exception 'At least one window required';
  end if;

  v_check := check_windows_conflict(v_job.tenant_id, p_windows, v_job.id);
  if (v_check->>'ok')::boolean is not true then
    raise exception 'Window conflict: %', v_check::text;
  end if;

  select min((w->>'date')::date), max((w->>'date')::date)
    into v_min_date, v_max_date
  from jsonb_array_elements(p_windows) w;

  if not reserve_date_range(v_job.tenant_id, v_min_date, v_max_date) then
    raise exception 'No capacity for one or more days in % to %', v_min_date, v_max_date;
  end if;

  delete from job_windows where job_id = p_job_id;
  for v_w in select * from jsonb_array_elements(p_windows) order by (value->>'date')::date loop
    insert into job_windows (job_id, date, time_start, time_end) values (
      p_job_id,
      (v_w->>'date')::date,
      (v_w->>'time_start')::time,
      (v_w->>'time_end')::time
    );
  end loop;

  select (time_start), (time_end) into v_first_start, v_first_end
    from job_windows where job_id = p_job_id order by date asc limit 1;

  update jobs set
    scheduled_date = v_min_date,
    scheduled_date_end = case when v_max_date = v_min_date then null else v_max_date end,
    scheduled_time_start = v_first_start,
    scheduled_time_end = v_first_end,
    state = 'confirmed'
  where id = p_job_id
  returning * into v_job;

  perform write_audit(
    v_job.tenant_id, auth.uid(), 'user', 'manual',
    'job', v_job.id, 'inquiry.confirmed',
    jsonb_build_object('windows', p_windows)
  );
  return v_job;
end;
$$;

------------------------------------------------------------
-- reschedule_job (windows array variant). The previously-shipped 6-arg
-- and 3-arg overloads forward into this so both old callers keep working.
------------------------------------------------------------
create or replace function reschedule_job_windows(
  p_job_id uuid,
  p_new_date date,
  p_new_date_end date,
  p_windows jsonb,
  p_reason text
)
returns jobs language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_job jobs;
  v_old_start date;
  v_old_end date;
  v_d date;
  v_check jsonb;
  v_w jsonb;
  v_first_start time;
  v_first_end time;
begin
  select * into v_job from jobs where id = p_job_id for update;
  if v_job.id is null then raise exception 'Job % not found', p_job_id; end if;
  if v_job.state in ('complete','paid','cancelled','failed') then
    raise exception 'Cannot reschedule job in terminal state %', v_job.state;
  end if;

  v_old_start := v_job.scheduled_date;
  v_old_end := coalesce(v_job.scheduled_date_end, v_job.scheduled_date);

  if p_windows is not null and jsonb_array_length(p_windows) > 0 then
    v_check := check_windows_conflict(v_job.tenant_id, p_windows, v_job.id);
    if (v_check->>'ok')::boolean is not true then
      raise exception 'Window conflict: %', v_check::text;
    end if;
  end if;

  if v_job.state in ('confirmed','crew_assigned') then
    v_d := v_old_start;
    while v_d <= v_old_end loop
      perform release_slot(v_job.tenant_id, v_d);
      v_d := v_d + 1;
    end loop;
  end if;

  if not reserve_date_range(v_job.tenant_id, p_new_date, coalesce(p_new_date_end, p_new_date)) then
    if v_job.state in ('confirmed','crew_assigned') then
      v_d := v_old_start;
      while v_d <= v_old_end loop
        perform reserve_slot(v_job.tenant_id, v_d);
        v_d := v_d + 1;
      end loop;
    end if;
    raise exception 'No capacity on one or more days in % to %', p_new_date, coalesce(p_new_date_end, p_new_date);
  end if;

  delete from job_windows where job_id = p_job_id;
  if p_windows is not null and jsonb_array_length(p_windows) > 0 then
    for v_w in select * from jsonb_array_elements(p_windows) order by (value->>'date')::date loop
      insert into job_windows (job_id, date, time_start, time_end) values (
        p_job_id,
        (v_w->>'date')::date,
        (v_w->>'time_start')::time,
        (v_w->>'time_end')::time
      );
    end loop;
    select time_start, time_end into v_first_start, v_first_end
      from job_windows where job_id = p_job_id order by date asc limit 1;
  else
    v_first_start := null;
    v_first_end := null;
  end if;

  update jobs set
    scheduled_date = p_new_date,
    scheduled_date_end = case when coalesce(p_new_date_end, p_new_date) = p_new_date
                              then null
                              else coalesce(p_new_date_end, p_new_date) end,
    scheduled_time_start = v_first_start,
    scheduled_time_end = v_first_end,
    reschedule_count = reschedule_count + 1,
    override_reason = coalesce(p_reason, override_reason)
  where id = p_job_id returning * into v_job;

  perform write_audit(
    v_job.tenant_id, auth.uid(), 'user', 'manual',
    'job', v_job.id, 'job.rescheduled',
    jsonb_build_object(
      'from_date', v_old_start, 'to_date', p_new_date,
      'from_end', v_old_end, 'to_end', coalesce(p_new_date_end, p_new_date),
      'windows', p_windows, 'reason', p_reason
    )
  );
  return v_job;
end;
$$;

-- 6-arg legacy form (single time window applied uniformly across the range)
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
  v_end date := coalesce(p_new_date_end, p_new_date);
  v_d date;
  v_windows jsonb := '[]'::jsonb;
begin
  if p_time_start is not null and p_time_end is not null then
    v_d := p_new_date;
    while v_d <= v_end loop
      v_windows := v_windows || jsonb_build_array(jsonb_build_object(
        'date', v_d, 'time_start', p_time_start, 'time_end', p_time_end
      ));
      v_d := v_d + 1;
    end loop;
  end if;
  return reschedule_job_windows(p_job_id, p_new_date, v_end, v_windows, p_reason);
end;
$$;

-- 3-arg legacy form (date only). Re-uses existing job times.
create or replace function reschedule_job(
  p_job_id uuid,
  p_new_date date,
  p_reason text
)
returns jobs language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_job jobs;
begin
  select * into v_job from jobs where id = p_job_id;
  return reschedule_job(p_job_id, p_new_date, p_new_date,
                        v_job.scheduled_time_start, v_job.scheduled_time_end, p_reason);
end;
$$;

-- confirm_inquiry legacy (uuid, time, time, date) wrapper — keeps the prior
-- deployed PWA build working until the new windowed-form build is live.
-- Forwards into the new (uuid, jsonb) array form by expanding the supplied
-- uniform window across every day in the job's range.
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
  v_d date;
  v_end date;
  v_windows jsonb := '[]'::jsonb;
begin
  select * into v_job from jobs where id = p_job_id;
  if v_job.id is null then raise exception 'Job % not found', p_job_id; end if;
  v_end := coalesce(p_date_end, v_job.scheduled_date);
  v_d := v_job.scheduled_date;
  while v_d <= v_end loop
    v_windows := v_windows || jsonb_build_array(jsonb_build_object(
      'date', v_d, 'time_start', p_time_start, 'time_end', p_time_end
    ));
    v_d := v_d + 1;
  end loop;
  return confirm_inquiry(p_job_id, v_windows);
end;
$$;
