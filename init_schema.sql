CREATE TYPE public.app_role AS ENUM ('admin', 'doctor');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  specialty text,
  hospital text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  age integer,
  gender text,
  phone text,
  address text,
  blood_group text,
  allergies text,
  medical_history text,
  emergency_contact text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own patients" ON public.patients FOR ALL TO authenticated
  USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Admins read all patients" ON public.patients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX patients_doctor_idx ON public.patients(doctor_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER patients_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, specialty, hospital)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data ->> 'specialty',
    NEW.raw_user_meta_data ->> 'hospital'
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'doctor')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE TABLE public.consultations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  transcript TEXT,
  audio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultations TO authenticated;
GRANT ALL ON public.consultations TO service_role;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors manage own consultations" ON public.consultations FOR ALL TO authenticated USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Admins read all consultations" ON public.consultations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.clinical_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
  chief_complaint TEXT NOT NULL DEFAULT '',
  history TEXT NOT NULL DEFAULT '',
  examination TEXT NOT NULL DEFAULT '',
  assessment TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT '',
  medicines TEXT NOT NULL DEFAULT '',
  follow_up TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_notes TO authenticated;
GRANT ALL ON public.clinical_notes TO service_role;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors manage own notes" ON public.clinical_notes FOR ALL TO authenticated USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Admins read all notes" ON public.clinical_notes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_clinical_notes_updated_at BEFORE UPDATE ON public.clinical_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  diagnosis TEXT NOT NULL DEFAULT '',
  medicines JSONB NOT NULL DEFAULT '[]'::jsonb,
  advice TEXT NOT NULL DEFAULT '',
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO authenticated;
GRANT ALL ON public.prescriptions TO service_role;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors manage own prescriptions" ON public.prescriptions FOR ALL TO authenticated USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Admins read all prescriptions" ON public.prescriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.clinical_notes
  ADD COLUMN IF NOT EXISTS vitals text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS other_observations text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS clinical_impression text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lifestyle_advice text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS recommended_tests text NOT NULL DEFAULT '';

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_number text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, specialty, hospital, registration_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data ->> 'specialty',
    NEW.raw_user_meta_data ->> 'hospital',
    NEW.raw_user_meta_data ->> 'registration_number'
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'doctor')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY "Admins read all roles" ON public.user_roles;
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "Admins read all patients" ON public.patients;
CREATE POLICY "Admins read all patients" ON public.patients FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "Admins read all consultations" ON public.consultations;
CREATE POLICY "Admins read all consultations" ON public.consultations FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "Admins read all notes" ON public.clinical_notes;
CREATE POLICY "Admins read all notes" ON public.clinical_notes FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "Admins read all prescriptions" ON public.prescriptions;
CREATE POLICY "Admins read all prescriptions" ON public.prescriptions FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS tests text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS follow_up_note text NOT NULL DEFAULT '';

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS original_language text NOT NULL DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS original_transcript text,
  ADD COLUMN IF NOT EXISTS english_translation text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS transcription_status TEXT NOT NULL DEFAULT 'complete';

CREATE POLICY "Doctors read own consultation audio"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'consultation-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Doctors upload own consultation audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'consultation-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Doctors delete own consultation audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'consultation-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'receptionist';

-- Staff profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS qualification text,
  ADD COLUMN IF NOT EXISTS experience_years integer,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS branch text,
  ADD COLUMN IF NOT EXISTS joining_date date,
  ADD COLUMN IF NOT EXISTS employee_id text,
  ADD COLUMN IF NOT EXISTS shift text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Patient fields + UHID
CREATE SEQUENCE IF NOT EXISTS public.patient_uhid_seq;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS uhid text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS pincode text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_relationship text,
  ADD COLUMN IF NOT EXISTS emergency_phone text,
  ADD COLUMN IF NOT EXISTS medical_conditions text,
  ADD COLUMN IF NOT EXISTS current_medications text,
  ADD COLUMN IF NOT EXISTS surgeries text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS registered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.patients ALTER COLUMN doctor_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_patient_uhid()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.uhid IS NULL OR NEW.uhid = '' THEN
    NEW.uhid := 'MED-' || lpad(nextval('public.patient_uhid_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.assign_patient_uhid() FROM PUBLIC;

DROP TRIGGER IF EXISTS patients_assign_uhid ON public.patients;
CREATE TRIGGER patients_assign_uhid BEFORE INSERT ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.assign_patient_uhid();

UPDATE public.patients
SET uhid = 'MED-' || lpad(nextval('public.patient_uhid_seq')::text, 6, '0')
WHERE uhid IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS patients_uhid_key ON public.patients (uhid);

-- Patient reports
CREATE TABLE IF NOT EXISTS public.patient_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  report_type text NOT NULL DEFAULT 'Other',
  report_name text NOT NULL,
  report_date date,
  hospital_lab text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  file_path text NOT NULL,
  file_type text NOT NULL DEFAULT '',
  file_size integer NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_reports TO authenticated;
GRANT ALL ON public.patient_reports TO service_role;
ALTER TABLE public.patient_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read patient reports" ON public.patient_reports
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'doctor'::app_role)
    OR private.has_role(auth.uid(), 'receptionist'::app_role)
  );

CREATE POLICY "Reception uploads patient reports" ON public.patient_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      private.has_role(auth.uid(), 'receptionist'::app_role)
      OR private.has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Reception updates patient reports" ON public.patient_reports
  FOR UPDATE TO authenticated
  USING (
    private.has_role(auth.uid(), 'receptionist'::app_role)
    OR private.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    private.has_role(auth.uid(), 'receptionist'::app_role)
    OR private.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Reception deletes patient reports" ON public.patient_reports
  FOR DELETE TO authenticated
  USING (
    private.has_role(auth.uid(), 'receptionist'::app_role)
    OR private.has_role(auth.uid(), 'admin'::app_role)
  );

DROP TRIGGER IF EXISTS patient_reports_updated_at ON public.patient_reports;
CREATE TRIGGER patient_reports_updated_at BEFORE UPDATE ON public.patient_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Patient access: reception registers, clinicians read
DROP POLICY IF EXISTS "Doctors manage own patients" ON public.patients;
DROP POLICY IF EXISTS "Admins read all patients" ON public.patients;

CREATE POLICY "Staff read patients" ON public.patients
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'doctor'::app_role)
    OR private.has_role(auth.uid(), 'receptionist'::app_role)
  );

CREATE POLICY "Reception registers patients" ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'receptionist'::app_role)
    OR private.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Reception updates patients" ON public.patients
  FOR UPDATE TO authenticated
  USING (
    private.has_role(auth.uid(), 'receptionist'::app_role)
    OR private.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    private.has_role(auth.uid(), 'receptionist'::app_role)
    OR private.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins delete patients" ON public.patients
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Reception may read consultation summaries
CREATE POLICY "Reception reads consultations" ON public.consultations
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'receptionist'::app_role));

-- Admin manages staff profiles and roles
CREATE POLICY "Admins insert profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Private storage for patient report files
CREATE POLICY "Staff read patient report files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'patient-reports'
    AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR private.has_role(auth.uid(), 'doctor'::app_role)
      OR private.has_role(auth.uid(), 'receptionist'::app_role)
    )
  );

CREATE POLICY "Reception uploads patient report files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'patient-reports'
    AND (
      private.has_role(auth.uid(), 'receptionist'::app_role)
      OR private.has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Reception deletes patient report files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'patient-reports'
    AND (
      private.has_role(auth.uid(), 'receptionist'::app_role)
      OR private.has_role(auth.uid(), 'admin'::app_role)
    )
  );



-- Finally, make Aditya an admin
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'aditya@gmail.com');
