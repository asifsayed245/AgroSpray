-- Row-Level Security: tenant isolation as defense-in-depth (PRD §9.5).
-- All policies use current_tenant_id() / current_user_role() helpers.
-- Service role key bypasses RLS (used by edge functions for admin ops).

------------------------------------------------------------
-- Helpers
------------------------------------------------------------
create or replace function current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

create or replace function current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function has_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_user_role() in ('owner','admin','operations'), false)
$$;

create or replace function has_override_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_user_role() in ('owner','admin'), false)
$$;

------------------------------------------------------------
-- Enable RLS on every table
------------------------------------------------------------
alter table tenants            enable row level security;
alter table profiles           enable row level security;
alter table farmers            enable row level security;
alter table pilots             enable row level security;
alter table drones             enable row level security;
alter table slots              enable row level security;
alter table wishlist_entries   enable row level security;
alter table jobs               enable row level security;
alter table sorties            enable row level security;
alter table compliance_checks  enable row level security;
alter table incidents          enable row level security;
alter table audit_events       enable row level security;
alter table consent_records    enable row level security;
alter table notifications      enable row level security;
alter table push_subscriptions enable row level security;
alter table invoices           enable row level security;
alter table crops              enable row level security;
alter table pesticides_cib     enable row level security;

------------------------------------------------------------
-- Tenants — users only see their own tenant; only owner can edit
------------------------------------------------------------
create policy tenants_select_own on tenants
  for select using (id = current_tenant_id());

create policy tenants_update_owner on tenants
  for update using (id = current_tenant_id() and current_user_role() = 'owner')
  with check (id = current_tenant_id());

------------------------------------------------------------
-- Profiles — read same tenant; update self or admin
------------------------------------------------------------
create policy profiles_select_tenant on profiles
  for select using (tenant_id = current_tenant_id() or id = auth.uid());

create policy profiles_update_self on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_update_admin on profiles
  for update using (tenant_id = current_tenant_id() and has_admin_role())
  with check (tenant_id = current_tenant_id());

create policy profiles_insert_self on profiles
  for insert with check (id = auth.uid());

------------------------------------------------------------
-- Domain tables — standard tenant-isolation pattern
------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'farmers','pilots','drones','slots','wishlist_entries',
      'jobs','sorties','compliance_checks','incidents',
      'consent_records','notifications','push_subscriptions','invoices'
    ])
  loop
    execute format($f$create policy %I_select on %I
        for select using (tenant_id = current_tenant_id())$f$, t, t);
    execute format($f$create policy %I_insert on %I
        for insert with check (tenant_id = current_tenant_id())$f$, t, t);
    execute format($f$create policy %I_update on %I
        for update using (tenant_id = current_tenant_id())
        with check (tenant_id = current_tenant_id())$f$, t, t);
    execute format($f$create policy %I_delete on %I
        for delete using (tenant_id = current_tenant_id() and has_admin_role())$f$, t, t);
  end loop;
end$$;

------------------------------------------------------------
-- Audit events — append-only. No update, no delete, ever.
-- Inserts pass through triggers using the table's tenant_id.
------------------------------------------------------------
create policy audit_select_tenant on audit_events
  for select using (tenant_id = current_tenant_id());

create policy audit_insert_tenant on audit_events
  for insert with check (tenant_id = current_tenant_id());

-- Hard-revoke update/delete from all client roles
revoke update, delete on audit_events from authenticated, anon;

------------------------------------------------------------
-- Reference data — readable to any authenticated user
------------------------------------------------------------
create policy crops_public_select on crops
  for select using (auth.role() = 'authenticated');

create policy pesticides_public_select on pesticides_cib
  for select using (auth.role() = 'authenticated');
