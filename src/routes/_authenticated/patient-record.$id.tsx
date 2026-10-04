import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, CalendarClock, Stethoscope } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/dashboard/page-parts";
import { DetailItem } from "@/components/dashboard/form-fields";
import { ReportManager } from "@/components/patients/report-manager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePatient } from "@/hooks/use-patients";
import { useRole } from "@/hooks/use-role";
import { useStaffNames } from "@/hooks/use-staff";
import {
  useClinicalNotes,
  useConsultations,
  usePrescriptions,
  type Medicine,
} from "@/hooks/use-clinical";
import { ageFromDob, consultationStatusLabel } from "@/lib/options";

export const Route = createFileRoute("/_authenticated/patient-record/$id")({
  head: () => ({
    meta: [
      { title: "Patient Record — MediScribe AI" },
      {
        name: "description",
        content:
          "Complete patient record: overview, medical history, consultations, clinical notes, prescriptions, reports and follow-ups.",
      },
      { property: "og:title", content: "Patient Record — MediScribe AI" },
      {
        property: "og:description",
        content: "Full clinical and administrative record for a registered patient.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PatientRecordPage,
  errorComponent: () => (
    <EmptyState title="Record unavailable" body="This patient record could not be loaded." />
  ),
  notFoundComponent: () => (
    <EmptyState title="Patient not found" body="Please contact Reception to register the patient." />
  ),
});

function PatientRecordPage() {
  const { id } = Route.useParams();
  const { role } = useRole();
  const canManage = role === "receptionist" || role === "admin";
  const { data: patient, isLoading } = usePatient(id);
  const { data: consultations } = useConsultations();
  const { data: notes } = useClinicalNotes();
  const { data: prescriptions } = usePrescriptions();
  const nameOf = useStaffNames();

  const mine = useMemo(
    () => ({
      consultations: (consultations ?? []).filter((c) => c.patient_id === id),
      notes: (notes ?? []).filter((n) => n.patient_id === id),
      prescriptions: (prescriptions ?? []).filter((p) => p.patient_id === id),
    }),
    [consultations, notes, prescriptions, id],
  );

  const followUps = mine.prescriptions.filter((p) => p.follow_up_date || p.follow_up_note);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!patient)
    return (
      <EmptyState
        title="Patient not found"
        body="Please contact Reception to register this patient."
      />
    );

  const age = ageFromDob(patient.date_of_birth) ?? patient.age;

  return (
    <div className="animate-fade-in space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/patients">
          <ArrowLeft className="size-4" /> Back to patients
        </Link>
      </Button>

      <PageHeader
        title={patient.full_name}
        subtitle={`${patient.uhid ?? "No patient ID"} · ${age != null ? `${age} yrs` : "Age not recorded"} · ${patient.gender || "Gender not recorded"}`}
        action={
          role === "doctor" ? (
            <Button asChild>
              <Link to="/consultations">
                <Stethoscope className="size-4" /> Start consultation
              </Link>
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Medical History</TabsTrigger>
          <TabsTrigger value="consultations">Consultations</TabsTrigger>
          <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="reports">Medical Reports</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="surface-card p-5">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Patient ID (UHID)" value={patient.uhid} />
              <DetailItem label="Full name" value={patient.full_name} />
              <DetailItem label="Age" value={age != null ? `${age} years` : ""} />
              <DetailItem label="Gender" value={patient.gender} />
              <DetailItem label="Blood group" value={patient.blood_group} />
              <DetailItem label="Phone" value={patient.phone} />
              <DetailItem label="Email" value={patient.email} />
              <DetailItem
                label="Address"
                value={[patient.address, patient.city, patient.state, patient.pincode]
                  .filter(Boolean)
                  .join(", ")}
              />
              <DetailItem label="Preferred language" value={patient.preferred_language} />
              <DetailItem label="Occupation" value={patient.occupation} />
              <DetailItem label="Marital status" value={patient.marital_status} />
              <DetailItem
                label="Emergency contact"
                value={[
                  patient.emergency_contact_name,
                  patient.emergency_relationship,
                  patient.emergency_phone,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <DetailItem label="Allergies" value={patient.allergies} />
              <DetailItem label="Existing conditions" value={patient.medical_conditions} />
              <DetailItem label="Current medications" value={patient.current_medications} />
              <DetailItem
                label="Registered on"
                value={new Date(patient.created_at).toLocaleDateString()}
              />
              <DetailItem label="Registered by" value={nameOf(patient.registered_by, "Reception")} />
              <DetailItem
                label="Status"
                value={(patient.status ?? "active") === "active" ? "Active" : "Inactive"}
              />
            </dl>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="surface-card space-y-4 p-5">
            <DetailItem label="Previous medical history" value={patient.medical_history} />
            <DetailItem label="Previous surgeries" value={patient.surgeries} />
            <DetailItem label="Allergies" value={patient.allergies} />
            <DetailItem label="Existing conditions" value={patient.medical_conditions} />
            <DetailItem label="Current medications" value={patient.current_medications} />
          </div>
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
                <p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {c.english_translation || c.transcript || "No transcript recorded."}
                </p>
              </article>
            ))
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4 space-y-3">
          {mine.notes.length === 0 ? (
            <EmptyState
              title="No clinical notes yet"
              body="AI-assisted clinical notes approved by the doctor appear here."
            />
          ) : (
            mine.notes.map((n) => (
              <article key={n.id} className="surface-card space-y-3 p-4">
                <p className="text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </p>
                <DetailItem label="Chief complaint" value={n.chief_complaint} />
                <DetailItem label="Assessment" value={n.assessment} />
                <DetailItem label="Plan" value={n.plan} />
              </article>
            ))
          )}
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-4 space-y-3">
          {mine.prescriptions.length === 0 ? (
            <EmptyState
              title="No prescriptions yet"
              body="Prescriptions issued by the doctor appear here."
            />
          ) : (
            mine.prescriptions.map((p) => (
              <article key={p.id} className="surface-card space-y-3 p-4">
                <p className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleString()}
                </p>
                <DetailItem label="Diagnosis" value={p.diagnosis} />
                <DetailItem
                  label="Medicines"
                  value={((p.medicines as unknown as Medicine[]) ?? [])
                    .map((m) =>
                      [m.name, m.strength, m.dosage, m.frequency, m.duration, m.timing]
                        .filter(Boolean)
                        .join(" — "),
                    )
                    .join("\n")}
                />
                <DetailItem label="Advice" value={p.advice} />
              </article>
            ))
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <ReportManager patientId={patient.id} canManage={canManage} />
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
                  {p.follow_up_date
                    ? new Date(p.follow_up_date).toLocaleDateString()
                    : "Date not set"}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {p.follow_up_note || p.advice || "Review as advised."}
                </p>
              </article>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
