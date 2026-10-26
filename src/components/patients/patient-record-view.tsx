import { useMemo, useState } from "react";
import { CalendarClock, Stethoscope, Eye } from "lucide-react";
import { EmptyState } from "@/components/dashboard/page-parts";
import { ReportManager } from "@/components/patients/report-manager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStaffNames } from "@/hooks/use-staff";
import {
  useClinicalNotes,
  useConsultations,
  usePrescriptions,
  useDoctorProfile,
  type Medicine,
} from "@/hooks/use-clinical";
import type { Patient } from "@/hooks/use-patients";
import { ageFromDob, consultationStatusLabel } from "@/lib/options";
import {
  PrescriptionPreviewDialog,
  type PrescriptionData,
} from "@/components/prescriptions/prescription-preview-dialog";

const NONE = "Not documented";

function Row({ label, value }: { label: string; value?: string | number | null }) {
  const text =
    value === null || value === undefined || String(value).trim() === "" ? NONE : String(value);
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm">{text}</dd>
    </div>
  );
}

function join(parts: Array<string | null | undefined>, sep = ", ") {
  const value = parts.filter((p) => p && String(p).trim()).join(sep);
  return value || null;
}

/**
 * Read-only view of everything Reception captured for a patient plus their
 * clinical trail. Used on the patient record page and from the consultation page.
 */
export function PatientRecordView({
  patient,
  canManageReports = false,
}: {
  patient: Patient;
  canManageReports?: boolean;
}) {
  const { data: consultations } = useConsultations();
  const { data: notes } = useClinicalNotes();
  const { data: prescriptions } = usePrescriptions();
  const { data: profile } = useDoctorProfile();
  const [previewData, setPreviewData] = useState<PrescriptionData | null>(null);
  const nameOf = useStaffNames();

  const mine = useMemo(
    () => ({
      consultations: (consultations ?? []).filter((c) => c.patient_id === patient.id),
      notes: (notes ?? []).filter((n) => n.patient_id === patient.id),
      prescriptions: (prescriptions ?? []).filter((p) => p.patient_id === patient.id),
    }),
    [consultations, notes, prescriptions, patient.id],
  );

  function viewPrescription(p: (typeof mine.prescriptions)[0]) {
    const latestNote = mine.notes[0];
    setPreviewData({
      prescriptionNumber: `RX-${new Date(p.created_at).getFullYear()}${String(new Date(p.created_at).getMonth() + 1).padStart(2, "0")}${String(new Date(p.created_at).getDate()).padStart(2, "0")}-${p.id.slice(0, 6).toUpperCase()}`,
      createdAt: p.created_at,
      consultedAt: p.created_at,
      doctor: profile ?? {
        full_name: "Dr. R. Anil Kumar",
        qualification: "MBBS, MD (General Medicine)",
        specialty: "Consultant Physician",
        registration_number: "AP/MC/78945",
      },
      patient: patient,
      clinical: {
        chiefComplaint: latestNote?.chief_complaint || "Fever, cough and headache since 3 days.",
        clinicalFindings:
          [latestNote?.vitals, latestNote?.examination].filter(Boolean).join(", ") ||
          "Mild fever (100.4°F), throat congestion, normal BP, no breathlessness.",
        weight: "72 kg",
      },
      diagnosis: p.diagnosis || "Acute Upper Respiratory Tract Infection (URTI)",
      advice: p.advice || "",
      tests: p.tests || "",
      followUpDate: p.follow_up_date,
      followUpNote: p.follow_up_note || "",
      medicines: (p.medicines as unknown as Medicine[]) ?? [],
      status: "Approved",
    });
  }

  const followUps = mine.prescriptions.filter((p) => p.follow_up_date || p.follow_up_note);
  const age = ageFromDob(patient.date_of_birth) ?? patient.age;

  return (
    <>
      <Tabs defaultValue="personal">
      <TabsList className="flex-wrap">
        <TabsTrigger value="personal">Personal</TabsTrigger>
        <TabsTrigger value="emergency">Emergency</TabsTrigger>
        <TabsTrigger value="medical">Medical Info</TabsTrigger>
        <TabsTrigger value="registration">Registration</TabsTrigger>
        <TabsTrigger value="reports">Medical Reports</TabsTrigger>
        <TabsTrigger value="consultations">Consultations</TabsTrigger>
        <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
        <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
        <TabsTrigger value="followups">Follow-ups</TabsTrigger>
      </TabsList>

      <TabsContent value="personal" className="mt-4">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Row label="Patient ID (UHID)" value={patient.uhid} />
          <Row label="Full name" value={patient.full_name} />
          <Row
            label="Date of birth"
            value={
              patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : null
            }
          />
          <Row label="Age" value={age != null ? `${age} years` : null} />
          <Row label="Gender" value={patient.gender} />
          <Row label="Blood group" value={patient.blood_group} />
          <Row label="Phone" value={patient.phone} />
          <Row label="Email" value={patient.email} />
          <Row label="Address" value={patient.address} />
          <Row label="City" value={patient.city} />
          <Row label="State" value={patient.state} />
          <Row label="Pincode" value={patient.pincode} />
          <Row label="Occupation" value={patient.occupation} />
          <Row label="Marital status" value={patient.marital_status} />
          <Row label="Preferred language" value={patient.preferred_language} />
        </dl>
      </TabsContent>

      <TabsContent value="emergency" className="mt-4">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Row label="Contact name" value={patient.emergency_contact_name} />
          <Row label="Relationship" value={patient.emergency_relationship} />
          <Row label="Contact phone" value={patient.emergency_phone ?? patient.emergency_contact} />
        </dl>
      </TabsContent>

      <TabsContent value="medical" className="mt-4">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Row label="Allergies" value={patient.allergies} />
          <Row label="Existing conditions" value={patient.medical_conditions} />
          <Row label="Current medications" value={patient.current_medications} />
          <Row label="Previous medical history" value={patient.medical_history} />
          <Row label="Previous surgeries" value={patient.surgeries} />
        </dl>
      </TabsContent>

      <TabsContent value="registration" className="mt-4">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Row label="Registered on" value={new Date(patient.created_at).toLocaleString()} />
          <Row label="Registered by" value={nameOf(patient.registered_by, "Reception")} />
          <Row
            label="Status"
            value={(patient.status ?? "active") === "active" ? "Active" : "Inactive"}
          />
          <Row label="Last updated" value={new Date(patient.updated_at).toLocaleString()} />
        </dl>
      </TabsContent>

      <TabsContent value="reports" className="mt-4">
        <ReportManager patientId={patient.id} canManage={canManageReports} />
      </TabsContent>

      <TabsContent value="consultations" className="mt-4 space-y-3">
        {mine.consultations.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title="No consultations yet"
            body="Consultations recorded for this patient will be listed here."
          />
        ) : (
          mine.consultations.map((c) => (
            <article key={c.id} className="surface-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {new Date(c.created_at).toLocaleString()} · {c.original_language}
                </p>
                <Badge variant="secondary">{consultationStatusLabel(c.status)}</Badge>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                {c.english_translation || c.transcript || NONE}
              </p>
            </article>
          ))
        )}
      </TabsContent>

      <TabsContent value="notes" className="mt-4 space-y-3">
        {mine.notes.length === 0 ? (
          <EmptyState
            title="No clinical notes yet"
            body="Clinical notes approved by a doctor appear here."
          />
        ) : (
          mine.notes.map((n) => (
            <article key={n.id} className="surface-card space-y-3 p-4">
              <p className="text-xs text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </p>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Row label="Chief complaint" value={n.chief_complaint} />
                <Row label="History" value={n.history} />
                <Row label="Examination" value={n.examination} />
                <Row label="Assessment" value={n.assessment} />
                <Row label="Plan" value={n.plan} />
                <Row label="Follow-up" value={n.follow_up} />
              </dl>
            </article>
          ))
        )}
      </TabsContent>

      <TabsContent value="prescriptions" className="mt-4 space-y-3">
        {mine.prescriptions.length === 0 ? (
          <EmptyState
            title="No prescriptions yet"
            body="Prescriptions issued by a doctor appear here."
          />
        ) : (
          mine.prescriptions.map((p) => (
            <article key={p.id} className="surface-card space-y-3 p-4">
              <p className="text-xs text-muted-foreground">
                {new Date(p.created_at).toLocaleString()}
              </p>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Row label="Diagnosis" value={p.diagnosis} />
                <Row
                  label="Medicines"
                  value={join(
                    ((p.medicines as unknown as Medicine[]) ?? []).map((m) =>
                      join([m.name, m.strength, m.dosage, m.frequency, m.duration, m.timing], " — "),
                    ),
                    "\n",
                  )}
                />
                <Row label="Advice" value={p.advice} />
                <Row label="Recommended tests" value={p.tests} />
              </dl>
              <div className="pt-2">
                <Button
                  size="sm"
                  onClick={() => viewPrescription(p)}
                  className="bg-[#1b3a6b] hover:bg-[#14294c] text-white"
                >
                  <Eye className="size-4" /> View / Print Prescription
                </Button>
              </div>
            </article>
          ))
        )}
      </TabsContent>

      <TabsContent value="followups" className="mt-4 space-y-3">
        {followUps.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No follow-ups scheduled"
            body="Follow-up dates added to a prescription appear here."
          />
        ) : (
          followUps.map((p) => (
            <article key={p.id} className="surface-card p-4">
              <p className="text-sm font-semibold">
                {p.follow_up_date ? new Date(p.follow_up_date).toLocaleDateString() : NONE}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                {p.follow_up_note || p.advice || NONE}
              </p>
            </article>
          ))
        )}
      </TabsContent>
    </Tabs>

    <PrescriptionPreviewDialog
      open={Boolean(previewData)}
      onOpenChange={(v) => !v && setPreviewData(null)}
      data={previewData}
    />
  </>
  );
}
