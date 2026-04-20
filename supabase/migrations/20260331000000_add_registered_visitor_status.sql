-- Add 'registered' status to visitor_status enum
-- Visitors start as 'registered' (just got QR code, not yet at gate)
-- Guard scan changes them to 'pending' (at the gate, waiting for homeowner approval)
ALTER TYPE public.visitor_status ADD VALUE IF NOT EXISTS 'registered' BEFORE 'pending';

-- Update default for new visitors
ALTER TABLE public.visitors ALTER COLUMN status SET DEFAULT 'registered';
