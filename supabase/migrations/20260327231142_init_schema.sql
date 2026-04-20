-- ============================================================
-- GateGuard Database Schema
-- ============================================================

-- 1. Custom enum types
-- ============================================================
create type public.user_role   as enum ('admin', 'guard', 'homeowner');
create type public.user_status as enum ('pending', 'active', 'rejected');
create type public.visitor_status as enum ('pending', 'approved', 'denied');

-- 2. Profiles table (extends auth.users)
-- ============================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text not null,
  phone         text,
  role          public.user_role   not null default 'homeowner',
  status        public.user_status not null default 'pending',
  block         text,
  lot           text,
  proof_of_id_url text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'User profiles linked 1:1 to auth.users';

-- 3. Visitors table
-- ============================================================
create table public.visitors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text,
  purpose       text not null,
  vehicle_plate text,
  homeowner_id  uuid not null references public.profiles(id) on delete cascade,
  qr_code       text not null unique,
  status        public.visitor_status not null default 'pending',
  denial_reason text,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now()
);

comment on table public.visitors is 'Visitor registrations created by homeowners';

-- 4. Visit logs table
-- ============================================================
create table public.visit_logs (
  id            uuid primary key default gen_random_uuid(),
  visitor_id    uuid not null references public.visitors(id) on delete cascade,
  guard_id      uuid not null references public.profiles(id) on delete cascade,
  entry_time    timestamptz,
  exit_time     timestamptz,
  created_at    timestamptz not null default now()
);

comment on table public.visit_logs is 'Gate entry/exit records scanned by guards';

-- 5. Indexes
-- ============================================================
create index idx_profiles_role        on public.profiles(role);
create index idx_profiles_status      on public.profiles(status);
create index idx_visitors_homeowner   on public.visitors(homeowner_id);
create index idx_visitors_status      on public.visitors(status);
create index idx_visitors_qr_code     on public.visitors(qr_code);
create index idx_visitors_expires_at  on public.visitors(expires_at);
create index idx_visit_logs_visitor   on public.visit_logs(visitor_id);
create index idx_visit_logs_guard     on public.visit_logs(guard_id);

-- 6. Updated_at trigger function
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- 7. Auto-create profile on signup trigger
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'homeowner'),
    case
      when (new.raw_user_meta_data->>'role') = 'admin' then 'active'::public.user_status
      when (new.raw_user_meta_data->>'role') = 'guard'  then 'active'::public.user_status
      else 'pending'::public.user_status
    end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 8. Row Level Security
-- ============================================================

-- Profiles RLS
alter table public.profiles enable row level security;

-- Anyone authenticated can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Admins can read all profiles
create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Guards can read homeowner profiles (for verification)
create policy "Guards can read homeowner profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'guard'
    )
    and role = 'homeowner'
  );

-- Users can update their own profile (limited fields handled at app level)
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Admins can update any profile (approve/reject homeowners, manage guards)
create policy "Admins can update all profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Visitors RLS
alter table public.visitors enable row level security;

-- Homeowners can CRUD their own visitors
create policy "Homeowners can read own visitors"
  on public.visitors for select
  using (homeowner_id = auth.uid());

create policy "Homeowners can insert own visitors"
  on public.visitors for insert
  with check (homeowner_id = auth.uid());

create policy "Homeowners can update own visitors"
  on public.visitors for update
  using (homeowner_id = auth.uid());

create policy "Homeowners can delete own visitors"
  on public.visitors for delete
  using (homeowner_id = auth.uid());

-- Guards can read visitors (for QR code verification at the gate)
create policy "Guards can read all visitors"
  on public.visitors for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'guard'
    )
  );

-- Admins can read all visitors
create policy "Admins can read all visitors"
  on public.visitors for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Anonymous access for visitor self-lookup by QR code
create policy "Anyone can look up visitor by qr_code"
  on public.visitors for select
  using (true);

-- Visit logs RLS
alter table public.visit_logs enable row level security;

-- Guards can insert visit logs (scanning QR at gate)
create policy "Guards can insert visit logs"
  on public.visit_logs for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'guard'
    )
  );

-- Guards can update visit logs (record exit time)
create policy "Guards can update visit logs"
  on public.visit_logs for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'guard'
    )
  );

-- Guards can read visit logs
create policy "Guards can read visit logs"
  on public.visit_logs for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'guard'
    )
  );

-- Homeowners can read visit logs for their visitors
create policy "Homeowners can read own visitor logs"
  on public.visit_logs for select
  using (
    exists (
      select 1 from public.visitors
      where visitors.id = visit_logs.visitor_id
        and visitors.homeowner_id = auth.uid()
    )
  );

-- Admins can read all visit logs
create policy "Admins can read all visit logs"
  on public.visit_logs for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
