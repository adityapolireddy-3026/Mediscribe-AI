/** Dialog for uploading a medical report to a patient record. */
export function ReportUploadDialog({
  patientId,
  open,
  onOpenChange,
}: {
  patientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const upload = useUploadReport();

  const [form, setForm] = useState({
    report_type: "Blood Test",
    report_name: "",
    report_date: new Date().toISOString().slice(0, 10),
    hospital_lab: "",
    description: "",
  });

  const [file, setFile] = useState<File | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.report_name.trim()) {
      return toast.error("Report name is required");
    }

    if (!file) {
      return toast.error("Please choose a PDF, JPG, JPEG or PNG file");
    }

    try {
      await upload.mutateAsync({
        patient_id: patientId,
        ...form,
        file,
      });

      toast.success("Report uploaded to the patient record");
      onOpenChange(false);
      setFile(null);

      setForm((f) => ({
        ...f,
        report_name: "",
        hospital_lab: "",
        description: "",
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onChange={(v) =>
                setForm((f) => ({ ...f, report_type: v }))
              }
              options={REPORT_TYPES}
            />

            <TextField
              label="Report name"
              required
              value={form.report_name}
              onChange={(v) =>
                setForm((f) => ({ ...f, report_name: v }))
              }
              placeholder="e.g. Complete Blood Count"
            />

            <TextField
              label="Report date"
              type="date"
              value={form.report_date}
              onChange={(v) =>
                setForm((f) => ({ ...f, report_date: v }))
              }
            />

            <TextField
              label="Hospital / Lab"
              value={form.hospital_lab}
              onChange={(v) =>
                setForm((f) => ({ ...f, hospital_lab: v }))
              }
            />
          </div>

          <AreaField
            label="Description"
            value={form.description}
            onChange={(v) =>
              setForm((f) => ({ ...f, description: v }))
            }
          />

          <div className="space-y-1.5">
            <Label htmlFor="report-file">
              File (PDF, JPG, JPEG or PNG · max 15 MB)
            </Label>

            <Input
              id="report-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) =>
                setFile(e.target.files?.[0] ?? null)
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={upload.isPending}>
              {upload.isPending ? "Uploading…" : "Upload report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
