import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, Pencil, Power, Search, Trash2, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader } from "@/components/dashboard/page-parts";
import {
  AreaField,
  DetailItem,
  FormSection,
  SelectField,
  TextField,
} from "@/components/dashboard/form-fields";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACCOUNT_STATUSES,
  DEPARTMENTS,
  GENDERS,
  SHIFTS,
  SPECIALIZATIONS,
} from "@/lib/options";
import { useStaff, useStaffMutations, type StaffMember } from "@/hooks/use-staff";
import type { StaffProfileInput } from "@/lib/staff.functions";

type Kind = "doctor" | "receptionist";

const emptyForm: StaffProfileInput = {
  full_name: "",
  email: "",
  phone: "",
  gender: "",
  date_of_birth: null,
  address: "",
  specialty: "",
  registration_number: "",
  qualification: "",
  experience_years: null,
  department: "",
  hospital: "",
  branch: "",
  employee_id: "",
  shift: "",
  joining_date: null,
  status: "active",
};

function toForm(member: StaffMember): StaffProfileInput {
  return {
    full_name: member.full_name ?? "",
    email: member.email ?? "",
    phone: member.phone ?? "",
    gender: member.gender ?? "",
    date_of_birth: member.date_of_birth ?? null,
    address: member.address ?? "",
    specialty: member.specialty ?? "",
    registration_number: member.registration_number ?? "",
    qualification: member.qualification ?? "",
    experience_years: member.experience_years ?? null,
    department: member.department ?? "",
    hospital: member.hospital ?? "",
    branch: member.branch ?? "",
    employee_id: member.employee_id ?? "",
    shift: member.shift ?? "",
    joining_date: member.joining_date ?? null,
    status: member.status ?? "active",
  };
}

/** Admin-only create/edit/view/activate/remove screen for doctors and receptionists. */
export function StaffManager({ kind }: { kind: Kind }) {
  const isDoctor = kind === "doctor";
  const { data, isLoading } = useStaff(kind);
  const { create, update, setStatus, remove } = useStaffMutations(kind);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [viewing, setViewing] = useState<StaffMember | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<StaffProfileInput>(emptyForm);
  const [password, setPassword] = useState("");

  const { data: hospital } = useQuery({
    queryKey: ["hospital-default"],
    queryFn: async () => {
      const { data: rows } = await supabase.from("profiles").select("hospital").limit(20);
      return rows?.find((r) => r.hospital)?.hospital ?? "";
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((m) => {
      if (statusFilter !== "all" && (m.status ?? "active") !== statusFilter) return false;
      if (groupFilter !== "all") {
        const value = isDoctor ? m.specialty : m.department;
        if ((value ?? "") !== groupFilter) return false;
      }
      if (!q) return true;
      return [m.full_name, m.email, m.specialty, m.department, m.employee_id, m.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, search, statusFilter, groupFilter, isDoctor]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, hospital: hospital ?? "" });
    setPassword("");
    setFormOpen(true);
  }

  function openEdit(member: StaffMember) {
    setEditing(member);
    setForm(toForm(member));
    setPassword("");
    setFormOpen(true);
  }

  const set = <K extends keyof StaffProfileInput>(key: K, value: StaffProfileInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error("Full name is required");
    if (!form.email.trim()) return toast.error("Email is required");
    if (!editing && !password.trim())
      return toast.error("Set a temporary password");
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          profile: form,
          password: password.trim() ? password.trim() : null,
        });
        toast.success("Account updated");
      } else {
        await create.mutateAsync({ password: password.trim(), profile: form });
        toast.success(`${isDoctor ? "Doctor" : "Receptionist"} account created`);
      }
      setFormOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the account");
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const groupOptions = isDoctor ? SPECIALIZATIONS : DEPARTMENTS;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={isDoctor ? "Doctors" : "Receptionists"}
        subtitle={
          isDoctor
            ? "Create and manage clinician accounts. Doctors sign in with the credentials you set here."
            : "Create and manage front-desk accounts responsible for patient registration and reports."
        }
        action={
          <Button onClick={openCreate}>
            <UserPlus className="size-4" /> Add {isDoctor ? "doctor" : "receptionist"}
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or ID…"
            className="pl-9"
          />
        </div>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={isDoctor ? "All specializations" : "All departments"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {isDoctor ? "All specializations" : "All departments"}
            </SelectItem>
            {groupOptions.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
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
          title={`No ${isDoctor ? "doctors" : "receptionists"} found`}
          body={`Create an account to let ${isDoctor ? "a clinician" : "a receptionist"} sign in to MediScribe AI.`}
        />
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">{isDoctor ? "Specialization" : "Employee ID"}</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">{isDoctor ? "Activity" : "Shift"}</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="p-3 font-medium">{m.full_name || "—"}</td>
                    <td className="p-3 text-muted-foreground">{m.email}</td>
                    <td className="p-3 text-muted-foreground">
                      {(isDoctor ? m.specialty : m.employee_id) || "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">{m.department || "—"}</td>
                    <td className="p-3">
                      {isDoctor ? (
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary">{m.patients} patients</Badge>
                          <Badge variant="secondary">{m.consultations} visits</Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{m.shift || "—"}</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant={(m.status ?? "active") === "active" ? "default" : "outline"}>
                        {(m.status ?? "active") === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => setViewing(m)}>
                          <Eye className="size-4" /> Details
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(m)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title={(m.status ?? "active") === "active" ? "Deactivate" : "Activate"}
                          onClick={async () => {
                            const next = (m.status ?? "active") === "active" ? "inactive" : "active";
                            try {
                              await setStatus.mutateAsync({ id: m.id, status: next });
                              toast.success(
                                next === "active" ? "Account activated" : "Account deactivated",
                              );
                            } catch (err) {
                              toast.error(
                                err instanceof Error ? err.message : "Could not change status",
                              );
                            }
                          }}
                        >
                          <Power className="size-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setPendingDelete(m)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit" : "Add"} {isDoctor ? "doctor" : "receptionist"}
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-6" onSubmit={submit}>
            <FormSection title="Personal details">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <TextField
                  label="Full name"
                  required
                  value={form.full_name}
                  onChange={(v) => set("full_name", v)}
                />
                <SelectField
                  label="Gender"
                  value={form.gender ?? ""}
                  onChange={(v) => set("gender", v)}
                  options={GENDERS}
                />
                <TextField
                  label="Date of birth"
                  type="date"
                  value={form.date_of_birth ?? ""}
                  onChange={(v) => set("date_of_birth", v || null)}
                />
                <TextField
                  label="Phone"
                  value={form.phone ?? ""}
                  onChange={(v) => set("phone", v)}
                />
                <TextField
                  label="Email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(v) => set("email", v)}
                  disabled={!!editing}
                  hint={editing ? "Sign-in email cannot be changed" : undefined}
                />
              </div>
              {!isDoctor && (
                <AreaField
                  label="Address"
                  value={form.address ?? ""}
                  onChange={(v) => set("address", v)}
                />
              )}
            </FormSection>

            {isDoctor ? (
              <FormSection title="Professional details">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <SelectField
                    label="Specialization"
                    value={form.specialty ?? ""}
                    onChange={(v) => set("specialty", v)}
                    options={SPECIALIZATIONS}
                  />
                  <TextField
                    label="Registration number"
                    value={form.registration_number ?? ""}
                    onChange={(v) => set("registration_number", v)}
                  />
                  <TextField
                    label="Qualification"
                    value={form.qualification ?? ""}
                    onChange={(v) => set("qualification", v)}
                    placeholder="e.g. MBBS, MD"
                  />
                  <TextField
                    label="Years of experience"
                    type="number"
                    value={form.experience_years != null ? String(form.experience_years) : ""}
                    onChange={(v) => set("experience_years", v === "" ? null : Number(v))}
                  />
                  <SelectField
                    label="Department"
                    value={form.department ?? ""}
                    onChange={(v) => set("department", v)}
                    options={DEPARTMENTS}
                  />
                  <TextField
                    label="Joining date"
                    type="date"
                    value={form.joining_date ?? ""}
                    onChange={(v) => set("joining_date", v || null)}
                  />
                </div>
              </FormSection>
            ) : (
              <FormSection title="Employment details">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <TextField
                    label="Employee ID"
                    value={form.employee_id ?? ""}
                    onChange={(v) => set("employee_id", v)}
                  />
                  <SelectField
                    label="Department"
                    value={form.department ?? ""}
                    onChange={(v) => set("department", v)}
                    options={DEPARTMENTS}
                  />
                  <TextField
                    label="Joining date"
                    type="date"
                    value={form.joining_date ?? ""}
                    onChange={(v) => set("joining_date", v || null)}
                  />
                  <SelectField
                    label="Shift"
                    value={form.shift ?? ""}
                    onChange={(v) => set("shift", v)}
                    options={SHIFTS}
                  />
                </div>
              </FormSection>
            )}

            <FormSection title="Hospital details">
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField
                  label="Hospital / Clinic name"
                  value={form.hospital ?? ""}
                  onChange={(v) => set("hospital", v)}
                />
                <TextField
                  label="Branch"
                  value={form.branch ?? ""}
                  onChange={(v) => set("branch", v)}
                />
              </div>
            </FormSection>

            <FormSection title="Account">
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField
                  label={editing ? "Reset password" : "Temporary password"}
                  type="text"
                  value={password}
                  onChange={setPassword}
                  required={!editing}
                  hint={
                    editing
                      ? "Leave blank to keep the current password"
                      : "Share this with the staff member for first sign-in"
                  }
                />
                <SelectField
                  label="Account status"
                  value={form.status ?? "active"}
                  onChange={(v) => set("status", v)}
                  options={ACCOUNT_STATUSES}
                  labelFor={(o) => (o === "active" ? "Active" : "Inactive")}
                />
              </div>
            </FormSection>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {create.isPending || update.isPending
                  ? "Saving…"
                  : editing
                    ? "Save changes"
                    : "Create account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View details */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewing?.full_name || "Account details"}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Email" value={viewing.email} />
              <DetailItem label="Phone" value={viewing.phone} />
              <DetailItem label="Gender" value={viewing.gender} />
              <DetailItem
                label="Date of birth"
                value={
                  viewing.date_of_birth
                    ? new Date(viewing.date_of_birth).toLocaleDateString()
                    : undefined
                }
              />
              {isDoctor ? (
                <>
                  <DetailItem label="Qualification" value={viewing.qualification} />
                  <DetailItem label="Specialization" value={viewing.specialty} />
                  <DetailItem label="Registration number" value={viewing.registration_number} />
                  <DetailItem
                    label="Experience"
                    value={
                      viewing.experience_years != null
                        ? `${viewing.experience_years} years`
                        : undefined
                    }
                  />
                </>
              ) : (
                <>
                  <DetailItem label="Employee ID" value={viewing.employee_id} />
                  <DetailItem label="Shift" value={viewing.shift} />
                  <DetailItem label="Address" value={viewing.address} />
                </>
              )}
              <DetailItem label="Department" value={viewing.department} />
              <DetailItem
                label="Hospital"
                value={[viewing.hospital, viewing.branch].filter(Boolean).join(" · ")}
              />
              <DetailItem
                label="Joining date"
                value={
                  viewing.joining_date
                    ? new Date(viewing.joining_date).toLocaleDateString()
                    : undefined
                }
              />
              <DetailItem
                label="Account status"
                value={(viewing.status ?? "active") === "active" ? "Active" : "Inactive"}
              />
              {isDoctor && (
                <>
                  <DetailItem label="Patients" value={String(viewing.patients)} />
                  <DetailItem label="Consultations" value={String(viewing.consultations)} />
                </>
              )}
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this account?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.full_name} will no longer be able to sign in. Clinical records they
              created are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDelete) return;
                try {
                  await remove.mutateAsync(pendingDelete.id);
                  toast.success("Account removed");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not remove the account");
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
