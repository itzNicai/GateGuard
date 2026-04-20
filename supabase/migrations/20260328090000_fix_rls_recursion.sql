-- ============================================================
-- Fix infinite recursion in RLS policies
-- The profiles policies subquery profiles to check role,
-- which triggers the same RLS check → infinite loop.
-- Solution: a SECURITY DEFINER function that bypasses RLS.
-- ============================================================

-- Helper: get current user's role without going through RLS
create or replace function public.get_my_role()
returns public.user_role as $$
  select role from public.profiles where id = auth.uid()
$$ language sql security definer stable;

-- ============================================================
-- Drop and recreate profiles policies
-- ============================================================

-- Keep self-read (no recursion issue)
-- drop policy "Users can read own profile" on public.profiles;

-- Fix admin read all
drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  using ( public.get_my_role() = 'admin' );

-- Fix guard read homeowner profiles
drop policy if exists "Guards can read homeowner profiles" on public.profiles;
create policy "Guards can read homeowner profiles"
  on public.profiles for select
  using ( public.get_my_role() = 'guard' and role = 'homeowner' );

-- Fix admin update all
drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  using ( public.get_my_role() = 'admin' );

-- ============================================================
-- Fix visitors policies that subquery profiles
-- ============================================================

drop policy if exists "Guards can read all visitors" on public.visitors;
create policy "Guards can read all visitors"
  on public.visitors for select
  using ( public.get_my_role() = 'guard' );

drop policy if exists "Admins can read all visitors" on public.visitors;
create policy "Admins can read all visitors"
  on public.visitors for select
  using ( public.get_my_role() = 'admin' );

-- Fix guard update visitors (from second migration)
drop policy if exists "Guards can update visitor status" on public.visitors;
create policy "Guards can update visitor status"
  on public.visitors for update
  using ( public.get_my_role() = 'guard' );

-- ============================================================
-- Fix visit_logs policies that subquery profiles
-- ============================================================

drop policy if exists "Guards can insert visit logs" on public.visit_logs;
create policy "Guards can insert visit logs"
  on public.visit_logs for insert
  with check ( public.get_my_role() = 'guard' );

drop policy if exists "Guards can update visit logs" on public.visit_logs;
create policy "Guards can update visit logs"
  on public.visit_logs for update
  using ( public.get_my_role() = 'guard' );

drop policy if exists "Guards can read visit logs" on public.visit_logs;
create policy "Guards can read visit logs"
  on public.visit_logs for select
  using ( public.get_my_role() = 'guard' );

drop policy if exists "Admins can read all visit logs" on public.visit_logs;
create policy "Admins can read all visit logs"
  on public.visit_logs for select
  using ( public.get_my_role() = 'admin' );

-- ============================================================
-- Fix notifications policies that subquery profiles (if any)
-- ============================================================
-- notifications policies use user_id = auth.uid() directly,
-- so they don't have this problem. No changes needed.
