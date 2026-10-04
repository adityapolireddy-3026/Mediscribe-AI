ALTER TABLE public.clinical_notes
  ADD COLUMN IF NOT EXISTS vitals text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS other_observations text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS clinical_impression text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lifestyle_advice text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS recommended_tests text NOT NULL DEFAULT '';