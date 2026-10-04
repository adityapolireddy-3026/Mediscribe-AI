import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, Pencil, Search, Stethoscope, Trash2, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader } from "@/components/dashboard/page-parts";
import { PatientFormDialog } from "@/components/patients/patient-form";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeletePatient, usePatients, type Patient } from "@/hooks/use-patients";
import { useStaffNames } from "@/hooks/use-staff";
import { useRole } from "@/hooks/use-role";
import { ageFromDob } from "@/lib/options";

export const Route = createFileRoute("/_authenticated/patients")({
  head: () => ({
    meta: [
      { title: "Patient Records — MediScribe AI" },
      {
        name: "description",
        content:
          "Search registered patients by name or patient ID and open the full medical record, reports and consultation history.",
      },
      { property: "og:title", content: "Patient Records — MediScribe AI" },
      {
        property: "og:description",
        content: "Registered patient directory with medical history, reports and consultations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const { role, fullName, isLoading: roleLoading } = useRole();
  const canManage = role === "receptionist" || role === "admin";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Patient | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Patient | null>(null);

  const { data, isLoading } = usePatients(search);
  const del = useDeletePatient();
  const nameOf = useStaffNames();

  const { data: counts } = useQuery({
    queryKey: ["patient-activity-counts"],
    queryFn: async () => {
      const [{ data: consultations }, { data: reports }] = await Promise.all([
        supabase.from("consultations").select("patient_id, doctor_id"),
        supabase.from("patient_reports").select("patient_id"),
      ]);
      const map: Record<string, { consultations: number; reports: number; doctor?: string }> = {};
      for (const c of consultations ?? []) {
        const entry = (map[c.patient_id] ??= { consultations: 0, reports: 0 });
        entry.consultations += 1;
        entry.doctor ??= c.doctor_id ?? undefined;
      }
      for (const r of reports ?? []) {
        const entry = (map[r.patient_id] ??= { consultations: 0, reports: 0 });
        entry.reports += 1;
      }
      return map;
    },
  });

  const rows = useMemo(() => {
    const list = data ?? [];
    if (status === "all") return list;
    return list.filter((p) => (p.status ?? "active") === status);
  }, [data, status]);

  if (roleLoading || isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Patients"
        subtitle={
          canManage
            ? "Register patients, keep administrative details up to date and open the full record."
            : "Search a registered patient to review history, reports and start a consultation."
        }
        action={
          canManage ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <UserPlus className="size-4" /> Add patient
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient ID, name, phone or city…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "Patient not found" : "No patients yet"}
          body={
            canManage
              ? search
                ? "No registered patient matches that search. Check the spelling or register the patient."
                : "Register your first patient to create their record and patient ID."
              : "Patient not found. Please contact Reception to register the patient."
          }
        />
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Patient ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Age / Gender</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Blood group</th>
                  <th className="p-3">Registered</th>
                  <th className="p-3">Activity</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const activity = counts?.[p.id];
                  const age = ageFromDob(p.date_of_birth) ?? p.age;
                  return (
                    <tr key={p.id} className="border-t border-border align-top">
                      <td className="p-3 font-mono text-xs font-semibold text-primary">
                        {p.uhid ?? "—"}
                      </td>
                      <td className="p-3 font-medium">{p.full_name}</td>
                      <td className="p-3 text-muted-foreground">
                        {age != null ? `${age} yrs` : "—"} · {p.gender || "—"}
                      </td>
                      <td className="p-3 text-muted-foreground">{p.phone || "—"}</td>
                      <td className="p-3 text-muted-foreground">{p.blood_group || "—"}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                        <span className="block text-xs">by {nameOf(p.registered_by, "—")}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary">{activity?.consultations ?? 0} visits</Badge>
                          <Badge variant="secondary">{activity?.reports ?? 0} reports</Badge>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={(p.status ?? "active") === "active" ? "default" : "outline"}>
                          {(p.status ?? "active") === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1.5">
                          <Button asChild size="sm" variant="outline">
                            <Link to="/patient-record/$id" params={{ id: p.id }}>
                              <Eye className="size-4" /> View
                            </Link>
                          </Button>
                          {role === "doctor" && (
                            <Button asChild size="sm">
                              <Link to="/consultations">
                                <Stethoscope className="size-4" /> Consult
                              </Link>
                            </Button>
                          )}
                          {canManage && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditing(p);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          )}
                          {role === "admin" && (
                            <Button size="sm" variant="ghost" onClick={() => setPendingDelete(p)}>
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PatientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        patient={editing}
        registeredByName={editing ? nameOf(editing.registered_by, fullName || "Reception") : fullName || "Reception"}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this patient record?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.full_name} ({pendingDelete?.uhid}) and all linked consultations,
              notes, prescriptions and reports will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDelete) return;
                try {
                  await del.mutateAsync(pendingDelete.id);
                  toast.success("Patient record removed");
                } catch {
                  toast.error("Could not remove the patient record");
                }
                setPendingDelete(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
