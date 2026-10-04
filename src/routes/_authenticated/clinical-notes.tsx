import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { DoctorOnly } from "@/components/dashboard/role-guards";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { NotebookPen, Trash2, Stethoscope } from "lucide-react";
import { usePatients } from "@/hooks/use-patients";
import {
  useClinicalNotes,
  useDeleteClinicalNote,
  useDoctorProfile,
  useSaveClinicalNote,
  useSavePrescription,
  type ClinicalNote,
  type NoteFields,
} from "@/hooks/use-clinical";
import { downloadSoapNotePdf } from "@/lib/pdf";
import { EmptyState, PageHeader } from "@/components/dashboard/page-parts";
import { SoapCard, SOAP_GROUPS, prescriptionFromNote } from "@/components/clinical/soap-card";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/clinical-notes")({
  head: () => ({
    meta: [
      { title: "Clinical Notes — MediScribe AI" },
      {
        name: "description",
        content: "Review and edit AI-generated SOAP notes for every consultation.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <DoctorOnly area="SOAP note editing">
      <ClinicalNotesPage />
    </DoctorOnly>
  ),
});

function toFields(note: ClinicalNote): NoteFields {
  return {
    chief_complaint: note.chief_complaint,
    history: note.history,
    vitals: note.vitals,
    examination: note.examination,
    other_observations: note.other_observations,
    assessment: note.assessment,
    clinical_impression: note.clinical_impression,
    plan: note.plan,
    medicines: note.medicines,
    lifestyle_advice: note.lifestyle_advice,
    recommended_tests: note.recommended_tests,
    follow_up: note.follow_up,
  };
}

function ClinicalNotesPage() {
  const navigate = useNavigate();
  const { data: notes = [], isLoading } = useClinicalNotes();
  const { data: patients = [] } = usePatients("");
  const { data: profile } = useDoctorProfile();
  const saveNote = useSaveClinicalNote();
  const deleteNote = useDeleteClinicalNote();
  const savePrescription = useSavePrescription();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NoteFields | null>(null);

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? notes[0] ?? null,
    [notes, selectedId],
  );

  useEffect(() => {
    setDraft(selected ? toFields(selected) : null);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const patientName = (id: string) => patients.find((p) => p.id === id)?.full_name ?? "Patient";

  async function save() {
    if (!selected || !draft) return;
    try {
      await saveNote.mutateAsync({ id: selected.id, values: draft });
      toast.success("Clinical note saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the note.");
    }
  }

  async function remove(id: string) {
    try {
      await deleteNote.mutateAsync(id);
      if (selectedId === id) setSelectedId(null);
      toast.success("Note deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the note.");
    }
  }

  function generatePrescription() {
    if (!selected || !draft) return;
    sessionStorage.setItem(
      "mediscribe:prescription-draft",
      JSON.stringify(prescriptionFromNote(draft, selected.patient_id)),
    );
    toast.success("Prescription drafted from this note", {
      description: "Review and edit it before saving.",
    });
    navigate({ to: "/prescriptions" });
  }

  function exportPdf() {
    if (!selected || !draft) return;
    const patient = patients.find((p) => p.id === selected.patient_id);
    downloadSoapNotePdf({
      doctor: profile ?? {},
      patient: {
        name: patient?.full_name ?? "Patient",
        age: patient?.age ?? null,
        gender: patient?.gender ?? null,
        bloodGroup: patient?.blood_group ?? null,
        id: patient?.id ?? null,
      },
      consultedAt: selected.created_at,
      sections: SOAP_GROUPS.map((g) => ({
        letter: g.letter,
        title: g.title,
        fields: g.fields.map((f) => ({ label: f.label, value: draft[f.key] })),
      })),
    });
    toast.success("Note exported as PDF");
  }


  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Clinical Notes"
        subtitle={`${notes.length} SOAP note${notes.length === 1 ? "" : "s"} in your record set.`}
      />

      {notes.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No clinical notes yet"
          body="Record a consultation and generate AI notes — the SOAP documentation will appear here for editing."
          action={
            <Button asChild className="mt-2">
              <Link to="/consultations">
                <Stethoscope className="size-4" /> Start a consultation
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="surface-card max-h-[70vh] space-y-1 overflow-y-auto p-2">
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => setSelectedId(note.id)}
                className={cn(
                  "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                  selected?.id === note.id ? "bg-primary-soft text-primary" : "hover:bg-muted",
                )}
              >
                <p className="truncate text-sm font-semibold">{patientName(note.patient_id)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </button>
            ))}
          </div>

          {draft && selected && (
            <div className="space-y-4">
              <SoapCard
                draft={draft}
                onChange={setDraft}
                onSave={save}
                onGeneratePrescription={generatePrescription}
                onDownloadPdf={exportPdf}
                saving={saveNote.isPending}
                generatingPrescription={savePrescription.isPending}
                subtitle={`${patientName(selected.patient_id)} • ${new Date(selected.created_at).toLocaleString()}`}
              />
              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => remove(selected.id)}>
                  <Trash2 className="size-4" /> Delete note
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
