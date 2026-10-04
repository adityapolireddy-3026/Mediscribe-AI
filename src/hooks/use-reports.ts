import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type PatientReport = Tables<"patient_reports">;

export const REPORT_BUCKET = "patient-reports";
export const MAX_REPORT_BYTES = 15 * 1024 * 1024;
export const ALLOWED_REPORT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

/** Reports for one patient, or every report when no patient is given. */
export function usePatientReports(patientId?: string) {
  return useQuery({
    queryKey: ["patient_reports", patientId ?? "all"],
    queryFn: async (): Promise<PatientReport[]> => {
      let query = supabase
        .from("patient_reports")
        .select("*")
        .order("report_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (patientId) query = query.eq("patient_id", patientId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type ReportInput = {
  patient_id: string;
  report_type: string;
  report_name: string;
  report_date: string | null;
  hospital_lab: string;
  description: string;
  file: File;
};

export function useUploadReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: ReportInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");

      const file = values.file;
      if (!ALLOWED_REPORT_TYPES.includes(file.type))
        throw new Error("Only PDF, JPG, JPEG and PNG files can be uploaded");
      if (file.size > MAX_REPORT_BYTES) throw new Error("File must be smaller than 15 MB");

      const extension = file.name.split(".").pop()?.toLowerCase() || "dat";
      const path = `${values.patient_id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${extension}`;

      const upload = await supabase.storage
        .from(REPORT_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upload.error) throw upload.error;

      const { error } = await supabase.from("patient_reports").insert({
        patient_id: values.patient_id,
        report_type: values.report_type,
        report_name: values.report_name.trim(),
        report_date: values.report_date,
        hospital_lab: values.hospital_lab.trim(),
        description: values.description.trim(),
        file_path: path,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: uid,
      });
      if (error) {
        await supabase.storage.from(REPORT_BUCKET).remove([path]);
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patient_reports"] }),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (report: PatientReport) => {
      const { error } = await supabase.from("patient_reports").delete().eq("id", report.id);
      if (error) throw error;
      await supabase.storage.from(REPORT_BUCKET).remove([report.file_path]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patient_reports"] }),
  });
}

/** Short-lived private link so report files are never publicly reachable. */
export async function reportUrl(path: string, download = false) {
  const { data, error } = await supabase.storage
    .from(REPORT_BUCKET)
    .createSignedUrl(path, 300, download ? { download: true } : undefined);
  if (error) throw error;
  return data.signedUrl;
}
