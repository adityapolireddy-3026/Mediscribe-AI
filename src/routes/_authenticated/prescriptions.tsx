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
  Eye,
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

import { downloadPrescriptionPdf, type PrescriptionPdfInput } from "@/lib/pdf";
import { downloadPrescriptionHtmlPdf } from "@/lib/prescription-pdf-exporter";
import {
  PrescriptionPreviewDialog,
  type PrescriptionData,
} from "@/components/prescriptions/prescription-preview-dialog";
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
  const [previewData, setPreviewData] = useState<PrescriptionData | null>(null);

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

  function viewPrescription(id: string) {
    const p = prescriptions.find((x) => x.id === id);
    if (!p) return;
    const patient = patientOf(p.patient_id);
    const note = latestNoteOf(p.patient_id);
    setPreviewData({
      prescriptionNumber: prescriptionNumber(p.created_at, p.id),
      createdAt: p.created_at,
      consultedAt: p.created_at,
      doctor: profile ?? {
        full_name: "Dr. R. Anil Kumar",
        qualification: "MBBS, MD (General Medicine)",
        specialty: "Consultant Physician",
        registration_number: "AP/MC/78945",
      },
      patient: patient ?? {
        full_name: "Mr. K. Suresh",
        uhid: "GMRVCH25004567",
        date_of_birth: "1997-03-12",
        age: 28,
        gender: "Male",
        phone: "+91 98765 43210",
        address: "Dwarakanagar, Visakhapatnam – 530016",
        blood_group: "O+",
        allergies: "No known allergies",
      },
      clinical: {
        chiefComplaint: note?.chief_complaint || "Fever, cough and headache since 3 days.",
        clinicalFindings:
          [note?.vitals, note?.examination].filter(Boolean).join(", ") ||
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

  function previewLiveDraft() {
    setPreviewData({
      prescriptionNumber: editingId
        ? prescriptionNumber(new Date().toISOString(), editingId)
        : `RX-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-NEW`,
      createdAt: new Date(),
      consultedAt: new Date(),
      doctor: profile ?? {
        full_name: "Dr. R. Anil Kumar",
        qualification: "MBBS, MD (General Medicine)",
        specialty: "Consultant Physician",
        registration_number: "AP/MC/78945",
      },
      patient: selectedPatient ?? {
        full_name: "Mr. K. Suresh",
        uhid: "GMRVCH25004567",
        date_of_birth: "1997-03-12",
        age: 28,
        gender: "Male",
        phone: "+91 98765 43210",
        address: "Dwarakanagar, Visakhapatnam – 530016",
        blood_group: "O+",
        allergies: "No known allergies",
      },
      clinical: {
        chiefComplaint: aiNote?.chief_complaint || "Fever, cough and headache since 3 days.",
        clinicalFindings:
          [aiNote?.vitals, aiNote?.examination].filter(Boolean).join(", ") ||
          "Mild fever (100.4°F), throat congestion, normal BP, no breathlessness.",
        weight: "72 kg",
      },
      diagnosis: diagnosis || "Acute Upper Respiratory Tract Infection (URTI)",
      advice: advice || "",
      tests: tests || "",
      followUpDate: followUp || null,
      followUpNote: followUpNote || "",
      medicines: medicines.filter((m) => m.name.trim()),
      status: "Approved",
    });
  }

  function previewOfficialTemplate() {
    setPreviewData({
      prescriptionNumber: "RX250922001",
      createdAt: new Date("2025-09-22T10:30:00"),
      consultedAt: new Date("2025-09-22T10:30:00"),
      doctor: profile ?? {
        full_name: "Dr. R. Anil Kumar",
        qualification: "MBBS, MD (General Medicine)",
        specialty: "Consultant Physician",
        registration_number: "AP/MC/78945",
      },
      patient: {
        full_name: "Mr. K. Suresh",
        uhid: "GMRVCH25004567",
        date_of_birth: "1997-03-12",
        age: 28,
        gender: "Male",
        phone: "+91 98765 43210",
        address: "Dwarakanagar, Visakhapatnam – 530016",
        blood_group: "O+",
        allergies: "No known allergies",
      },
      clinical: {
        chiefComplaint: "Fever, cough and headache since 3 days.",
        clinicalFindings: "Mild fever (100.4°F), throat congestion, normal BP, no breathlessness.",
        weight: "72 kg",
      },
      diagnosis: "Acute Upper Respiratory Tract Infection (URTI)",
      advice:
        "Take medications as prescribed. Maintain hydration and rest.\nTake plenty of fluids.\nGet adequate rest.\nUse a mask and avoid exposure to dust/pollution.\nConsult immediately if symptoms worsen or persist beyond 5 days.",
      tests: "Complete Blood Count (CBC)\nChest X-Ray (PA view)\nCRP (C-Reactive Protein)",
      followUpDate: "2025-09-28",
      followUpNote: "Review with reports or earlier if symptoms persist.",
      medicines: [
        {
          name: "Paracetamol 650 mg",
          dosage: "650 mg",
          route: "Oral",
          frequency: "1-1-1",
          duration: "3 Days",
          timing: "After food",
        },
        {
          name: "Azithromycin 500 mg",
          dosage: "500 mg",
          route: "Oral",
          frequency: "1-0-0",
          duration: "5 Days",
          timing: "After food",
        },
        {
          name: "Levocetirizine 5 mg",
          dosage: "5 mg",
          route: "Oral",
          frequency: "0-0-1",
          duration: "5 Days",
          timing: "At night",
        },
        {
          name: "Dextromethorphan Syrup",
          dosage: "10 ml",
          route: "Oral",
          frequency: "1-1-1",
          duration: "5 Days",
          timing: "After food",
        },
      ],
      status: "Approved",
      isSample: true,
    });
  }

  async function exportPdf(id: string) {
    const p = prescriptions.find((x) => x.id === id);
    if (!p) return;
    const patient = patientOf(p.patient_id);
    const note = latestNoteOf(p.patient_id);
    const rxNo = prescriptionNumber(p.created_at, p.id);

    const fallbackInput: PrescriptionPdfInput = {
      doctor: {
        full_name: profile?.full_name ?? "Dr. R. Anil Kumar",
        specialty: profile?.specialty ?? "Consultant Physician",
        qualification: profile?.qualification ?? "MBBS, MD (General Medicine)",
        registration_number: profile?.registration_number ?? "AP/MC/78945",
        hospital: "GMR Varalakshmi CARE Hospital",
      },
      hospital: readHospital(),
      prescriptionNumber: rxNo,
      consultedAt: p.created_at,
      patient: {
        name: patient?.full_name ?? "Mr. K. Suresh",
        uhid: patient?.uhid ?? `GMRVCH${p.id.slice(0, 8).toUpperCase()}`,
        dob: patient?.date_of_birth ?? null,
        age: patient?.age ?? "28",
        gender: patient?.gender ?? "Male",
        bloodGroup: patient?.blood_group ?? "O+",
        phone: patient?.phone ?? "+91 98765 43210",
        address:
          [patient?.address, patient?.city, patient?.state, patient?.pincode]
            .filter(Boolean)
            .join(", ") || "Dwarakanagar, Visakhapatnam – 530016",
        weight: "72 kg",
        allergies: patient?.allergies ?? "No known allergies",
      },
      clinical: {
        chiefComplaint: note?.chief_complaint || "Fever, cough and headache since 3 days.",
        clinicalFindings:
          [note?.vitals, note?.examination].filter(Boolean).join(", ") ||
          "Mild fever (100.4°F), throat congestion, normal BP, no breathlessness.",
      },
      diagnosis: p.diagnosis ?? "Acute Upper Respiratory Tract Infection (URTI)",
      medicines: (p.medicines as unknown as Medicine[]) ?? [],
      advice: p.advice ?? "",
      tests: p.tests ?? "",
      followUpNote: p.follow_up_note ?? "",
      followUpDate: p.follow_up_date,
    };

    const templateData: PrescriptionData = {
      prescriptionNumber: rxNo,
      createdAt: p.created_at,
      consultedAt: p.created_at,
      doctor: fallbackInput.doctor,
      patient,
      clinical: {
        chiefComplaint: fallbackInput.clinical?.chiefComplaint,
        clinicalFindings: fallbackInput.clinical?.clinicalFindings,
        weight: fallbackInput.patient.weight,
      },
      diagnosis: fallbackInput.diagnosis,
      medicines: fallbackInput.medicines,
      advice: fallbackInput.advice,
      tests: fallbackInput.tests,
      followUpNote: fallbackInput.followUpNote,
      followUpDate: fallbackInput.followUpDate,
      status: "Approved",
    };

    try {
      toast.info("Generating official prescription PDF...");
      await downloadPrescriptionHtmlPdf(templateData, fallbackInput);
      toast.success("Prescription PDF downloaded successfully");
    } catch {
      downloadPrescriptionPdf(fallbackInput);
      toast.success("Prescription PDF downloaded successfully");
    }
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
        subtitle="Compose, store and export official hospital prescriptions on GMR Varalakshmi CARE Hospital letterhead."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={previewOfficialTemplate}>
              <Eye className="size-4" /> Hospital Template
            </Button>
            <Button onClick={openNew}>
              <Plus className="size-4" /> New prescription
            </Button>
          </div>
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
          body="Create your first prescription or preview the official hospital template."
          action={
            <div className="mt-2 flex flex-wrap gap-2">
              <Button onClick={openNew}>
                <Plus className="size-4" /> New prescription
              </Button>
              <Button variant="outline" onClick={previewOfficialTemplate}>
                <Eye className="size-4" /> Preview Hospital Template
              </Button>
            </div>
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
                  <Button
                    size="sm"
                    onClick={() => viewPrescription(p.id)}
                    className="bg-[#1b3a6b] hover:bg-[#14294c] text-white"
                  >
                    <Eye className="size-4" /> View / Print
                  </Button>
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


          <DialogFooter className="flex-wrap items-center justify-between gap-2 sm:justify-between">
            <Button type="button" variant="outline" size="sm" onClick={previewLiveDraft}>
              <Eye className="size-4" /> Live Template Preview
            </Button>
            <div className="flex gap-2">
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
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PrescriptionPreviewDialog
        open={Boolean(previewData)}
        onOpenChange={(v) => !v && setPreviewData(null)}
        data={previewData}
        onEdit={() => {
          if (previewData) {
            const found = prescriptions.find(
              (x) => prescriptionNumber(x.created_at, x.id) === previewData.prescriptionNumber,
            );
            if (found) openEdit(found.id);
          }
        }}
      />
    </div>
  );
}
