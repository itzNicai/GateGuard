-- Migrate proof_url (text) -> proof_urls (jsonb array)

-- Add new jsonb column
ALTER TABLE public.visitors ADD COLUMN proof_urls jsonb DEFAULT '[]'::jsonb;

-- Migrate existing single URLs into arrays
UPDATE public.visitors
SET proof_urls = jsonb_build_array(proof_url)
WHERE proof_url IS NOT NULL;

-- Drop old column
ALTER TABLE public.visitors DROP COLUMN proof_url;

-- Enforce max 5 images
ALTER TABLE public.visitors
ADD CONSTRAINT max_proof_images CHECK (
  jsonb_array_length(proof_urls) <= 5
);
