-- ============================================================
-- GateGuard Phase 0: blocks_lots, notifications, trigger fix
-- ============================================================

-- 1. Blocks & Lots reference table
-- ============================================================
create table public.blocks_lots (
  id          uuid primary key default gen_random_uuid(),
  block       text not null,
  lot         text not null,
  is_occupied boolean not null default false,
  occupied_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique(block, lot)
);

comment on table public.blocks_lots is 'Subdivision block/lot inventory with occupancy tracking';

create index idx_blocks_lots_available on public.blocks_lots(is_occupied) where is_occupied = false;

alter table public.blocks_lots enable row level security;

-- Anyone can read blocks/lots (needed for registration dropdown)
create policy "Anyone can read blocks_lots"
  on public.blocks_lots for select
  using (true);

-- Only admins can update blocks/lots (mark occupied)
create policy "Admins can update blocks_lots"
  on public.blocks_lots for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 2. Seed placeholder block/lot data (Blocks 1-10, Lots 1-20)
-- ============================================================
insert into public.blocks_lots (block, lot)
select
  'Block ' || b.n,
  'Lot ' || l.n
from generate_series(1, 10) as b(n)
cross join generate_series(1, 20) as l(n);

-- 3. Notification type enum & table
-- ============================================================
create type public.notification_type as enum (
  'visitor_at_gate',
  'visitor_approved',
  'visitor_denied',
  'visitor_exited',
  'registration_approved',
  'registration_rejected'
);

create table public.notifications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  title               text not null,
  message             text not null,
  type                public.notification_type not null,
  related_visitor_id  uuid references public.visitors(id) on delete set null,
  is_read             boolean not null default false,
  created_at          timestamptz not null default now()
);

comment on table public.notifications is 'In-app notifications for users';

create index idx_notifications_user     on public.notifications(user_id);
create index idx_notifications_unread   on public.notifications(user_id, is_read) where is_read = false;

alter table public.notifications enable row level security;

-- Users can read their own notifications
create policy "Users can read own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
create policy "Users can update own notifications"
  on public.notifications for update
  using (user_id = auth.uid());

-- Service role inserts notifications (no anon insert policy needed)
-- Authenticated users can insert notifications (for guard/homeowner actions)
create policy "Authenticated users can insert notifications"
  on public.notifications for insert
  with check (auth.uid() is not null);

-- 4. Fix handle_new_user() trigger to read more metadata
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, phone, role, status, block, lot, proof_of_id_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'homeowner'),
    case
      when (new.raw_user_meta_data->>'role') = 'admin' then 'active'::public.user_status
      when (new.raw_user_meta_data->>'role') = 'guard'  then 'active'::public.user_status
      else 'pending'::public.user_status
    end,
    new.raw_user_meta_data->>'block',
    new.raw_user_meta_data->>'lot',
    new.raw_user_meta_data->>'proof_of_id_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- 5. Additional RLS policies
-- ============================================================

-- Anonymous users can insert visitors (visitor portal, no auth)
create policy "Anonymous can insert visitors"
  on public.visitors for insert
  with check (true);

-- Guards can update visitor status (for scan flow)
create policy "Guards can update visitor status"
  on public.visitors for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'guard'
    )
  );

-- 6. Enable Supabase Realtime
-- ============================================================
alter publication supabase_realtime add table public.visitors;
alter publication supabase_realtime add table public.notifications;

-- 7. Storage bucket for proof of ID (must be created via dashboard or API)
-- Note: Run in Supabase dashboard:
--   INSERT INTO storage.buckets (id, name, public) VALUES ('proof-of-id', 'proof-of-id', true);
