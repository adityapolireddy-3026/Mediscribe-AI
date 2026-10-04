# MediScribe AI — role & workflow upgrade

## 1. Database
- [ ] Add `receptionist` to app_role; staff status/details on profiles
- [ ] Patients: UHID auto-generation, full demographic + medical fields, registered_by, status, nullable doctor_id
- [ ] patient_reports table + private storage bucket + RLS
- [ ] Role-scoped RLS for patients/consultations/notes/prescriptions/reports

## 2. Auth
- [ ] Remove public doctor sign-up (sign-in only)
- [ ] Role-based redirect: admin / receptionist / doctor

## 3. Access control
- [ ] `useRole` hook; route guards for admin-only, receptionist-only, doctor-only
- [ ] Role-specific sidebars

## 4. Admin
- [ ] Dashboard stats (doctors/active, receptionists, patients, consultations by status, follow-ups)
- [ ] Doctors: add/edit/view/activate/remove + search & filters
- [ ] Receptionists: add/edit/view/activate/remove
- [ ] Patients list with columns + patient record page
- [ ] Consultation records filters (pending/in progress/completed/approved/cancelled)

## 5. Receptionist
- [ ] Dashboard, patient registration form (dropdowns, DOB→age), report upload, appointments

## 6. Doctor
- [ ] Patient search/select only, no Add Patient, "contact Reception" empty state
- [ ] Patient record tabs incl. Medical Reports

## 7. Prescription
- [ ] Diagnosis as expanding multi-line field; full diagnosis in PDF
