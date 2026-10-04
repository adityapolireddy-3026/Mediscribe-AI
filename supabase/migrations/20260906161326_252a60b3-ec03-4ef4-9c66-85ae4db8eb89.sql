ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS transcription_status TEXT NOT NULL DEFAULT 'complete';