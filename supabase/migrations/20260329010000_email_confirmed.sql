-- Add email_confirmed column to profiles
alter table public.profiles
  add column if not exists email_confirmed boolean not null default false;
