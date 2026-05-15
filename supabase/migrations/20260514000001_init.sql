-- AgroSpray V1 initial schema (PRD §11)
-- Multi-tenant from day one. Every domain row carries tenant_id.

------------------------------------------------------------
-- Extensions
------------------------------------------------------------
create extension if not exists "pgcrypto";

------------------------------------------------------------
-- Enums
------------------------------------------------------------
create type user_role as enum (
  'owner', 'admin', 'operations', 'accountant', 'support', 'viewer', 'pilot', 'farmer'
);

create type job_state as enum (
  'draft', 'compliance', 'confirmed', 'crew_assigned', 'in_progress',
  'complete', 'invoiced', 'paid',
  'wishlist', 'comp_fail', 'cancelled', 'failed', 'disputed'
);

create type sortie_state as enum (
  'pending', 'pre_flight', 'active', 'closed', 'aborted'
);

create type drone_status as enum (
  'ready', 'in_flight', 'maintenance', 'out_of_service'
);

create type compliance_check_type as enum (
  'dgca_uin', 'dgca_rpc', 'cib_pesticide', 'npnt', 'pricing'
);

create type compliance_status as enum ('pass', 'fail', 'overridden');

create type audit_source as enum ('auto', 'manual', 'override');

create type incident_type as enum (
  'crash', 'drift', 'injury', 'equipment_failure', 'near_miss'
);

create type incident_severity as enum ('low', 'medium', 'high', 'critical');

create type area_unit as enum ('acre', 'hectare', 'bigha', 'guntha', 'kanal', 'ghumao');

create type wishlist_status as enum (
  'waiting', 'notified', 'confirmed', 'expired', 'cancelled'
);

------------------------------------------------------------
-- Tenants (PRD §11.1)
------------------------------------------------------------
create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  gstin text,
  pan text,
  dgca_operator_uin text,
  registered_address text,
  state text,
  default_language text not null default 'en',
  timezone text not null default 'Asia/Kolkata',
  upi_vpa text,
  bank_account text,
  telegram_bot_token text,
  telegram_ops_chat_id text,
  pricing_defaults jsonb not null default jsonb_build_object(
    'baseRatePerAcre', 600,
    'travelFreeKm', 25,
    'travelPerKm', 15,
    'chemicalIncludedSurchargePerAcre', 250,
    'cropMultipliers', jsonb_build_object()
  ),
  cancellation_policy jsonb not null default jsonb_build_object(
    'freeBeforeHours', 24,
    'halfBeforeHours', 4,
    'fullWithinHours', 4
  ),
  weather_policy jsonb not null default jsonb_build_object('supplierCancelRefundPct', 100),
  notification_prefs jsonb not null default jsonb_build_object(
    'compliance_block', true, 'sla_breach', true, 'dispute_opened', true,
    'new_enquiry', false, 'incident_reported', true
  ),
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1
);

------------------------------------------------------------
-- Profiles (extends auth.users) (PRD §11.2)
------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete set null,
  role user_role not null default 'viewer',
  full_name text,
  phone text,
  email text,
  telegram_id text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_tenant on profiles(tenant_id);
create index idx_profiles_telegram on profiles(telegram_id) where telegram_id is not null;

------------------------------------------------------------
-- Farmers (PRD §11.3) — distinct from User; many farmers have no auth account
------------------------------------------------------------
create table farmers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  name text not null,
  phone text,
  telegram_id text,
  default_language text not null default 'hi',
  village text,
  district text,
  state text,
  known_locations jsonb not null default '[]'::jsonb,
  consent_id uuid,
  booking_count int not null default 0,
  last_booking_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1
);
create index idx_farmers_tenant on farmers(tenant_id);
create index idx_farmers_telegram on farmers(tenant_id, telegram_id) where telegram_id is not null;
create index idx_farmers_phone on farmers(tenant_id, phone) where phone is not null;

------------------------------------------------------------
-- Pilots (PRD §11.4)
------------------------------------------------------------
create table pilots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  name text not null,
  phone text,
  alt_phone text,
  telegram_id text,
  rpc_number text not null,
  rpc_expiry date,
  certified_drone_classes text[] not null default '{}',
  employment_status text not null default 'active',
  joined_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1
);
create index idx_pilots_tenant on pilots(tenant_id);
create index idx_pilots_telegram on pilots(tenant_id, telegram_id) where telegram_id is not null;

------------------------------------------------------------
-- Drones (PRD §11.5)
------------------------------------------------------------
create table drones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  display_id text not null,
  uin text not null,
  manufacturer text,
  model text,
  year int,
  payload_l numeric(6,2),
  pesticide_compat text[] not null default '{}',
  hours_flown numeric(8,2) not null default 0,
  hours_since_service numeric(8,2) not null default 0,
  service_threshold_hours numeric(8,2) not null default 50,
  battery_cycles int not null default 0,
  battery_health text,
  last_calibration_at date,
  insurance_ref text,
  insurance_expiry date,
  status drone_status not null default 'ready',
  current_job_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique(tenant_id, display_id),
  unique(tenant_id, uin)
);
create index idx_drones_tenant on drones(tenant_id);

------------------------------------------------------------
-- Slots (PRD §11.8) — daily capacity per tenant
------------------------------------------------------------
create table slots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  date date not null,
  capacity int not null,
  booked int not null default 0,
  locked int not null default 0,
  notes text,
  unavailable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique(tenant_id, date),
  check (booked >= 0 and locked >= 0 and capacity >= 0)
);

------------------------------------------------------------
-- Wishlist entries (PRD §11.9)
------------------------------------------------------------
create table wishlist_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  farmer_id uuid not null references farmers(id) on delete cascade,
  preferred_date date not null,
  crop text,
  area_acres numeric(8,2),
  status wishlist_status not null default 'waiting',
  notified_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_wishlist_tenant_date on wishlist_entries(tenant_id, preferred_date, status);

------------------------------------------------------------
-- Jobs (PRD §11.6)
------------------------------------------------------------
create table jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  number text not null,
  farmer_id uuid not null references farmers(id) on delete restrict,
  crop text not null,
  area numeric(8,2) not null,
  area_unit area_unit not null default 'acre',
  area_acres numeric(8,2) not null,
  scheduled_date date not null,
  location_lat numeric(9,6),
  location_lng numeric(9,6),
  location_polygon jsonb,
  village text,
  spray_type text,
  pesticide_name text,
  pesticide_brand text,
  state job_state not null default 'draft',
  state_history jsonb not null default '[]'::jsonb,
  assigned_pilot_id uuid references pilots(id) on delete set null,
  assigned_drone_id uuid references drones(id) on delete set null,
  pricing_snapshot jsonb,
  reschedule_count int not null default 0,
  cancel_reason text,
  override_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique(tenant_id, number)
);
create index idx_jobs_tenant_state on jobs(tenant_id, state);
create index idx_jobs_tenant_date on jobs(tenant_id, scheduled_date);
create index idx_jobs_farmer on jobs(farmer_id);

-- Now that jobs exists, add the drones.current_job_id FK
alter table drones
  add constraint drones_current_job_fk
  foreign key (current_job_id) references jobs(id) on delete set null;

------------------------------------------------------------
-- Sorties (PRD §11.7)
------------------------------------------------------------
create table sorties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  sortie_number int not null,
  pilot_id uuid references pilots(id),
  drone_id uuid references drones(id),
  npnt_permission_ref text,
  takeoff_at timestamptz,
  landing_at timestamptz,
  telemetry_blob_url text,
  area_covered_acres numeric(8,2),
  volume_sprayed_l numeric(8,2),
  gps_centroid_lat numeric(9,6),
  gps_centroid_lng numeric(9,6),
  gps_track jsonb,
  state sortie_state not null default 'pending',
  aborted_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, sortie_number)
);
create index idx_sorties_tenant on sorties(tenant_id);
create index idx_sorties_job on sorties(job_id);

------------------------------------------------------------
-- Compliance checks (PRD §11.12)
------------------------------------------------------------
create table compliance_checks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  check_type compliance_check_type not null,
  status compliance_status not null,
  reference_data jsonb,
  reason text,
  override_reason text,
  overridden_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_compliance_tenant_job on compliance_checks(tenant_id, job_id);
create index idx_compliance_open on compliance_checks(tenant_id, status) where status = 'fail';

------------------------------------------------------------
-- Incidents (PRD §11.11)
------------------------------------------------------------
create table incidents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  type incident_type not null,
  severity incident_severity not null,
  location_lat numeric(9,6),
  location_lng numeric(9,6),
  description text,
  parties_involved text[] not null default '{}',
  third_party_affected text,
  photos jsonb not null default '[]'::jsonb,
  linked_job_id uuid references jobs(id) on delete set null,
  linked_pilot_id uuid references pilots(id) on delete set null,
  linked_drone_id uuid references drones(id) on delete set null,
  dgca_reportable boolean not null default false,
  dgca_notification_ref text,
  dgca_notified_at timestamptz,
  resolution_notes text,
  reported_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_incidents_tenant on incidents(tenant_id);

------------------------------------------------------------
-- Audit events (PRD §11.10) — append-only with hash chain
------------------------------------------------------------
create table audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  actor_id uuid,
  actor_type text not null default 'system',
  source audit_source not null,
  entity_type text not null,
  entity_id uuid,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  prev_hash text,
  hash text not null,
  created_at timestamptz not null default now()
);
create index idx_audit_tenant_time on audit_events(tenant_id, created_at desc);
create index idx_audit_entity on audit_events(entity_type, entity_id);
create index idx_audit_source on audit_events(tenant_id, source);

------------------------------------------------------------
-- Consent records (DPDP §6.5.4)
------------------------------------------------------------
create table consent_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  farmer_id uuid references farmers(id) on delete set null,
  profile_id uuid references profiles(id) on delete set null,
  notice_version text not null,
  consent_text text not null,
  granted boolean not null default true,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  delete_requested_at timestamptz,
  delete_fulfilled_at timestamptz,
  export_requested_at timestamptz,
  export_fulfilled_at timestamptz
);
create index idx_consent_tenant on consent_records(tenant_id);

------------------------------------------------------------
-- Notifications (Telegram + Web Push)
------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  recipient_user_id uuid references profiles(id) on delete cascade,
  recipient_farmer_id uuid references farmers(id) on delete cascade,
  recipient_telegram_id text,
  category text not null,
  title text,
  body text,
  delivery_channel text not null default 'telegram',
  delivery_status text not null default 'queued',
  retries int not null default 0,
  scheduled_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  error text,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index idx_notifications_tenant on notifications(tenant_id, created_at desc);
create index idx_notifications_status on notifications(delivery_status) where delivery_status in ('queued','sending','failed');

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null,
  keys_p256dh text not null,
  keys_auth text not null,
  categories text[] not null default '{compliance_block,sla_breach,dispute_opened,incident_reported}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

------------------------------------------------------------
-- Reference: crops + CIB pesticide registry (mock data for V1)
------------------------------------------------------------
create table crops (
  id text primary key,
  name_en text not null,
  name_hi text,
  name_mr text,
  default_volume_per_acre_l numeric(6,2) not null default 10,
  aliases text[] not null default '{}'
);

create table pesticides_cib (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  active_ingredient text,
  approved_crops text[] not null default '{}',
  drone_approved boolean not null default false,
  phi_days_by_crop jsonb not null default '{}'::jsonb,
  notes text,
  unique(name, brand)
);
create index idx_pesticides_drone_approved on pesticides_cib(drone_approved);

------------------------------------------------------------
-- Invoices (for completed jobs)
------------------------------------------------------------
create table invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete restrict,
  number text not null,
  line_items jsonb not null,
  subtotal numeric(10,2) not null,
  tax_total numeric(10,2) not null,
  total numeric(10,2) not null,
  upi_qr_payload text,
  paid_at timestamptz,
  paid_by_method text,
  paid_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, number)
);
create index idx_invoices_tenant on invoices(tenant_id);

------------------------------------------------------------
-- updated_at trigger function (reusable)
------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'tenants','profiles','farmers','pilots','drones','slots','jobs',
      'sorties','wishlist_entries','incidents','notifications','push_subscriptions',
      'invoices'
    ])
  loop
    execute format('drop trigger if exists trg_%I_updated_at on %I', t, t);
    execute format('create trigger trg_%I_updated_at before update on %I
                    for each row execute function set_updated_at()', t, t);
  end loop;
end$$;
