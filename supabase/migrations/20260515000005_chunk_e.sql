-- Chunk E: weather forecast + supplier safety notifications

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table weather_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  source text not null default 'open-meteo',
  daily jsonb not null,
  hourly jsonb,
  booking_date_safety text not null check (booking_date_safety in ('good','marginal','unsafe')),
  fetched_at timestamptz not null default now()
);
create index idx_weather_job_time on weather_snapshots(job_id, fetched_at desc);
create index idx_weather_unsafe on weather_snapshots(tenant_id, booking_date_safety)
  where booking_date_safety in ('marginal','unsafe');

alter table weather_snapshots enable row level security;
create policy ws_select on weather_snapshots
  for select using (tenant_id = current_tenant_id());

alter table jobs
  add column weather_safety text check (weather_safety in ('good','marginal','unsafe')),
  add column weather_evaluated_at timestamptz,
  add column weather_last_notified_safety text;

------------------------------------------------------------
-- Helper: lazily backfill a job's coordinates after geocoding
------------------------------------------------------------
create or replace function tg_set_job_location(
  p_job_id uuid,
  p_lat numeric,
  p_lng numeric
)
returns void language plpgsql security definer set search_path = public, extensions
as $$
begin
  update jobs
    set location_lat = p_lat,
        location_lng = p_lng
  where id = p_job_id
    and (location_lat is null or location_lng is null);
end;
$$;

------------------------------------------------------------
-- Helper: apply a freshly computed safety value to a job and
-- report whether the value changed since we last notified.
-- The edge function uses { changed } to decide whether to fan
-- out an in-app + Telegram alert.
------------------------------------------------------------
create or replace function tg_apply_weather_snapshot(
  p_job_id uuid,
  p_safety text
)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_prev text;
  v_changed boolean;
begin
  if p_safety not in ('good','marginal','unsafe') then
    raise exception 'invalid safety %', p_safety;
  end if;
  select weather_last_notified_safety into v_prev from jobs where id = p_job_id;
  v_changed := v_prev is distinct from p_safety;

  update jobs set
    weather_safety = p_safety,
    weather_evaluated_at = now()
  where id = p_job_id;

  return jsonb_build_object('changed', v_changed, 'prev', v_prev);
end;
$$;

------------------------------------------------------------
-- Helper: called after a notification is actually delivered, so we
-- only update the dedup marker if the user really got pinged.
------------------------------------------------------------
create or replace function tg_mark_weather_notified(
  p_job_id uuid,
  p_safety text
)
returns void language plpgsql security definer set search_path = public, extensions
as $$
begin
  update jobs set weather_last_notified_safety = p_safety where id = p_job_id;
end;
$$;
