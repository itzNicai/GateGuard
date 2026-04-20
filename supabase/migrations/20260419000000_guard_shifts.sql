-- ============================================================
-- Guard shift tracking (clock in / clock out)
-- ============================================================

create table public.guard_shifts (
  id              uuid primary key default gen_random_uuid(),
  guard_id        uuid not null references public.profiles(id) on delete cascade,
  clocked_in_at   timestamptz not null default now(),
  clocked_out_at  timestamptz,
  auto_closed     boolean not null default false,
  created_at      timestamptz not null default now()
);

comment on table public.guard_shifts is 'Guard duty shifts — each row is one clock-in/clock-out session';

-- Enforce: at most one open shift per guard
create unique index guard_shifts_one_open_per_guard
  on public.guard_shifts (guard_id)
  where clocked_out_at is null;

create index idx_guard_shifts_guard       on public.guard_shifts(guard_id);
create index idx_guard_shifts_clocked_in  on public.guard_shifts(clocked_in_at desc);

-- ============================================================
-- RLS
-- ============================================================
alter table public.guard_shifts enable row level security;

create policy "Guards can read own shifts"
  on public.guard_shifts for select
  using ( guard_id = auth.uid() );

create policy "Guards can insert own shifts"
  on public.guard_shifts for insert
  with check ( guard_id = auth.uid() and public.get_my_role() = 'guard' );

create policy "Guards can update own shifts"
  on public.guard_shifts for update
  using ( guard_id = auth.uid() );

create policy "Admins can read all shifts"
  on public.guard_shifts for select
  using ( public.get_my_role() = 'admin' );

-- Realtime
alter publication supabase_realtime add table public.guard_shifts;
