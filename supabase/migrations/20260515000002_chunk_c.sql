-- Chunk C: Farmer Telegram bot — conversation state + message log

create table farmer_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  telegram_chat_id text not null,
  telegram_user_id text,
  username text,
  state text not null default 'idle',
  draft jsonb not null default '{}'::jsonb,
  farmer_id uuid references farmers(id) on delete set null,
  language text not null default 'en',
  consent_at timestamptz,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(tenant_id, telegram_chat_id)
);
create index idx_farmer_sessions_tenant_chat on farmer_sessions(tenant_id, telegram_chat_id);

create table telegram_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  chat_id text not null,
  user_id text,
  username text,
  message_id text,
  body text,
  payload jsonb not null default '{}'::jsonb,
  state text,
  error text,
  created_at timestamptz not null default now()
);
create index idx_telegram_messages_tenant_time on telegram_messages(tenant_id, created_at desc);
create index idx_telegram_messages_chat on telegram_messages(chat_id, created_at desc);

alter table farmer_sessions enable row level security;
alter table telegram_messages enable row level security;

create policy farmer_sessions_select on farmer_sessions
  for select using (tenant_id = current_tenant_id());
create policy farmer_sessions_admin on farmer_sessions
  for all using (tenant_id = current_tenant_id() and has_admin_role())
  with check (tenant_id = current_tenant_id());

create policy telegram_messages_select on telegram_messages
  for select using (tenant_id = current_tenant_id());

-- Edge function uses service role and bypasses RLS — no insert policies needed here.

------------------------------------------------------------
-- Helper: create job from a farmer_sessions draft and submit compliance.
-- Returns the resulting jobs row (or null) plus a status hint.
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
  v_wish wishlist_entries;
  v_pricing jsonb;
  v_pass boolean;
  v_number text;
begin
  select * into v_session from farmer_sessions
    where tenant_id = p_tenant_id and telegram_chat_id = p_telegram_chat_id
    for update;
  if v_session.id is null then
    return jsonb_build_object('status','error','message','session not found');
  end if;

  v_draft := v_session.draft;

  -- find or create farmer
  if v_session.farmer_id is not null then
    select * into v_farmer from farmers where id = v_session.farmer_id;
  end if;
  if v_farmer.id is null then
    select * into v_farmer
      from farmers
      where tenant_id = p_tenant_id and telegram_id = v_session.telegram_user_id
      limit 1;
  end if;
  if v_farmer.id is null then
    insert into farmers (tenant_id, name, phone, telegram_id, village, default_language)
    values (
      p_tenant_id,
      coalesce(v_draft->>'name', coalesce(v_session.username, 'Telegram user')),
      v_draft->>'phone',
      v_session.telegram_user_id,
      v_draft->>'village',
      coalesce(v_session.language, 'en')
    )
    returning * into v_farmer;
  end if;

  update farmer_sessions set farmer_id = v_farmer.id where id = v_session.id;

  -- generate job number
  v_number := generate_job_number(p_tenant_id, coalesce(v_draft->>'crop','XXX'), (v_draft->>'scheduled_date')::date);

  insert into jobs (
    tenant_id, number, farmer_id, crop, area, area_acres, scheduled_date,
    village, spray_type, pesticide_name, state
  ) values (
    p_tenant_id, v_number, v_farmer.id,
    coalesce(v_draft->>'crop', 'unknown'),
    coalesce((v_draft->>'area_acres')::numeric, 1),
    coalesce((v_draft->>'area_acres')::numeric, 1),
    (v_draft->>'scheduled_date')::date,
    v_draft->>'village',
    v_draft->>'spray_type',
    v_draft->>'pesticide_name',
    'draft'
  ) returning * into v_job;

  -- Lock pricing
  v_pricing := calculate_pricing(v_job.id);
  update jobs set pricing_snapshot = v_pricing, state = 'compliance' where id = v_job.id;

  -- Run compliance
  v_pass := run_compliance_checks(v_job.id);

  if v_pass and reserve_slot(p_tenant_id, v_job.scheduled_date) then
    update jobs set state = 'confirmed' where id = v_job.id;
    update farmer_sessions set state = 'idle', draft = '{}'::jsonb where id = v_session.id;
    return jsonb_build_object(
      'status', 'confirmed',
      'job_id', v_job.id,
      'job_number', v_job.number,
      'total', v_pricing->>'total'
    );
  elsif v_pass then
    -- slot full → wishlist
    insert into wishlist_entries (tenant_id, farmer_id, preferred_date, crop, area_acres, status)
    values (p_tenant_id, v_farmer.id, v_job.scheduled_date,
            v_draft->>'crop', coalesce((v_draft->>'area_acres')::numeric, 1),
            'waiting')
    returning * into v_wish;
    update jobs set state = 'wishlist' where id = v_job.id;
    update farmer_sessions set state = 'idle', draft = '{}'::jsonb where id = v_session.id;
    return jsonb_build_object(
      'status', 'wishlisted',
      'job_id', v_job.id,
      'job_number', v_job.number,
      'wishlist_id', v_wish.id
    );
  else
    update jobs set state = 'comp_fail' where id = v_job.id;
    update farmer_sessions set state = 'idle', draft = '{}'::jsonb where id = v_session.id;
    return jsonb_build_object(
      'status', 'comp_fail',
      'job_id', v_job.id,
      'job_number', v_job.number
    );
  end if;
end;
$$;
