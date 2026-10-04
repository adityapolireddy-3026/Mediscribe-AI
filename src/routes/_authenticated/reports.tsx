import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, Download, Users, Stethoscope, NotebookPen, Pill, Search } from "lucide-react";
import { usePatients } from "@/hooks/use-patients";
import {
  useClinicalNotes,
  useConsultations,
  useDoctorProfile,
  usePrescriptions,
  type Medicine,
} from "@/hooks/use-clinical";
import { downloadReportPdf } from "@/lib/pdf";
import { EmptyState, PageHeader } from "@/components/dashboard/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — MediScribe AI" },
      {
        name: "description",
        content: "Patient summaries, consultation history and downloadable clinical reports.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data: patients = [], isLoading } = usePatients("");
  const { data: consultations = [] } = useConsultations();
  const { data: notes = [] } = useClinicalNotes();
  const { data: prescriptions = [] } = usePrescriptions();
  const { data: profile } = useDoctorProfile();
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients
      .filter((p) => !q || p.full_name.toLowerCase().includes(q))
      .map((p) => ({
        patient: p,
        consultations: consultations.filter((c) => c.patient_id === p.id),
        notes: notes.filter((n) => n.patient_id === p.id),
        prescriptions: prescriptions.filter((x) => x.patient_id === p.id),
      }));
  }, [patients, consultations, notes, prescriptions, search]);

  const stats = [
    { label: "Patients", value: patients.length, icon: Users },
    { label: "Consultations", value: consultations.length, icon: Stethoscope },
    { label: "Clinical notes", value: notes.length, icon: NotebookPen },
    { label: "Prescriptions", value: prescriptions.length, icon: Pill },
  ];

  function exportPatient(row: (typeof rows)[number]) {
    const latestNote = row.notes[0];
    const latestRx = row.prescriptions[0];
    const meds = ((latestRx?.medicines as unknown as Medicine[]) ?? [])
      .map((m) => `${m.name} — ${[m.dosage, m.frequency, m.duration].filter(Boolean).join(" | ")}`)
      .join("\n");

    downloadReportPdf({
      doctor: profile ?? {},
      title: "Patient Summary Report",
      patientName: row.patient.full_name,
      patientMeta: [
        row.patient.age ? `${row.patient.age} yrs` : null,
        row.patient.gender,
        row.patient.blood_group,
        row.patient.phone,
      ]
        .filter(Boolean)
        .join(" • "),
      sections: [
        { label: "Allergies", value: row.patient.allergies ?? "" },
        { label: "Medical history", value: row.patient.medical_history ?? "" },
        {
          label: "Consultation history",
          value:
            row.consultations
              .map(
                (c) =>
                  `${new Date(c.created_at).toLocaleString()} — ${Math.round((c.duration_seconds ?? 0) / 60)} min`,
              )
              .join("\n") || "No consultations recorded",
        },
        { label: "Latest assessment", value: latestNote?.assessment ?? "" },
        { label: "Latest plan", value: latestNote?.plan ?? "" },
        { label: "Current medicines", value: meds },
      ],
    });
    toast.success(`Report downloaded for ${row.patient.full_name}`);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Patient summaries, consultation history and one-click clinical reports."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="surface-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <s.icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-extrabold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patients…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No patient reports yet"
          body="Add patients and record consultations — summary reports become available here instantly."
          action={
            <Button asChild className="mt-2">
              <Link to="/patients">
                <Users className="size-4" /> Manage patients
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article
              key={row.patient.id}
              className="surface-card animate-fade-in grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-5 sm:flex sm:flex-wrap sm:justify-between"
            >
              <div className="min-w-0">
                <h3 className="truncate font-display text-base font-bold">
                  {row.patient.full_name}
                </h3>
                <p className="truncate text-xs text-muted-foreground">
                  {[row.patient.age ? `${row.patient.age} yrs` : null, row.patient.gender]
                    .filter(Boolean)
                    .join(" • ") || "No demographics"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">{row.consultations.length} consultations</Badge>
                  <Badge variant="secondary">{row.notes.length} notes</Badge>
                  <Badge variant="secondary">{row.prescriptions.length} prescriptions</Badge>
                </div>
              </div>
              <Button variant="outline" onClick={() => exportPatient(row)}>
                <Download className="size-4" /> Download report
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
