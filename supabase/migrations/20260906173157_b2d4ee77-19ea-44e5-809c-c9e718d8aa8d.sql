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
