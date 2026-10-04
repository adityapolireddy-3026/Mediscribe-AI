ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS tests text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS follow_up_note text NOT NULL DEFAULT '';