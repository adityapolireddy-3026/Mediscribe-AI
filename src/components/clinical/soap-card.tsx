import { useState } from "react";
import { Download, FileText, Loader2, Pencil, Save, Stethoscope } from "lucide-react";
import type { NoteFields } from "@/hooks/use-clinical";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export type SoapField = { key: keyof NoteFields; label: string; hint: string };

export const SOAP_GROUPS: Array<{ title: string; letter: string; fields: SoapField[] }> = [
  {
    title: "Subjective",
    letter: "S",
    fields: [
      { key: "chief_complaint", label: "Chief Complaint", hint: "Why the patient presented today" },
      { key: "history", label: "History of Present Illness", hint: "Onset, duration, progression" },
    ],
  },
  {
    title: "Objective",
    letter: "O",
    fields: [
      { key: "vitals", label: "Vital Signs", hint: "BP, pulse, temp, SpO₂, weight" },
      { key: "examination", label: "Physical Examination", hint: "System-wise findings" },
      {
        key: "other_observations",
        label: "Other Observations",
        hint: "Reports, prior investigations",
      },
    ],
  },
  {
    title: "Assessment",
    letter: "A",
    fields: [
      { key: "assessment", label: "Likely Diagnosis", hint: "Working diagnosis and differentials" },
      {
        key: "clinical_impression",
        label: "Clinical Impression",
        hint: "Severity, risk, reasoning",
      },
    ],
  },
  {
    title: "Plan",
    letter: "P",
    fields: [
      { key: "medicines", label: "Medicines & Dosage", hint: "Drug — dose, frequency, duration" },
      { key: "lifestyle_advice", label: "Lifestyle Advice", hint: "Diet, activity, self-care" },
      {
        key: "recommended_tests",
        label: "Recommended Tests",
        hint: "Investigations, if applicable",
      },
      { key: "follow_up", label: "Follow-up Instructions", hint: "Review interval and red flags" },
    ],
  },
];

export const SOAP_FIELDS: SoapField[] = SOAP_GROUPS.flatMap((g) => g.fields);

export function SoapCard({
  draft,
  onChange,
  onSave,
  onGeneratePrescription,
  onDownloadPdf,
  saving,
  generatingPrescription,
  title = "SOAP Clinical Note",
  subtitle,
  defaultEditing = false,
}: {
  draft: NoteFields;
  onChange: (next: NoteFields) => void;
  onSave: () => void;
  onGeneratePrescription: () => void;
  onDownloadPdf: () => void;
  saving?: boolean;
  generatingPrescription?: boolean;
  title?: string;
  subtitle?: string;
  defaultEditing?: boolean;
}) {
  const [editing, setEditing] = useState(defaultEditing);

  return (
    <section className="surface-card animate-fade-in overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-primary-soft/50 px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold">{title}</h2>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={editing ? "secondary" : "outline"}
            size="sm"
            onClick={() => setEditing((v) => !v)}
          >
            <Pencil className="size-4" /> {editing ? "Done editing" : "Edit"}
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onGeneratePrescription}
            disabled={generatingPrescription}
          >
            {generatingPrescription ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Stethoscope className="size-4" />
            )}
            Generate Prescription
          </Button>
          <Button variant="outline" size="sm" onClick={onDownloadPdf}>
            <Download className="size-4" /> Download PDF
          </Button>
        </div>
      </header>

      <div className="divide-y divide-border/60">
        {SOAP_GROUPS.map((group) => (
          <div key={group.title} className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                {group.letter}
              </span>
              <h3 className="font-display text-sm font-bold">{group.title}</h3>
              <Badge variant="outline" className="ml-auto text-[11px]">
                {group.fields.length} fields
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {group.fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Label className="text-sm font-semibold">{field.label}</Label>
                    <span className="text-[11px] text-muted-foreground">{field.hint}</span>
                  </div>
                  {editing ? (
                    <Textarea
                      value={draft[field.key]}
                      onChange={(e) => onChange({ ...draft, [field.key]: e.target.value })}
                      className="min-h-24 resize-y leading-relaxed"
                      placeholder={`Document the ${field.label.toLowerCase()}…`}
                    />
                  ) : (
                    <p className="min-h-10 whitespace-pre-wrap rounded-lg bg-muted/50 px-3 py-2 text-sm leading-relaxed">
                      {draft[field.key]?.trim() || (
                        <span className="text-muted-foreground">
                          <FileText className="mr-1 inline size-3.5" />
                          Not documented
                        </span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const STRENGTH_RE = /\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|gm|ml|iu|units?|%)(?:\s*\/\s*\S+)?)$/i;
const TIMING_RE =
  /\b(after food|before food|after meals?|before meals?|with food|empty stomach|at bedtime|bedtime|at night|morning|with water)\b/i;

/** Pulls a timing phrase ("After food") out of a free-text fragment. */
function splitTiming(text: string) {
  const match = (text ?? "").match(TIMING_RE);
  if (!match) return { rest: (text ?? "").trim(), timing: "" };
  const timing = match[1]!.replace(/^\w/, (c) => c.toUpperCase());
  const rest = text
    .replace(match[0], "")
    .replace(/\s*[,;–—-]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return { rest, timing };
}

/** Parses AI medicine lines of the form "Name Strength — Dosage — Frequency — Duration — Timing". */
export function parseMedicines(text: string) {
  return (text ?? "")
    .split("\n")
    .map((line) => line.replace(/^\s*[-•*]\s*|^\s*\d+[.)]\s*/, "").trim())
    .filter((line) => line && !/^not documented$/i.test(line))
    .map((line) => {
      const parts = line
        .split(/\s*(?:—|–|\||\t)\s*|\s+-\s+/)
        .map((p) => p.trim())
        .filter(Boolean);
      const head = parts[0] ?? line;
      const match = head.match(STRENGTH_RE);
      const freq = splitTiming(parts[2] ?? "");
      const tail = splitTiming(parts.slice(3).join(" ").trim());
      return {
        name: (match ? head.slice(0, match.index).trim() : head).trim(),
        strength: match?.[1]?.replace(/\s+/g, " ").trim() ?? "",
        dosage: parts[1] ?? "",
        frequency: freq.rest,
        duration: tail.rest,
        timing: freq.timing || tail.timing || "",
      };
    });
}


/** Turns free-text advice/tests into clean one-per-line points. */
export function toLines(text: string) {
  return (text ?? "")
    .split(/\n|;/)
    .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
    .filter((l) => l && !/^not documented$/i.test(l));
}

/** Derives a follow-up date from instructions like "Review after 2 weeks". */
export function followUpDateFromText(text: string, fallbackDays = 7) {
  const source = (text ?? "").toLowerCase();
  const match = source.match(/(\d+)\s*(day|days|week|weeks|month|months)/);
  let days = fallbackDays;
  if (match) {
    const n = Number(match[1]);
    const unit = match[2] ?? "day";
    days = unit.startsWith("week") ? n * 7 : unit.startsWith("month") ? n * 30 : n;
  }
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export type PrescriptionDraft = {
  patient_id: string;
  diagnosis: string;
  advice: string;
  tests: string;
  follow_up_note: string;
  follow_up_date: string;
  medicines: ReturnType<typeof parseMedicines>;
};

/** Single source of truth: builds the prescription payload from a SOAP note. */
export function prescriptionFromNote(note: NoteFields, patientId: string): PrescriptionDraft {
  return {
    patient_id: patientId,
    diagnosis: [note.assessment, note.clinical_impression]
      .map((v) => (v ?? "").trim())
      .filter((v) => v && !/^not documented$/i.test(v))
      .join(" — "),
    advice: toLines(note.lifestyle_advice).join("\n"),
    tests: toLines(note.recommended_tests).join("\n"),
    follow_up_note: toLines(note.follow_up).join("\n"),
    follow_up_date: followUpDateFromText(note.follow_up),
    medicines: parseMedicines(note.medicines),

  };
}
