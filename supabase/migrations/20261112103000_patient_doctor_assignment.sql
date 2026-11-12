-- Assign patients to a single doctor at registration, and let reception list doctors.

-- Doctors only see patients assigned to them; admin/reception still see everyone.
DROP POLICY IF EXISTS "Staff read patients" ON public.patients;

CREATE POLICY "Admins and reception read patients" ON public.patients
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'receptionist'::app_role)
  );

CREATE POLICY "Doctors read assigned patients" ON public.patients
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'doctor'::app_role)
    AND doctor_id = auth.uid()
  );

-- Reception needs doctor names for the assignment dropdown.
CREATE POLICY "Reception reads doctor roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'receptionist'::app_role)
    AND role = 'doctor'::app_role
  );

CREATE POLICY "Reception reads doctor profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'receptionist'::app_role)
    AND private.has_role(id, 'doctor'::app_role)
  );
