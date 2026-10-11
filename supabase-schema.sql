-- FAT2FIT GYM STUDIO — secure Supabase schema
-- Netlify Functions write using SUPABASE_SERVICE_ROLE_KEY stored server-side only.
-- Never add the service-role key to index.html or commit it to GitHub.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.fitness_plans (
  id uuid primary key default gen_random_uuid(),
  created_by uuid null references auth.users(id) on delete set null,
  member_name text not null default 'Member' check (char_length(member_name) <= 60),
  age smallint not null check (age between 18 and 80),
  height_cm numeric(5,1) not null check (height_cm between 120 and 230),
  weight_kg numeric(5,1) not null check (weight_kg between 35 and 300),
  goal text not null check (goal in ('maintain','gain','lose','athletic')),
  activity_factor numeric(3,2) not null check (activity_factor between 1.2 and 1.9),
  plan_json jsonb not null,
  consent_recorded boolean not null default false,
  consent_at timestamptz,
  consent_version text,
  created_at timestamptz not null default now(),
  constraint fitness_plans_consent_required check (
    consent_recorded = true and consent_at is not null and consent_version is not null
  )
);

create table if not exists public.gym_enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  phone text not null check (char_length(phone) between 7 and 25),
  topic text not null default 'General' check (char_length(topic) <= 80),
  message text check (message is null or char_length(message) <= 1000),
  consent_recorded boolean not null default false,
  consent_at timestamptz,
  consent_version text,
  created_at timestamptz not null default now(),
  constraint gym_enquiries_consent_required check (
    consent_recorded = true and consent_at is not null and consent_version is not null
  )
);

alter table public.admin_users enable row level security;
alter table public.fitness_plans enable row level security;
alter table public.gym_enquiries enable row level security;

-- Admin helper lives in a non-exposed schema; authenticated users cannot read the role table.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_fat2fit_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users au
    where au.user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_fat2fit_admin() from public, anon;
grant execute on function private.is_fat2fit_admin() to authenticated;

drop policy if exists "admins can view their own admin marker" on public.admin_users;
drop policy if exists "admins can read fitness plans" on public.fitness_plans;
drop policy if exists "admins can delete fitness plans" on public.fitness_plans;
drop policy if exists "admins can read enquiries" on public.gym_enquiries;
drop policy if exists "admins can delete enquiries" on public.gym_enquiries;

create policy "admins can view their own admin marker"
on public.admin_users for select to authenticated
using (user_id = (select auth.uid()));

create policy "admins can read fitness plans"
on public.fitness_plans for select to authenticated
using (private.is_fat2fit_admin());
create policy "admins can delete fitness plans"
on public.fitness_plans for delete to authenticated
using (private.is_fat2fit_admin());

create policy "admins can read enquiries"
on public.gym_enquiries for select to authenticated
using (private.is_fat2fit_admin());
create policy "admins can delete enquiries"
on public.gym_enquiries for delete to authenticated
using (private.is_fat2fit_admin());

-- Deny browser clients all direct table writes. Netlify server functions perform writes
-- only after validating explicit consent, Turnstile, and submitted fields.
revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.fitness_plans from anon, authenticated;
revoke all on table public.gym_enquiries from anon, authenticated;
grant select on table public.admin_users to authenticated;
grant select, delete on table public.fitness_plans to authenticated;
grant select, delete on table public.gym_enquiries to authenticated;

-- Existing-project migration support:
alter table public.fitness_plans alter column created_by drop not null;
alter table public.fitness_plans add column if not exists consent_at timestamptz;
alter table public.fitness_plans add column if not exists consent_version text;
alter table public.fitness_plans add column if not exists consent_recorded boolean not null default false;
alter table public.gym_enquiries add column if not exists consent_recorded boolean not null default false;
alter table public.gym_enquiries add column if not exists consent_at timestamptz;
alter table public.gym_enquiries add column if not exists consent_version text;
