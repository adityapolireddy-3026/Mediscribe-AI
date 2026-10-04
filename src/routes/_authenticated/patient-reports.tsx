import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Eye, FileText, Search } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/dashboard/page-parts";
import { RequireRole } from "@/components/dashboard/role-guards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REPORT_TYPES } from "@/lib/options";
import { reportUrl, usePatientReports } from "@/hooks/use-reports";
import { usePatients } from "@/hooks/use-patients";
import { useStaffNames } from "@/hooks/use-staff";

export const Route = createFileRoute("/_authenticated/patient-reports")({
  head: () => ({
    meta: [
      { title: "Patient Reports — MediScribe AI" },
      {
        name: "description",
        content:
          "All uploaded patient medical reports — lab results, scans and discharge summaries — searchable by patient ID, name or report type.",
      },
      { property: "og:title", content: "Patient Reports — MediScribe AI" },
      {
        property: "og:description",
        content: "Searchable archive of uploaded patient medical reports and scans.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireRole allow={["receptionist", "admin"]} area="The patient reports archive">
      <PatientReportsPage />
    </RequireRole>
  ),
});

function PatientReportsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const { data: reports, isLoading } = usePatientReports();
  const { data: patients } = usePatients();
  const nameOf = useStaffNames();

  const rows = useMemo(() => {
    const byId = new Map((patients ?? []).map((p) => [p.id, p]));
    const q = search.trim().toLowerCase();
    return (reports ?? [])
      .map((r) => ({ r, patient: byId.get(r.patient_id) }))
      .filter(({ r, patient }) => {
        if (type !== "all" && r.report_type !== type) return false;
        if (!q) return true;
        return [r.report_name, r.hospital_lab, patient?.full_name, patient?.uhid]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      });
  }, [reports, patients, search, type]);

  async function openFile(path: string, download: boolean) {
    try {
      const url = await reportUrl(path, download);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Could not open the report file");
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Patient Reports"
        subtitle="Every report uploaded to a patient record. Open a patient to add a new report."
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient ID, name, report or lab…"
            className="pl-9"
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All report types</SelectItem>
            {REPORT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports found"
          body="Open a patient record and use Upload report to attach lab results, scans or summaries."
        />
      ) : (
        <div className="space-y-3">
          {rows.map(({ r, patient }) => (
            <article key={r.id} className="surface-card flex flex-wrap items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold">{r.report_name}</h3>
                  <Badge variant="secondary">{r.report_type}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {patient ? `${patient.uhid} · ${patient.full_name}` : "Unknown patient"}
                  {r.report_date ? ` · ${new Date(r.report_date).toLocaleDateString()}` : ""}
                  {r.hospital_lab ? ` · ${r.hospital_lab}` : ""}
                  {` · uploaded by ${nameOf(r.uploaded_by, "reception")}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => openFile(r.file_path, false)}>
                  <Eye className="size-4" /> View
                </Button>
                <Button size="sm" variant="outline" onClick={() => openFile(r.file_path, true)}>
                  <Download className="size-4" /> Download
                </Button>
                {patient && (
                  <Button asChild size="sm">
                    <Link to="/patient-record/$id" params={{ id: patient.id }}>
                      Record
                    </Link>
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
