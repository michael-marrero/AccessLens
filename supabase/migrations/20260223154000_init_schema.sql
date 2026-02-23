create extension if not exists pgcrypto;

create type profile_role as enum ('admin', 'analyst');
create type identity_type as enum ('human', 'service');
create type finding_severity as enum ('low', 'medium', 'high', 'critical');
create type finding_status as enum ('open', 'reviewed', 'resolved');
create type review_action_type as enum ('approve', 'revoke', 'investigate');

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null references tenants (id) on delete cascade,
  role profile_role not null,
  full_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists identities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  type identity_type not null,
  name text not null,
  email text,
  privilege_level integer not null check (privilege_level >= 0),
  is_privileged boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  name text not null,
  category text not null,
  created_at timestamptz not null default now()
);

create table if not exists entitlements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  name text not null,
  privilege_weight integer not null check (privilege_weight >= 0),
  created_at timestamptz not null default now(),
  unique (tenant_id, application_id, name)
);

create table if not exists identity_entitlements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  identity_id uuid not null references identities (id) on delete cascade,
  entitlement_id uuid not null references entitlements (id) on delete cascade,
  granted_at timestamptz not null,
  granted_by uuid references profiles (id) on delete set null,
  unique (tenant_id, identity_id, entitlement_id)
);

create table if not exists access_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  identity_id uuid not null references identities (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  event_type text not null,
  ip_address inet not null,
  country text not null,
  ts timestamptz not null,
  success boolean not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists risk_findings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  identity_id uuid not null references identities (id) on delete cascade,
  application_id uuid references applications (id) on delete set null,
  finding_type text not null,
  severity finding_severity not null,
  score numeric(8, 2) not null,
  status finding_status not null default 'open',
  explanation text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists review_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  finding_id uuid not null references risk_findings (id) on delete cascade,
  actor_user_id uuid not null references profiles (id) on delete restrict,
  action review_action_type not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_tenant_id on profiles (tenant_id);
create index if not exists idx_identities_tenant_id on identities (tenant_id);
create index if not exists idx_applications_tenant_id on applications (tenant_id);
create index if not exists idx_entitlements_tenant_id on entitlements (tenant_id);
create index if not exists idx_identity_entitlements_tenant_id on identity_entitlements (tenant_id);
create index if not exists idx_identity_entitlements_identity on identity_entitlements (identity_id);
create index if not exists idx_access_events_tenant_identity_ts on access_events (tenant_id, identity_id, ts desc);
create index if not exists idx_access_events_event_type on access_events (event_type);
create index if not exists idx_risk_findings_tenant_status_severity on risk_findings (tenant_id, status, severity);
create index if not exists idx_risk_findings_identity on risk_findings (identity_id);
create index if not exists idx_review_actions_finding_created on review_actions (finding_id, created_at desc);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_risk_findings_updated_at on risk_findings;
create trigger trg_risk_findings_updated_at
before update on risk_findings
for each row
execute function set_updated_at();

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

alter table tenants enable row level security;
alter table profiles enable row level security;
alter table identities enable row level security;
alter table applications enable row level security;
alter table entitlements enable row level security;
alter table identity_entitlements enable row level security;
alter table access_events enable row level security;
alter table risk_findings enable row level security;
alter table review_actions enable row level security;

create policy "tenant read tenants"
on tenants
for select
to authenticated
using (id = public.current_tenant_id());

create policy "tenant read profiles"
on profiles
for select
to authenticated
using (tenant_id = public.current_tenant_id());

create policy "self update profile"
on profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "tenant access identities"
on identities
for all
to authenticated
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant access applications"
on applications
for all
to authenticated
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant access entitlements"
on entitlements
for all
to authenticated
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant access identity_entitlements"
on identity_entitlements
for all
to authenticated
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant access access_events"
on access_events
for all
to authenticated
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant access risk_findings"
on risk_findings
for all
to authenticated
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant access review_actions"
on review_actions
for all
to authenticated
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());
