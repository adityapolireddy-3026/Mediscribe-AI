import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  ConciergeBell,
  FileText,
  NotebookPen,
  Pill,
  Stethoscope,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/page-parts";
import { RequireRole } from "@/components/dashboard/role-guards";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — MediScribe AI" },
      {
        name: "description",
        content:
          "Administrator overview of doctors, receptionists, patients, consultations, documentation and pending follow-ups across MediScribe AI.",
      },
      { property: "og:title", content: "Admin Dashboard — MediScribe AI" },
      {
        property: "og:description",
        content: "Platform-wide staff, patient and documentation metrics for administrators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireRole allow={["admin"]} area="The admin dashboard">
      <AdminDashboard />
    </RequireRole>
  ),
});

function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [
        { data: roles },
        { data: profiles },
        { count: patients },
        { data: consultations },
        { count: notes },
        { count: prescriptions },
        { count: reports },
        { count: followUps },
      ] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("id, status"),
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("consultations").select("status"),
        supabase.from("clinical_notes").select("id", { count: "exact", head: true }),
        supabase.from("prescriptions").select("id", { count: "exact", head: true }),
        supabase.from("patient_reports").select("id", { count: "exact", head: true }),
        supabase
          .from("prescriptions")
          .select("id", { count: "exact", head: true })
          .gte("follow_up_date", today),
      ]);

      const statusById = new Map((profiles ?? []).map((p) => [p.id, p.status ?? "active"]));
      const idsWith = (role: string) =>
        (roles ?? []).filter((r) => r.role === role).map((r) => r.user_id as string);
      const doctorIds = idsWith("doctor");
      const receptionIds = idsWith("receptionist");
      const countStatus = (status: string) =>
        (consultations ?? []).filter((c) => {
          const value = c.status === "draft" ? "pending" : c.status;
          return value === status;
        }).length;

      return {
        doctors: doctorIds.length,
        activeDoctors: doctorIds.filter((id) => statusById.get(id) !== "inactive").length,
        receptionists: receptionIds.length,
        activeReceptionists: receptionIds.filter((id) => statusById.get(id) !== "inactive").length,
        patients: patients ?? 0,
        consultations: (consultations ?? []).length,
        pending: countStatus("pending"),
        inProgress: countStatus("in_progress"),
        completed: countStatus("completed"),
        approved: countStatus("approved"),
        notes: notes ?? 0,
        prescriptions: prescriptions ?? 0,
        reports: reports ?? 0,
        followUps: followUps ?? 0,
      };
    },
  });

  const cards = [
    {
      label: "Doctors",
      value: stats?.doctors,
      hint: `${stats?.activeDoctors ?? 0} active`,
      icon: Stethoscope,
    },
    {
      label: "Receptionists",
      value: stats?.receptionists,
      hint: `${stats?.activeReceptionists ?? 0} active`,
      icon: ConciergeBell,
    },
    { label: "Patients", value: stats?.patients, hint: "registered", icon: Users },
    {
      label: "Consultations",
      value: stats?.consultations,
      hint: `${stats?.approved ?? 0} approved`,
      icon: NotebookPen,
    },
    { label: "Clinical notes", value: stats?.notes, hint: "documented", icon: NotebookPen },
    { label: "Prescriptions", value: stats?.prescriptions, hint: "issued", icon: Pill },
    { label: "Medical reports", value: stats?.reports, hint: "uploaded", icon: FileText },
    {
      label: "Pending follow-ups",
      value: stats?.followUps,
      hint: "upcoming",
      icon: CalendarClock,
    },
  ];

  const pipeline = [
    { label: "Pending", value: stats?.pending },
    { label: "In Progress", value: stats?.inProgress },
    { label: "Completed", value: stats?.completed },
    { label: "Approved", value: stats?.approved },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Platform-wide activity across all staff, patients and clinical documentation."
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
              <>
                <p className="mt-2 font-display text-2xl font-extrabold">{c.value ?? 0}</p>
                <p className="text-xs text-muted-foreground">{c.hint}</p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-extrabold">Consultation pipeline</h2>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin-consultations">View consultation records</Link>
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {pipeline.map((p) => (
            <Badge key={p.label} variant="secondary" className="text-sm">
              {p.label}: {p.value ?? 0}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Button asChild variant="outline" className="h-auto justify-start p-5">
          <Link to="/admin-doctors">
            <Stethoscope className="size-4" /> Manage doctors
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start p-5">
          <Link to="/admin-receptionists">
            <ConciergeBell className="size-4" /> Manage receptionists
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start p-5">
          <Link to="/patients">
            <Users className="size-4" /> All patient records
          </Link>
        </Button>
      </div>
    </div>
  );
}
