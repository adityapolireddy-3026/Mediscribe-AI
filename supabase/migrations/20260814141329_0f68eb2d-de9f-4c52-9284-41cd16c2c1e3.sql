ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS original_language text NOT NULL DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS original_transcript text,
  ADD COLUMN IF NOT EXISTS english_translation text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;