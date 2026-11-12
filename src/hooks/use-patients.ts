import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Patient = Tables<"patients">;
export type PatientInput = Omit<
  TablesInsert<"patients">,
  "id" | "uhid" | "registered_by" | "created_at" | "updated_at"
>;

export const emptyPatient: PatientInput = {
  full_name: "",
  doctor_id: null,
  gender: "",
  date_of_birth: null,
  age: null,
  blood_group: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  emergency_contact_name: "",
  emergency_relationship: "",
  emergency_phone: "",
  allergies: "",
  medical_conditions: "",
  current_medications: "",
  medical_history: "",
  surgeries: "",
  occupation: "",
  marital_status: "",
  preferred_language: "English",
  status: "active",
};

export function usePatients(search = "") {
  return useQuery({
    queryKey: ["patients"],
    queryFn: async (): Promise<Patient[]> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;

      let query = supabase.from("patients").select("*").order("created_at", { ascending: false });

      // Until/alongside RLS, doctors only receive patients assigned to them.
      if (uid) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);
        const isDoctorOnly =
          (roles ?? []).some((r) => r.role === "doctor") &&
          !(roles ?? []).some((r) => r.role === "admin" || r.role === "receptionist");
        if (isDoctorOnly) query = query.eq("doctor_id", uid);
      }

      const { data, error } = await query;
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
    select: (rows) => {
      const list = Array.isArray(rows) ? rows : [];
      const q = search.trim().toLowerCase();
      if (!q) return list;
      return list.filter((p) =>
        [p.uhid, p.full_name, p.phone, p.email, p.medical_history, p.blood_group, p.city]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    },
  });
}

export function usePatient(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ["patient", id],
    queryFn: async (): Promise<Patient | null> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;

      let query = supabase.from("patients").select("*").eq("id", id!);

      if (uid) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);
        const isDoctorOnly =
          (roles ?? []).some((r) => r.role === "doctor") &&
          !(roles ?? []).some((r) => r.role === "admin" || r.role === "receptionist");
        if (isDoctorOnly) query = query.eq("doctor_id", uid);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSavePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: PatientInput }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");

      if (id) {
        const { error } = await supabase.from("patients").update(values).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from("patients")
        .insert({ ...values, registered_by: uid })
        .select("id, uhid")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient"] });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
  });
}
