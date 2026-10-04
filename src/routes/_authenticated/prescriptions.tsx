import { createFileRoute } from "@tanstack/react-router";
import { DoctorOnly } from "@/components/dashboard/role-guards";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Pill,
  Plus,
  Trash2,
  Download,
  Loader2,
  Save,
  X,
  Sparkles,
  User,
  CalendarDays,
  FlaskConical,

} from "lucide-react";
import { usePatients } from "@/hooks/use-patients";
import {
  useClinicalNotes,
  useDeletePrescription,
  useDoctorProfile,
  usePrescriptions,
  useSavePrescription,
  type Medicine,
} from "@/hooks/use-clinical";
import {
  prescriptionFromNote,
  followUpDateFromText,
  type PrescriptionDraft,
} from "@/components/clinical/soap-card";

import { downloadPrescriptionPdf } from "@/lib/pdf";
import { EmptyState, PageHeader } from "@/components/dashboard/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/prescriptions")({
  head: () => ({
    meta: [
      { title: "Prescriptions — MediScribe AI" },
      {
        name: "description",
        content: "Build patient prescriptions and export them as clinic-branded PDFs.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <DoctorOnly area="Prescription generation">
      <PrescriptionsPage />
    </DoctorOnly>
  ),
});

const EMPTY_MED: Medicine = {
  name: "",
  strength: "",
  dosage: "",
  frequency: "",
  duration: "",
  timing: "",
};
const DRAFT_KEY = "mediscribe:prescription-draft";
const HOSPITAL_KEY = "mediscribe.hospital-settings";

type HospitalInfo = { name?: string; address?: string; phone?: string };

function readHospital(): HospitalInfo {
  try {
    const raw = localStorage.getItem(HOSPITAL_KEY);
    return raw ? (JSON.parse(raw) as HospitalInfo) : {};
  } catch {
    return {};
  }
}

/** Stable, human-readable prescription number derived from the record. */
function prescriptionNumber(createdAt: string, id: string) {
  const d = new Date(createdAt);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}`;
  return `RX-${stamp}-${id.slice(0, 6).toUpperCase()}`;
}

function suggestFollowUp(days = 5) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}


function PrescriptionsPage() {
  const { data: prescriptions = [], isLoading } = usePrescriptions();
  const { data: patients = [] } = usePatients("");
  const { data: notes = [] } = useClinicalNotes();
  const { data: profile } = useDoctorProfile();
  const savePrescription = useSavePrescription();
  const deletePrescription = useDeletePrescription();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [patientId, setPatientId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [tests, setTests] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([{ ...EMPTY_MED }]);

  const patientOf = (id: string) => patients.find((p) => p.id === id);
  const latestNoteOf = (id: string) => notes.find((n) => n.patient_id === id);
  const selectedPatient = patientOf(patientId);
  const aiNote = latestNoteOf(patientId);

  function applyDraft(draft: PrescriptionDraft) {
    setEditingId(undefined);
    setPatientId(draft.patient_id);
    setDiagnosis(draft.diagnosis);
    setAdvice(draft.advice);
    setTests(draft.tests ?? "");
    setFollowUpNote(draft.follow_up_note ?? "");
    setFollowUp(draft.follow_up_date);
    setMedicines(draft.medicines.length ? draft.medicines : [{ ...EMPTY_MED }]);
    setOpen(true);
  }

  // A note generated on the Consultation page hands over its prescription draft here.
  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    sessionStorage.removeItem(DRAFT_KEY);
    try {
      applyDraft(JSON.parse(raw) as PrescriptionDraft);
      toast.info("Prescription pre-filled from the AI clinical note — edit before saving.");
    } catch {
      /* ignore a malformed draft */
    }
  }, []);

  function openNew() {
    setEditingId(undefined);
    setPatientId("");
    setDiagnosis("");
    setAdvice("");
    setTests("");
    setFollowUpNote("");
    setFollowUp(suggestFollowUp());
    setMedicines([{ ...EMPTY_MED }]);
    setOpen(true);
  }

  function openEdit(id: string) {
    const p = prescriptions.find((x) => x.id === id);
    if (!p) return;
    setEditingId(p.id);
    setPatientId(p.patient_id);
    setDiagnosis(p.diagnosis ?? "");
    setAdvice(p.advice ?? "");
    setTests(p.tests ?? "");
    setFollowUpNote(p.follow_up_note ?? "");
    setFollowUp(p.follow_up_date ?? suggestFollowUp());
    const meds = (p.medicines as unknown as Medicine[]) ?? [];
    setMedicines(meds.length ? meds : [{ ...EMPTY_MED }]);
    setOpen(true);
  }

  function selectPatient(id: string) {
    setPatientId(id);
    const note = latestNoteOf(id);
    if (!note || editingId) return;
    const draft = prescriptionFromNote(note, id);
    if (draft.medicines.length) setMedicines(draft.medicines);
    if (!diagnosis.trim()) setDiagnosis(draft.diagnosis);
    if (!advice.trim()) setAdvice(draft.advice);
    if (!tests.trim()) setTests(draft.tests);
    if (!followUpNote.trim()) setFollowUpNote(draft.follow_up_note);
    if (!followUp) setFollowUp(draft.follow_up_date);
  }

  function fillFromNote() {
    if (!aiNote) return;
    const draft = prescriptionFromNote(aiNote, patientId);
    if (draft.medicines.length) setMedicines(draft.medicines);
    setDiagnosis(draft.diagnosis);
    setAdvice(draft.advice);
    setTests(draft.tests);
    setFollowUpNote(draft.follow_up_note);
    setFollowUp(draft.follow_up_date || followUpDateFromText(aiNote.follow_up ?? ""));
    toast.success("Filled from the latest AI clinical note");
  }


  function bulletAdvice() {
    const lines = advice
      .split("\n")
      .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
      .filter(Boolean)
      .map((l) => `• ${l}`);
    setAdvice(lines.join("\n"));
  }

  async function submit() {
    if (!patientId) return toast.error("Select a patient.");
    if (!medicines.some((m) => m.name.trim())) return toast.error("Add at least one medicine.");
    try {
      await savePrescription.mutateAsync({
        id: editingId,
        values: {
          patient_id: patientId,
          diagnosis,
          advice,
          tests,
          follow_up_note: followUpNote,
          follow_up_date: followUp || null,
          medicines: medicines.filter((m) => m.name.trim()),
        },
      });
      toast.success(
        editingId
          ? `Prescription updated for ${selectedPatient?.full_name ?? "patient"}`
          : `Prescription saved for ${selectedPatient?.full_name ?? "patient"}`,
        { description: "Consultation history and PDF export are up to date." },
      );
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the prescription.");
    }
  }

  function exportPdf(id: string) {
    const p = prescriptions.find((x) => x.id === id);
    if (!p) return;
    const patient = patientOf(p.patient_id);
    downloadPrescriptionPdf({
      doctor: profile ?? {},
      hospital: readHospital(),
      prescriptionNumber: prescriptionNumber(p.created_at, p.id),
      consultedAt: p.created_at,
      patient: {
        name: patient?.full_name ?? "Patient",
        age: patient?.age ?? null,
        gender: patient?.gender ?? null,
        bloodGroup: patient?.blood_group ?? null,
        phone: patient?.phone ?? null,
      },
      diagnosis: p.diagnosis ?? "",
      medicines: (p.medicines as unknown as Medicine[]) ?? [],
      advice: p.advice ?? "",
      tests: p.tests ?? "",
      followUpNote: p.follow_up_note ?? "",
      followUpDate: p.follow_up_date,
    });
    toast.success("Prescription PDF downloaded");
  }


  async function remove(id: string) {
    try {
      await deletePrescription.mutateAsync(id);
      toast.success("Prescription deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete.");
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Prescriptions"
        subtitle="Compose, store and export prescriptions on your clinic letterhead."
        action={
          <Button onClick={openNew}>
            <Plus className="size-4" /> New prescription
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : prescriptions.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No prescriptions yet"
          body="Create your first prescription — medicines, advice and follow-up export straight to a branded PDF."
          action={
            <Button className="mt-2" onClick={openNew}>
              <Plus className="size-4" /> New prescription
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {prescriptions.map((p) => {
            const meds = (p.medicines as unknown as Medicine[]) ?? [];
            return (
              <article key={p.id} className="surface-card animate-fade-in flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-base font-bold">
                      {patientOf(p.patient_id)?.full_name ?? "Patient"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {prescriptionNumber(p.created_at, p.id)} •{" "}
                      {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Pill className="size-4" />
                  </span>
                </div>
                {p.diagnosis && (
                  <p className="whitespace-pre-wrap break-words text-sm">{p.diagnosis}</p>
                )}
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {meds.slice(0, 3).map((m, i) => (
                    <li key={i} className="truncate">
                      • {[m.name, m.strength].filter(Boolean).join(" ")}
                      {m.dosage && ` — ${m.dosage}`}
                      {m.frequency && `, ${m.frequency}`}
                      {m.duration && ` × ${m.duration}`}
                      {m.timing && ` (${m.timing})`}
                    </li>
                  ))}

                  {meds.length > 3 && <li>+ {meds.length - 3} more</li>}
                </ul>
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => exportPdf(p.id)}>
                    <Download className="size-4" /> PDF
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(p.id)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit prescription" : "New prescription"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Patient details */}
            <div className="rounded-xl border border-primary/15 bg-primary-soft/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <User className="size-5" />
                  </span>
                  <div>
                    <p className="font-display text-base font-bold">
                      {selectedPatient?.full_name ?? "No patient selected"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedPatient
                        ? [
                            selectedPatient.age ? `${selectedPatient.age} yrs` : null,
                            selectedPatient.gender,
                            selectedPatient.blood_group,
                          ]
                            .filter(Boolean)
                            .join(" • ") || "Details not recorded"
                        : "Choose a patient to load their clinical details"}
                    </p>
                  </div>
                </div>
                {aiNote && (
                  <Button type="button" size="sm" variant="outline" onClick={fillFromNote}>
                    <Sparkles className="size-4" /> Fill from AI note
                  </Button>
                )}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Patient</Label>
                  <Select value={patientId} onValueChange={selectPatient}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="followUp" className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" /> Follow-up date
                  </Label>
                  <Input
                    id="followUp"
                    type="date"
                    className="bg-background"
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                  />
                  <div className="flex gap-1.5">
                    {[3, 5, 7].map((d) => (
                      <Button
                        key={d}
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => setFollowUp(suggestFollowUp(d))}
                      >
                        +{d} days
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Textarea
                id="diagnosis"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                rows={4}
                placeholder="e.g. Acute bacterial pharyngitis with reactive cervical lymphadenopathy; well-controlled type 2 diabetes mellitus"
                className="min-h-[110px] resize-y whitespace-pre-wrap break-words"
              />
              <p className="text-xs text-muted-foreground">
                The full diagnosis is printed on the prescription — write as many lines as needed.
              </p>
            </div>

            {/* Medicines table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Medicines</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setMedicines([...medicines, { ...EMPTY_MED }])}
                >
                  <Plus className="size-4" /> Add medicine
                </Button>
              </div>

              <div className="overflow-hidden rounded-xl border">
                <div className="hidden grid-cols-[1.6fr_0.8fr_0.8fr_1.1fr_0.8fr_1fr_auto] gap-2 border-b bg-muted/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
                  <span>Medicine</span>
                  <span>Strength</span>
                  <span>Dose</span>
                  <span>Frequency</span>
                  <span>Duration</span>
                  <span>Timing</span>
                  <span className="w-8" />
                </div>
                <div className="divide-y">
                  {medicines.map((m, i) => (
                    <div
                      key={i}
                      className="grid gap-2 p-2 transition-colors hover:bg-muted/30 sm:grid-cols-[1.6fr_0.8fr_0.8fr_1.1fr_0.8fr_1fr_auto] sm:items-center"
                    >
                      {(
                        [
                          ["name", "Paracetamol"],
                          ["strength", "650 mg"],
                          ["dosage", "1 tablet"],
                          ["frequency", "Twice daily"],
                          ["duration", "5 days"],
                          ["timing", "After food"],
                        ] as const
                      ).map(([field, placeholder]) => (
                        <Input
                          key={field}
                          value={m[field] ?? ""}
                          placeholder={placeholder}
                          className="h-9 border-transparent bg-muted/40 focus-visible:border-input focus-visible:bg-background"
                          onChange={(e) => {
                            const next = [...medicines];
                            next[i] = { ...next[i], [field]: e.target.value };
                            setMedicines(next);
                          }}
                        />
                      ))}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Remove medicine"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setMedicines(
                            medicines.length > 1
                              ? medicines.filter((_, idx) => idx !== i)
                              : [{ ...EMPTY_MED }],
                          )
                        }
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="advice">Advice</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={bulletAdvice}
                >
                  Format as bullets
                </Button>
              </div>
              <Textarea
                id="advice"
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder={
                  "Drink plenty of water\nTake adequate rest\nAvoid prolonged standing"
                }
                className="min-h-28"
              />
              <p className="text-xs text-muted-foreground">
                One advice point per line — each line prints as a bullet on the PDF.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tests" className="flex items-center gap-1.5">
                  <FlaskConical className="size-3.5" /> Recommended tests
                </Label>
                <Textarea
                  id="tests"
                  value={tests}
                  onChange={(e) => setTests(e.target.value)}
                  placeholder={"CBC\nSerum creatinine"}
                  className="min-h-24"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to print “No investigations required at present.”
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="followUpNote" className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" /> Follow-up instructions
                </Label>
                <Textarea
                  id="followUpNote"
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="Review after 2 weeks or earlier if symptoms worsen."
                  className="min-h-24"
                />
              </div>
            </div>
          </div>


          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={savePrescription.isPending}>
              {savePrescription.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save prescription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
