import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Consultation = Tables<"consultations">;
export type ClinicalNote = Tables<"clinical_notes">;
export type Prescription = Tables<"prescriptions">;

export type Medicine = {
  name: string;
  strength?: string;
  dosage: string;
  frequency: string;
  duration: string;
  timing?: string;
};



async function requireUserId() {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Not signed in");
  return id;
}

/* ---------------- consultations ---------------- */

export function useConsultations() {
  return useQuery({
    queryKey: ["consultations"],
    queryFn: async (): Promise<Consultation[]> => {
      const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      patient_id: string;
      transcript: string;
      duration_seconds: number;
      status?: string;
      original_language?: string;
      original_transcript?: string | null;
      english_translation?: string | null;
      approved_at?: string | null;
      audio_url?: string | null;
      transcription_status?: string;
    }) => {
      const doctor_id = await requireUserId();
      const { data, error } = await supabase
        .from("consultations")
        .insert({ ...values, doctor_id })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consultations"] }),
  });
}

export function useUpdateConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: {
        transcript?: string;
        original_transcript?: string | null;
        english_translation?: string | null;
        original_language?: string;
        status?: string;
        approved_at?: string | null;
        audio_url?: string | null;
        transcription_status?: string;
      };
    }) => {
      const { error } = await supabase.from("consultations").update(values).eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consultations"] }),
  });
}

export function useDeleteConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("consultations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consultations"] });
      qc.invalidateQueries({ queryKey: ["clinical_notes"] });
    },
  });
}

/* ---------------- clinical notes ---------------- */

export function useClinicalNotes() {
  return useQuery({
    queryKey: ["clinical_notes"],
    queryFn: async (): Promise<ClinicalNote[]> => {
      const { data, error } = await supabase
        .from("clinical_notes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type NoteFields = Pick<
  ClinicalNote,
  | "chief_complaint"
  | "history"
  | "vitals"
  | "examination"
  | "other_observations"
  | "assessment"
  | "clinical_impression"
  | "plan"
  | "medicines"
  | "lifestyle_advice"
  | "recommended_tests"
  | "follow_up"
>;


export function useSaveClinicalNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string;
      values: NoteFields & { patient_id?: string; consultation_id?: string | null };
    }) => {
      if (id) {
        const { error } = await supabase.from("clinical_notes").update(values).eq("id", id);
        if (error) throw error;
        return id;
      }
      const doctor_id = await requireUserId();
      if (!values.patient_id) throw new Error("A patient is required");
      const { data, error } = await supabase
        .from("clinical_notes")
        .insert({ ...values, patient_id: values.patient_id, doctor_id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clinical_notes"] }),
  });
}

export function useDeleteClinicalNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clinical_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clinical_notes"] }),
  });
}

/* ---------------- prescriptions ---------------- */

export function usePrescriptions() {
  return useQuery({
    queryKey: ["prescriptions"],
    queryFn: async (): Promise<Prescription[]> => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSavePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string;
      values: {
        patient_id: string;
        diagnosis: string;
        advice: string;
        tests?: string;
        follow_up_note?: string;
        follow_up_date: string | null;
        medicines: Medicine[];
      };

    }) => {
      if (id) {
        const { error } = await supabase.from("prescriptions").update(values).eq("id", id);
        if (error) throw error;
        return id;
      }
      const doctor_id = await requireUserId();
      const { data, error } = await supabase
        .from("prescriptions")
        .insert({ ...values, doctor_id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prescriptions"] }),
  });
}

export function useDeletePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prescriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prescriptions"] }),
  });
}

export function useDoctorProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
