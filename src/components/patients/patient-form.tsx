import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AreaField, FormSection, SelectField, TextField } from "@/components/dashboard/form-fields";
import {
  BLOOD_GROUPS,
  GENDERS,
  INDIAN_STATES,
  LANGUAGES,
  MARITAL_STATUSES,
  RELATIONSHIPS,
  ACCOUNT_STATUSES,
  ageFromDob,
} from "@/lib/options";
import {
  emptyPatient,
  useSavePatient,
  type Patient,
  type PatientInput,
} from "@/hooks/use-patients";

function toForm(p: Patient): PatientInput {
  return {
    full_name: p.full_name,
    gender: p.gender ?? "",
    date_of_birth: p.date_of_birth ?? null,
    age: p.age,
    blood_group: p.blood_group ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    address: p.address ?? "",
    city: p.city ?? "",
    state: p.state ?? "",
    pincode: p.pincode ?? "",
    emergency_contact_name: p.emergency_contact_name ?? "",
    emergency_relationship: p.emergency_relationship ?? "",
    emergency_phone: p.emergency_phone ?? "",
    allergies: p.allergies ?? "",
    medical_conditions: p.medical_conditions ?? "",
    current_medications: p.current_medications ?? "",
    medical_history: p.medical_history ?? "",
    surgeries: p.surgeries ?? "",
    occupation: p.occupation ?? "",
    marital_status: p.marital_status ?? "",
    preferred_language: p.preferred_language ?? "English",
    status: p.status ?? "active",
  };
}

/** Patient registration / edit dialog used by reception and administrators. */
export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  registeredByName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  registeredByName: string;
}) {
  const [form, setForm] = useState<PatientInput>(emptyPatient);
  const save = useSavePatient();

  useEffect(() => {
    if (open) setForm(patient ? toForm(patient) : emptyPatient);
  }, [open, patient]);

  const set = <K extends keyof PatientInput>(key: K, value: PatientInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const derivedAge = ageFromDob(form.date_of_birth ?? null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) {
      toast.error("Patient name is required");
      return;
    }
    if (!form.gender) {
      toast.error("Please select the patient's gender");
      return;
    }
    try {
      await save.mutateAsync({
        id: patient?.id,
        values: {
          ...form,
          full_name: form.full_name.trim(),
          age: derivedAge ?? form.age ?? null,
        },
      });
      toast.success(patient ? "Patient record updated" : "Patient registered successfully");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the patient record");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{patient ? "Edit patient" : "Register new patient"}</DialogTitle>
        </DialogHeader>

        <form className="space-y-6" onSubmit={submit}>
          <FormSection title="Personal details">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TextField
                label="Patient ID / UHID"
                value={patient?.uhid ?? "Generated automatically"}
                onChange={() => {}}
                disabled
              />
              <TextField
                label="Full name"
                required
                value={form.full_name}
                onChange={(v) => set("full_name", v)}
              />
              <SelectField
                label="Gender"
                required
                value={form.gender ?? ""}
                onChange={(v) => set("gender", v)}
                options={GENDERS}
              />
              <TextField
                label="Date of birth"
                type="date"
                value={form.date_of_birth ?? ""}
                onChange={(v) => set("date_of_birth", v || null)}
              />
              <TextField
                label="Age"
                value={derivedAge != null ? String(derivedAge) : form.age != null ? String(form.age) : ""}
                onChange={(v) => set("age", v === "" ? null : Number(v))}
                disabled={derivedAge != null}
                hint={derivedAge != null ? "Calculated from date of birth" : "Enter age if DOB unknown"}
              />
              <SelectField
                label="Blood group"
                value={form.blood_group ?? ""}
                onChange={(v) => set("blood_group", v)}
                options={BLOOD_GROUPS}
              />
              <TextField
                label="Phone number"
                value={form.phone ?? ""}
                onChange={(v) => set("phone", v)}
              />
              <TextField
                label="Email"
                type="email"
                value={form.email ?? ""}
                onChange={(v) => set("email", v)}
              />
              <TextField label="City" value={form.city ?? ""} onChange={(v) => set("city", v)} />
              <SelectField
                label="State"
                value={form.state ?? ""}
                onChange={(v) => set("state", v)}
                options={INDIAN_STATES}
              />
              <TextField
                label="Pincode"
                value={form.pincode ?? ""}
                onChange={(v) => set("pincode", v)}
              />
            </div>
            <AreaField
              label="Address"
              value={form.address ?? ""}
              onChange={(v) => set("address", v)}
            />
          </FormSection>

          <FormSection title="Emergency details">
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                label="Emergency contact name"
                value={form.emergency_contact_name ?? ""}
                onChange={(v) => set("emergency_contact_name", v)}
              />
              <SelectField
                label="Relationship"
                value={form.emergency_relationship ?? ""}
                onChange={(v) => set("emergency_relationship", v)}
                options={RELATIONSHIPS}
              />
              <TextField
                label="Emergency contact number"
                value={form.emergency_phone ?? ""}
                onChange={(v) => set("emergency_phone", v)}
              />
            </div>
          </FormSection>

          <FormSection title="Medical information">
            <div className="grid gap-4 sm:grid-cols-2">
              <AreaField
                label="Known allergies"
                value={form.allergies ?? ""}
                onChange={(v) => set("allergies", v)}
                placeholder="e.g. Sulfa drugs, penicillin"
              />
              <AreaField
                label="Existing medical conditions"
                value={form.medical_conditions ?? ""}
                onChange={(v) => set("medical_conditions", v)}
                placeholder="e.g. Hypertension, Type 2 diabetes"
              />
              <AreaField
                label="Current medications"
                value={form.current_medications ?? ""}
                onChange={(v) => set("current_medications", v)}
              />
              <AreaField
                label="Previous medical history"
                value={form.medical_history ?? ""}
                onChange={(v) => set("medical_history", v)}
              />
              <AreaField
                label="Previous surgeries"
                value={form.surgeries ?? ""}
                onChange={(v) => set("surgeries", v)}
              />
            </div>
          </FormSection>

          <FormSection title="Other details">
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                label="Occupation"
                value={form.occupation ?? ""}
                onChange={(v) => set("occupation", v)}
              />
              <SelectField
                label="Marital status"
                value={form.marital_status ?? ""}
                onChange={(v) => set("marital_status", v)}
                options={MARITAL_STATUSES}
              />
              <SelectField
                label="Preferred language"
                value={form.preferred_language ?? "English"}
                onChange={(v) => set("preferred_language", v)}
                options={LANGUAGES}
              />
            </div>
          </FormSection>

          <FormSection title="Registration">
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                label="Registration date"
                value={
                  patient?.created_at
                    ? new Date(patient.created_at).toLocaleDateString()
                    : new Date().toLocaleDateString()
                }
                onChange={() => {}}
                disabled
              />
              <TextField
                label="Registered by"
                value={registeredByName}
                onChange={() => {}}
                disabled
              />
              <SelectField
                label="Patient status"
                value={form.status ?? "active"}
                onChange={(v) => set("status", v)}
                options={ACCOUNT_STATUSES}
                labelFor={(o) => (o === "active" ? "Active" : "Inactive")}
              />
            </div>
          </FormSection>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending
                ? "Saving…"
                : patient
                  ? "Save changes"
                  : "Register patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
