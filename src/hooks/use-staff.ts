import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  createStaffAccount,
  updateStaffAccount,
  setStaffStatus,
  deleteStaffAccount,
  type StaffProfileInput,
  type StaffRole,
} from "@/lib/staff.functions";

export type StaffMember = Tables<"profiles"> & {
  role: StaffRole | "admin";
  patients: number;
  consultations: number;
};

/** All staff of one role, with their activity volumes. Admin-only data. */
export function useStaff(role: StaffRole, enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["staff", role],
    queryFn: async (): Promise<StaffMember[]> => {
      const [{ data: roles, error: rolesError }, { data: profiles, error }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      ]);
      if (rolesError) throw rolesError;
      if (error) throw error;

      const ids = new Set(
        (roles ?? []).filter((r) => r.role === role).map((r) => r.user_id as string),
      );
      const members = (profiles ?? []).filter((p) => ids.has(p.id));
      if (members.length === 0) return [];

      const [{ data: consultations }, { data: patients }] = await Promise.all([
        supabase.from("consultations").select("id, doctor_id"),
        supabase.from("patients").select("id, doctor_id, registered_by"),
      ]);

      return members.map((p) => ({
        ...p,
        role,
        consultations: (consultations ?? []).filter((c) => c.doctor_id === p.id).length,
        patients: (patients ?? []).filter(
          (x) => x.doctor_id === p.id || x.registered_by === p.id,
        ).length,
      }));
    },
  });
}

export function useStaffMutations(role: StaffRole) {
  const qc = useQueryClient();
  const create = useServerFn(createStaffAccount);
  const update = useServerFn(updateStaffAccount);
  const status = useServerFn(setStaffStatus);
  const remove = useServerFn(deleteStaffAccount);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["staff", role] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  return {
    create: useMutation({
      mutationFn: (vars: { password: string; profile: StaffProfileInput }) =>
        create({ data: { role, password: vars.password, profile: vars.profile } }),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: (vars: { id: string; profile: StaffProfileInput; password?: string | null }) =>
        update({ data: vars }),
      onSuccess: invalidate,
    }),
    setStatus: useMutation({
      mutationFn: (vars: { id: string; status: "active" | "inactive" }) => status({ data: vars }),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => remove({ data: { id } }),
      onSuccess: invalidate,
    }),
  };
}

/** Map of staff id to display name; only rows the signed-in account may read resolve. */
export function useStaffNames() {
  const query = useQuery({
    queryKey: ["staff-names"],
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email");
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.id] = row.full_name?.trim() || row.email || "";
      return map;
    },
  });
  const names = query.data ?? {};
  return (id: string | null | undefined, fallback = "—") =>
    (id ? names[id] : undefined) || fallback;
}
