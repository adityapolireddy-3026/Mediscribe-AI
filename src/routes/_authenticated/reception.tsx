import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, FileText, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/page-parts";
import { RequireRole } from "@/components/dashboard/role-guards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ageFromDob } from "@/lib/options";
import { usePatients } from "@/hooks/use-patients";

export const Route = createFileRoute("/_authenticated/reception")({
  head: () => ({
    meta: [
      { title: "Reception Dashboard — MediScribe AI" },
      {
        name: "description",
        content:
          "Front-desk overview of registered patients, recent registrations and uploaded medical reports at your hospital.",
      },
      { property: "og:title", content: "Reception Dashboard — MediScribe AI" },
      {
        property: "og:description",
        content: "Front-desk overview of patient registrations and medical report uploads.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireRole allow={["receptionist", "admin"]} area="The reception dashboard">
      <ReceptionDashboard />
    </RequireRole>
  ),
});

function ReceptionDashboard() {
  const { data: patients, isLoading } = usePatients();

  const { data: stats } = useQuery({
    queryKey: ["reception-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [{ count: reports }, { count: registeredToday }, { count: consultations }] =
        await Promise.all([
          supabase.from("patient_reports").select("id", { count: "exact", head: true }),
          supabase
            .from("patients")
            .select("id", { count: "exact", head: true })
            .gte("created_at", today.toISOString()),
          supabase.from("consultations").select("id", { count: "exact", head: true }),
        ]);
      return {
        reports: reports ?? 0,
        registeredToday: registeredToday ?? 0,
        consultations: consultations ?? 0,
      };
    },
  });

  const recent = (patients ?? []).slice(0, 8);
  const active = (patients ?? []).filter((p) => (p.status ?? "active") === "active").length;

  const cards = [
    { label: "Registered patients", value: patients?.length, icon: Users },
    { label: "Active patients", value: active, icon: Users },
    { label: "Registered today", value: stats?.registeredToday, icon: UserPlus },
    { label: "Uploaded reports", value: stats?.reports, icon: FileText },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Reception Dashboard"
        subtitle="Register patients, keep their details accurate and attach medical reports to their record."
        action={
          <Button asChild>
            <Link to="/patients">
              <UserPlus className="size-4" /> Register patient
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="surface-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <c.icon className="size-4 text-primary" />
            </div>
            {isLoading ? (
              <Skeleton className="mt-3 h-7 w-16" />
            ) : (
              <p className="mt-2 font-display text-2xl font-extrabold">{c.value ?? 0}</p>
            )}
          </div>
        ))}
      </div>

      <div className="surface-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-display text-base font-extrabold">Recent registrations</h2>
          <Button asChild size="sm" variant="outline">
            <Link to="/patients">View all patients</Link>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Patient ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Age / Gender</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Registered</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs font-semibold text-primary">{p.uhid}</td>
                  <td className="p-3 font-medium">{p.full_name}</td>
                  <td className="p-3 text-muted-foreground">
                    {(ageFromDob(p.date_of_birth) ?? p.age) ?? "—"} · {p.gender || "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">{p.phone || "—"}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/patient-record/$id" params={{ id: p.id }}>
                        Open record
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                    No patients registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <CalendarClock className="size-4" />
          </span>
          <div>
            <p className="font-semibold">Appointments</p>
            <p className="text-sm text-muted-foreground">
              Plan the day and see which patients are waiting for a consultation.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{stats?.consultations ?? 0} consultations recorded</Badge>
          <Button asChild variant="outline">
            <Link to="/appointments">Open appointments</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
