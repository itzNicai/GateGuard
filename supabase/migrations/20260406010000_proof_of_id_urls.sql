-- Migrate profiles.proof_of_id_url (text) -> proof_of_id_urls (jsonb array)

-- Add new jsonb column
ALTER TABLE public.profiles ADD COLUMN proof_of_id_urls jsonb DEFAULT '[]'::jsonb;

-- Migrate existing single URLs into arrays
UPDATE public.profiles
SET proof_of_id_urls = jsonb_build_array(proof_of_id_url)
WHERE proof_of_id_url IS NOT NULL;

-- Drop old column
ALTER TABLE public.profiles DROP COLUMN proof_of_id_url;

-- Enforce max 5 images
ALTER TABLE public.profiles
ADD CONSTRAINT max_proof_of_id_images CHECK (
  jsonb_array_length(proof_of_id_urls) <= 5
);

-- Update handle_new_user trigger to read proof_of_id_urls as jsonb array
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role, status, block, lot, proof_of_id_urls)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'homeowner'),
    CASE
      WHEN (new.raw_user_meta_data->>'role') = 'admin' THEN 'active'::public.user_status
      WHEN (new.raw_user_meta_data->>'role') = 'guard'  THEN 'active'::public.user_status
      ELSE 'pending'::public.user_status
    END,
    nullif(new.raw_user_meta_data->>'block', ''),
    nullif(new.raw_user_meta_data->>'lot', ''),
    COALESCE(new.raw_user_meta_data->'proof_of_id_urls', '[]'::jsonb)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
