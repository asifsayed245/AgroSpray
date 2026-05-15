-- Chunk D: Farmer queries inbox — bridge between Telegram free-form text and ops.

create table farmer_queries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  farmer_id uuid references farmers(id) on delete set null,
  telegram_chat_id text not null,
  telegram_user_id text,
  username text,
  language text not null default 'en',
  inbound_text text not null,
  context_state text,
  status text not null default 'open',
  reply_text text,
  replied_by uuid references profiles(id) on delete set null,
  replied_at timestamptz,
  closed_by uuid references profiles(id) on delete set null,
  closed_at timestamptz,
  opened_at timestamptz not null default now(),
  sla_due_at timestamptz not null default now() + interval '60 minutes',
  related_job_id uuid references jobs(id) on delete set null,
  source text not null default 'telegram',
  check (status in ('open','replying','replied','closed'))
);
create index idx_farmer_queries_open on farmer_queries(tenant_id, status) where status in ('open','replying');
create index idx_farmer_queries_chat on farmer_queries(tenant_id, telegram_chat_id, opened_at desc);
create index idx_farmer_queries_tenant_time on farmer_queries(tenant_id, opened_at desc);

alter table farmer_queries enable row level security;

create policy fq_select on farmer_queries for select
  using (tenant_id = current_tenant_id());
create policy fq_admin on farmer_queries for all
  using (tenant_id = current_tenant_id() and has_admin_role())
  with check (tenant_id = current_tenant_id());

------------------------------------------------------------
-- RPC: tg_capture_query — called by the telegram-webhook edge function
-- (service role). Atomically creates a query row + audit + returns
-- the row plus tenant.telegram_ops_chat_id for ops notification.
------------------------------------------------------------
create or replace function tg_capture_query(
  p_tenant_id uuid,
  p_telegram_chat_id text,
  p_telegram_user_id text,
  p_username text,
  p_language text,
  p_text text,
  p_state text
)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_farmer farmers;
  v_query farmer_queries;
  v_ops_chat text;
begin
  if coalesce(p_text, '') = '' then
    return jsonb_build_object('status','error','message','empty text');
  end if;

  -- Find farmer if one exists for this telegram user
  select * into v_farmer from farmers
    where tenant_id = p_tenant_id and telegram_id = p_telegram_user_id
    limit 1;

  insert into farmer_queries (
    tenant_id, farmer_id, telegram_chat_id, telegram_user_id, username,
    language, inbound_text, context_state
  ) values (
    p_tenant_id, v_farmer.id, p_telegram_chat_id, p_telegram_user_id, p_username,
    coalesce(p_language, 'en'), p_text, p_state
  ) returning * into v_query;

  perform write_audit(
    p_tenant_id, null, 'farmer', 'auto',
    'query', v_query.id, 'query.opened',
    jsonb_build_object(
      'farmer_name', coalesce(v_farmer.name, p_username, 'Telegram user'),
      'phone', v_farmer.phone,
      'language', v_query.language,
      'state', p_state,
      'preview', left(p_text, 200)
    )
  );

  select telegram_ops_chat_id into v_ops_chat from tenants where id = p_tenant_id;

  return jsonb_build_object(
    'id', v_query.id,
    'status', 'open',
    'farmer_name', coalesce(v_farmer.name, p_username, 'Telegram user'),
    'phone', v_farmer.phone,
    'ops_chat_id', nullif(v_ops_chat, '')
  );
end;
$$;

------------------------------------------------------------
-- RPC: reply_to_farmer_query — called by the admin PWA.
-- Stores the reply, advances status to 'replying', writes audit.
-- The PWA then invokes the telegram-send-reply edge function which
-- delivers the message and flips the status to 'replied'.
------------------------------------------------------------
create or replace function reply_to_farmer_query(
  p_query_id uuid,
  p_reply text
)
returns farmer_queries language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_q farmer_queries;
begin
  if coalesce(trim(p_reply), '') = '' then
    raise exception 'Reply text is empty';
  end if;

  select * into v_q from farmer_queries where id = p_query_id for update;
  if v_q.id is null then
    raise exception 'Query % not found', p_query_id;
  end if;
  if v_q.status = 'closed' then
    raise exception 'Query is already closed';
  end if;

  update farmer_queries
    set reply_text = p_reply,
        replied_by = auth.uid(),
        replied_at = now(),
        status = 'replying'
    where id = p_query_id
    returning * into v_q;

  perform write_audit(
    v_q.tenant_id, auth.uid(), 'user', 'manual',
    'query', v_q.id, 'query.replied',
    jsonb_build_object('preview', left(p_reply, 200))
  );

  return v_q;
end;
$$;

------------------------------------------------------------
-- RPC: close_farmer_query — manual mark-as-resolved by ops.
------------------------------------------------------------
create or replace function close_farmer_query(p_query_id uuid)
returns farmer_queries language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_q farmer_queries;
begin
  update farmer_queries
    set status = 'closed',
        closed_by = auth.uid(),
        closed_at = now()
    where id = p_query_id
    returning * into v_q;
  if v_q.id is null then
    raise exception 'Query % not found', p_query_id;
  end if;
  perform write_audit(
    v_q.tenant_id, auth.uid(), 'user', 'manual',
    'query', v_q.id, 'query.closed', '{}'::jsonb
  );
  return v_q;
end;
$$;

------------------------------------------------------------
-- RPC: mark_farmer_query_delivered — called by telegram-send-reply
-- after a successful Telegram send. Service role.
------------------------------------------------------------
create or replace function mark_farmer_query_delivered(p_query_id uuid)
returns farmer_queries language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_q farmer_queries;
begin
  update farmer_queries
    set status = 'replied'
    where id = p_query_id and status = 'replying'
    returning * into v_q;
  return v_q;
end;
$$;
