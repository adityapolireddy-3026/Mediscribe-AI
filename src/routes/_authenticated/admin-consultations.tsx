import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Lock, Search, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader } from "@/components/dashboard/page-parts";
import { RequireRole } from "@/components/dashboard/role-guards";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { consultationStatusLabel } from "@/lib/options";

export const Route = createFileRoute("/_authenticated/admin-consultations")({
  head: () => ({
    meta: [
      { title: "Consultation Records — MediScribe AI Admin" },
      {
        name: "description",
        content:
          "Read-only administrator view of consultation records, transcripts and clinical documentation.",
      },
      { property: "og:title", content: "Consultation Records — MediScribe AI Admin" },
      {
        property: "og:description",
        content: "Audit consultation history across all clinicians in read-only mode.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireRole allow={["admin"]} area="Consultation records">
      <AdminConsultationsPage />
    </RequireRole>
  ),
});

type Row = {
  id: string;
  created_at: string;
  duration_seconds: number;
  status: string;
  transcript: string | null;
  original_language: string;
  original_transcript: string | null;
  english_translation: string | null;
  patient: string;
  doctor: string;
  note?: { assessment: string; plan: string; chief_complaint: string } | null;
};

function AdminConsultationsPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Row | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-consultation-records"],
    queryFn: async (): Promise<Row[]> => {
      const [{ data: consultations }, { data: patients }, { data: profiles }, { data: notes }] =
        await Promise.all([
          supabase
            .from("consultations")
            .select(
              "id, created_at, duration_seconds, status, transcript, original_language, original_transcript, english_translation, patient_id, doctor_id",
            )
            .order("created_at", { ascending: false }),
          supabase.from("patients").select("id, full_name"),
          supabase.from("profiles").select("id, full_name, email"),
          supabase
            .from("clinical_notes")
            .select("consultation_id, chief_complaint, assessment, plan"),
        ]);
      return (consultations ?? []).map((c) => {
        const note = (notes ?? []).find((n) => n.consultation_id === c.id);
        const doctor = (profiles ?? []).find((p) => p.id === c.doctor_id);
        return {
          id: c.id,
          created_at: c.created_at,
          duration_seconds: c.duration_seconds ?? 0,
          status: c.status,
          transcript: c.transcript,
          original_language: c.original_language ?? "Unknown",
          original_transcript: c.original_transcript,
          english_translation: c.english_translation,
          patient: (patients ?? []).find((p) => p.id === c.patient_id)?.full_name ?? "Unknown",
          doctor: doctor?.full_name || doctor?.email || "Unknown clinician",
          note: note
            ? {
                chief_complaint: note.chief_complaint,
                assessment: note.assessment,
                plan: note.plan,
              }
            : null,
        };
      });
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      const normalized = r.status === "draft" ? "pending" : r.status;
      if (statusFilter !== "all" && normalized !== statusFilter) return false;
      if (!q) return true;
      return [r.patient, r.doctor, consultationStatusLabel(r.status)].some((v) =>
        v.toLowerCase().includes(q),
      );
    });
  }, [data, search, statusFilter]);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Consultation Records"
        subtitle="Audit trail of every consultation across the hospital."
        action={
          <Badge variant="secondary" className="gap-1">
            <Lock className="size-3" /> Read only
          </Badge>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by patient or doctor…"
          className="pl-9"
        />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No consultation records"
          body="Consultations recorded by clinicians will appear here for review."
        />
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Clinician</th>
                  <th className="p-3">Language</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Status</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="whitespace-nowrap p-3 text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 font-medium">{r.patient}</td>
                    <td className="p-3 text-muted-foreground">{r.doctor}</td>
                    <td className="p-3">
                      <Badge variant="outline">{r.original_language || "Unknown"}</Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {Math.round(r.duration_seconds / 60)} min
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary">{consultationStatusLabel(r.status)}</Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setOpen(r)}>
                        <Eye className="size-4" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Consultation record</DialogTitle>
            <DialogDescription>
              {open ? `${open.patient} • ${open.doctor} • ${new Date(open.created_at).toLocaleString()}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {open?.note && (
              <div className="space-y-3">
                {[
                  { label: "Chief complaint", value: open.note.chief_complaint },
                  { label: "Assessment", value: open.note.assessment },
                  { label: "Plan", value: open.note.plan },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {s.label}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{s.value || "—"}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Original transcript · {open?.original_language || "Unknown"}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                {open?.original_transcript || open?.transcript || "No transcript stored."}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                English translation
              </p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                {open?.english_translation || open?.transcript || "No translation stored."}
              </p>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3" /> Administrators can review but not modify clinical records.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
