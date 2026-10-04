import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarClock, Search } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/dashboard/page-parts";
import { RequireRole } from "@/components/dashboard/role-guards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatients } from "@/hooks/use-patients";
import { usePrescriptions } from "@/hooks/use-clinical";

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments — MediScribe AI" },
      {
        name: "description",
        content:
          "Front-desk view of scheduled patient follow-ups, with patient IDs, contact numbers and quick access to each record.",
      },
      { property: "og:title", content: "Appointments — MediScribe AI" },
      {
        property: "og:description",
        content: "Scheduled patient follow-ups and upcoming visits for the front desk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireRole allow={["receptionist", "admin"]} area="Appointments">
      <AppointmentsPage />
    </RequireRole>
  ),
});

function AppointmentsPage() {
  const [search, setSearch] = useState("");
  const { data: patients, isLoading } = usePatients();
  const { data: prescriptions, isLoading: loadingRx } = usePrescriptions();

  const rows = useMemo(() => {
    const byId = new Map((patients ?? []).map((p) => [p.id, p]));
    const q = search.trim().toLowerCase();
    return (prescriptions ?? [])
      .filter((rx) => rx.follow_up_date)
      .map((rx) => ({ rx, patient: byId.get(rx.patient_id) }))
      .filter(({ patient }) => {
        if (!q) return true;
        return [patient?.full_name, patient?.uhid, patient?.phone]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => (a.rx.follow_up_date ?? "").localeCompare(b.rx.follow_up_date ?? ""));
  }, [patients, prescriptions, search]);

  if (isLoading || loadingRx) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Appointments"
        subtitle="Follow-up visits scheduled by clinicians, ordered by date."
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by patient ID, name or phone…"
          className="pl-9"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No follow-ups scheduled"
          body="When a clinician sets a follow-up date on a prescription, the visit appears here."
        />
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Follow-up date</th>
                  <th className="p-3">Patient ID</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Instruction</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ rx, patient }) => (
                  <tr key={rx.id} className="border-t border-border align-top">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {new Date(rx.follow_up_date!).toLocaleDateString()}
                        </span>
                        {rx.follow_up_date! < today ? (
                          <Badge variant="outline">Past</Badge>
                        ) : (
                          <Badge variant="secondary">Upcoming</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs font-semibold text-primary">
                      {patient?.uhid ?? "—"}
                    </td>
                    <td className="p-3 font-medium">{patient?.full_name ?? "Unknown patient"}</td>
                    <td className="p-3 text-muted-foreground">{patient?.phone || "—"}</td>
                    <td className="p-3 max-w-[320px] whitespace-pre-wrap break-words text-muted-foreground">
                      {rx.follow_up_note || "Review as advised."}
                    </td>
                    <td className="p-3 text-right">
                      {patient && (
                        <Button asChild size="sm" variant="outline">
                          <Link to="/patient-record/$id" params={{ id: patient.id }}>
                            Open record
                          </Link>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
