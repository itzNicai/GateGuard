-- Add proof_url column to visitors table
alter table public.visitors
  add column if not exists proof_url text;

-- Create storage bucket for visitor proof photos
insert into storage.buckets (id, name, public)
values ('visitor-proof', 'visitor-proof', true)
on conflict (id) do nothing;

-- Allow anyone to upload to visitor-proof (public portal, no auth)
create policy "Anyone can upload visitor proof"
  on storage.objects for insert
  with check (bucket_id = 'visitor-proof');

-- Allow anyone to read visitor proof files
create policy "Anyone can read visitor proof"
  on storage.objects for select
  using (bucket_id = 'visitor-proof');
