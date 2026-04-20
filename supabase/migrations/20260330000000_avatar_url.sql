-- Add avatar_url column to profiles
alter table public.profiles
  add column if not exists avatar_url text;

-- Create storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload their own avatar
create policy "Users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

-- Allow authenticated users to update their own avatar
create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars');

-- Allow anyone to read avatars (public)
create policy "Anyone can read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');
