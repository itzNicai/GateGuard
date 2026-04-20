-- Fix handle_new_user to save phone, block, lot, and proof_of_id_url from user metadata
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, phone, role, status, block, lot, proof_of_id_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'homeowner'),
    case
      when (new.raw_user_meta_data->>'role') = 'admin' then 'active'::public.user_status
      when (new.raw_user_meta_data->>'role') = 'guard'  then 'active'::public.user_status
      else 'pending'::public.user_status
    end,
    nullif(new.raw_user_meta_data->>'block', ''),
    nullif(new.raw_user_meta_data->>'lot', ''),
    nullif(new.raw_user_meta_data->>'proof_of_id_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;
