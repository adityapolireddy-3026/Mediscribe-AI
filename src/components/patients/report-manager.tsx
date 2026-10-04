import { useState } from "react";
import { toast } from "sonner";
import { Download, Eye, FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AreaField, SelectField, TextField } from "@/components/dashboard/form-fields";
import { EmptyState } from "@/components/dashboard/page-parts";
import { REPORT_TYPES } from "@/lib/options";
import { useStaffNames } from "@/hooks/use-staff";
import {
  reportUrl,
  useDeleteReport,
  usePatientReports,
  useUploadReport,
  type PatientReport,
} from "@/hooks/use-reports";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Patient medical reports list, with upload/remove for reception and administrators. */
export function ReportManager({
  patientId,
  canManage,
}: {
  patientId: string;
  canManage: boolean;
}) {
  const { data, isLoading } = usePatientReports(patientId);
  const upload = useUploadReport();
  const remove = useDeleteReport();
  const nameOf = useStaffNames();

  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PatientReport | null>(null);
  const [form, setForm] = useState({
    report_type: "Blood Test",
    report_name: "",
    report_date: new Date().toISOString().slice(0, 10),
    hospital_lab: "",
    description: "",
  });
  const [file, setFile] = useState<File | null>(null);

  async function openFile(report: PatientReport, download: boolean) {
    try {
      const url = await reportUrl(report.file_path, download);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Could not open the report file");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.report_name.trim()) return toast.error("Report name is required");
    if (!file) return toast.error("Please choose a PDF, JPG, JPEG or PNG file");
    try {
      await upload.mutateAsync({ patient_id: patientId, ...form, file });
      toast.success("Report uploaded to the patient record");
      setOpen(false);
      setFile(null);
      setForm((f) => ({ ...f, report_name: "", hospital_lab: "", description: "" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  if (isLoading) return <Skeleton className="h-40 w-full rounded-2xl" />;

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)}>
            <Upload className="size-4" /> Upload report
          </Button>
        </div>
      )}

      {(data ?? []).length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No medical reports yet"
          body={
            canManage
              ? "Upload lab results, scans and discharge summaries to keep them with the patient record."
              : "Reports uploaded by reception will appear here."
          }
        />
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((r) => (
            <article key={r.id} className="surface-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate font-semibold">{r.report_name}</h4>
                    <Badge variant="secondary">{r.report_type}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.report_date ? new Date(r.report_date).toLocaleDateString() : "Date not set"}
                    {r.hospital_lab ? ` · ${r.hospital_lab}` : ""}
                    {` · uploaded ${new Date(r.created_at).toLocaleDateString()} by ${nameOf(
                      r.uploaded_by,
                      "reception",
                    )}`}
                    {r.file_size ? ` · ${formatSize(r.file_size)}` : ""}
                  </p>
                  {r.description && (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {r.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={() => openFile(r, false)}>
                    <Eye className="size-4" /> View
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openFile(r, true)}>
                    <Download className="size-4" /> Download
                  </Button>
                  {canManage && (
                    <Button size="sm" variant="ghost" onClick={() => setPendingDelete(r)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload medical report</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Report type"
                required
                value={form.report_type}
                onChange={(v) => setForm((f) => ({ ...f, report_type: v }))}
                options={REPORT_TYPES}
              />
              <TextField
                label="Report name"
                required
                value={form.report_name}
                onChange={(v) => setForm((f) => ({ ...f, report_name: v }))}
                placeholder="e.g. Complete Blood Count"
              />
              <TextField
                label="Report date"
                type="date"
                value={form.report_date}
                onChange={(v) => setForm((f) => ({ ...f, report_date: v }))}
              />
              <TextField
                label="Hospital / Lab"
                value={form.hospital_lab}
                onChange={(v) => setForm((f) => ({ ...f, hospital_lab: v }))}
              />
            </div>
            <AreaField
              label="Description"
              value={form.description}
              onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            />
            <div className="space-y-1.5">
              <Label htmlFor="report-file">File (PDF, JPG, JPEG or PNG · max 15 MB)</Label>
              <Input
                id="report-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={upload.isPending}>
                {upload.isPending ? "Uploading…" : "Upload report"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this report?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.report_name} will be removed from the patient record and the stored
              file deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDelete) return;
                try {
                  await remove.mutateAsync(pendingDelete);
                  toast.success("Report removed");
                } catch {
                  toast.error("Could not remove the report");
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
