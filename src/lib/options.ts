/** Shared dropdown option lists so every form offers the same controlled values. */

export const GENDERS = ["Male", "Female", "Other", "Prefer not to say"] as const;

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed", "Other"] as const;

export const DEPARTMENTS = [
  "General Medicine",
  "Cardiology",
  "Orthopedics",
  "Pediatrics",
  "Dermatology",
  "Neurology",
  "Gynecology",
  "ENT",
  "Ophthalmology",
  "Emergency",
  "Other",
] as const;

export const SPECIALIZATIONS = [
  "General Physician",
  "Cardiologist",
  "Dermatologist",
  "Neurologist",
  "Orthopedic",
  "Pediatrician",
  "Gynecologist",
  "ENT",
  "Ophthalmologist",
  "Psychiatrist",
  "Dentist",
  "Other",
] as const;

export const SHIFTS = ["Morning", "Afternoon", "Evening", "Night"] as const;

export const ACCOUNT_STATUSES = ["active", "inactive"] as const;

export const REPORT_TYPES = [
  "Blood Test",
  "Urine Test",
  "X-Ray",
  "CT Scan",
  "MRI",
  "ECG",
  "Ultrasound",
  "Prescription",
  "Discharge Summary",
  "Other",
] as const;

export const RELATIONSHIPS = [
  "Spouse",
  "Parent",
  "Child",
  "Sibling",
  "Relative",
  "Friend",
  "Guardian",
  "Other",
] as const;

export const LANGUAGES = ["English", "Telugu", "Hindi", "Tamil", "Kannada"] as const;

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Other",
] as const;

export const CONSULTATION_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "approved",
  "cancelled",
] as const;

export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number];

export const CONSULTATION_STATUS_LABELS: Record<string, string> = {
  draft: "Pending",
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  approved: "Approved",
  cancelled: "Cancelled",
};

/** Normalises legacy status values onto the five documented states. */
export function consultationStatusLabel(status: string | null | undefined) {
  if (!status) return "Pending";
  return CONSULTATION_STATUS_LABELS[status] ?? status;
}

/** Whole years between a date of birth and today; null when the date is unusable. */
export function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}
