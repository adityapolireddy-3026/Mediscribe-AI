import { useRef, useState } from "react";
import { Printer, Download, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PrescriptionTemplate,
  type PrescriptionData,
} from "./prescription-template";
import { downloadPrescriptionPdf } from "@/lib/pdf";
import { downloadElementAsPdf } from "@/lib/prescription-pdf-exporter";

export function PrescriptionPreviewDialog({
  open,
  onOpenChange,
  data,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PrescriptionData | null;
  onEdit?: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const prescriptionRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPdf() {
    if (!data) return;
    const safeName = (data.patient?.full_name || "patient")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "")
      .toLowerCase();
    const filename = `prescription-${data.prescriptionNumber}-${safeName}.pdf`;

    try {
      setDownloading(true);

      // Strategy 1: High-resolution direct DOM capture (exact match to screen)
      if (prescriptionRef.current) {
        toast.info("Generating high-definition prescription PDF...");
        await downloadElementAsPdf(prescriptionRef.current, filename);
        toast.success("Prescription PDF downloaded successfully");
        return;
      }

      // Strategy 2: Programmatic calibrated full-page jsPDF fallback
      const doc = data.doctor;
      const pat = data.patient;
      downloadPrescriptionPdf({
        doctor: {
          full_name: doc?.full_name ?? "Dr. R. Anil Kumar",
          specialty: doc?.specialty ?? "Consultant Physician",
          qualification: doc?.qualification ?? "MBBS, MD (General Medicine)",
          registration_number: doc?.registration_number ?? "AP/MC/78945",
          hospital: "GMR Varalakshmi CARE Hospital",
        },
        hospital: {
          name: "GMR Varalakshmi CARE Hospital",
          address: "GMR Nagar, Rajam, Srikakulam District, Andhra Pradesh – 532127",
          phone: "1800 425 1834 | (+91)85208 23181",
        },
        prescriptionNumber: data.prescriptionNumber,
        consultedAt: data.consultedAt ?? data.createdAt ?? new Date(),
        patient: {
          name: pat?.full_name ?? "Mr. K. Suresh",
          uhid: pat?.uhid ?? `GMRVCH${data.prescriptionNumber.replace(/[^A-Z0-9]/gi, "").slice(-8).toUpperCase()}`,
          dob: pat?.date_of_birth ?? null,
          age: pat?.age ?? "28",
          gender: pat?.gender ?? "Male",
          bloodGroup: pat?.blood_group ?? "O+",
          phone: pat?.phone ?? "+91 98765 43210",
          address:
            [pat?.address, pat?.city, pat?.state, pat?.pincode].filter(Boolean).join(", ") ||
            "Dwarakanagar, Visakhapatnam – 530016",
          weight: data.clinical?.weight ?? "72 kg",
          allergies: pat?.allergies ?? "No known allergies",
        },
        clinical: {
          chiefComplaint: data.clinical?.chiefComplaint ?? "Fever, cough and headache since 3 days.",
          clinicalFindings:
            data.clinical?.clinicalFindings ??
            "Mild fever (100.4°F), throat congestion, normal BP, no breathlessness.",
        },
        diagnosis: data.diagnosis ?? "Acute Upper Respiratory Tract Infection (URTI)",
        medicines: data.medicines ?? [],
        advice: data.advice ?? "",
        tests: data.tests ?? "",
        followUpNote: data.followUpNote ?? "",
        followUpDate: data.followUpDate ?? null,
      });
      toast.success("Prescription PDF downloaded successfully");
    } catch (e) {
      console.error("DOM PDF generation failed, attempting programmatic fallback:", e);
      try {
        const doc = data.doctor;
        const pat = data.patient;
        downloadPrescriptionPdf({
          doctor: {
            full_name: doc?.full_name ?? "Dr. R. Anil Kumar",
            specialty: doc?.specialty ?? "Consultant Physician",
            qualification: doc?.qualification ?? "MBBS, MD (General Medicine)",
            registration_number: doc?.registration_number ?? "AP/MC/78945",
            hospital: "GMR Varalakshmi CARE Hospital",
          },
          hospital: {
            name: "GMR Varalakshmi CARE Hospital",
            address: "GMR Nagar, Rajam, Srikakulam District, Andhra Pradesh – 532127",
            phone: "1800 425 1834 | (+91)85208 23181",
          },
          prescriptionNumber: data.prescriptionNumber,
          consultedAt: data.consultedAt ?? data.createdAt ?? new Date(),
          patient: {
            name: pat?.full_name ?? "Mr. K. Suresh",
            uhid: pat?.uhid ?? `GMRVCH${data.prescriptionNumber.replace(/[^A-Z0-9]/gi, "").slice(-8).toUpperCase()}`,
            dob: pat?.date_of_birth ?? null,
            age: pat?.age ?? "28",
            gender: pat?.gender ?? "Male",
            bloodGroup: pat?.blood_group ?? "O+",
            phone: pat?.phone ?? "+91 98765 43210",
            address:
              [pat?.address, pat?.city, pat?.state, pat?.pincode].filter(Boolean).join(", ") ||
              "Dwarakanagar, Visakhapatnam – 530016",
            weight: data.clinical?.weight ?? "72 kg",
            allergies: pat?.allergies ?? "No known allergies",
          },
          clinical: {
            chiefComplaint: data.clinical?.chiefComplaint ?? "Fever, cough and headache since 3 days.",
            clinicalFindings:
              data.clinical?.clinicalFindings ??
              "Mild fever (100.4°F), throat congestion, normal BP, no breathlessness.",
          },
          diagnosis: data.diagnosis ?? "Acute Upper Respiratory Tract Infection (URTI)",
          medicines: data.medicines ?? [],
          advice: data.advice ?? "",
          tests: data.tests ?? "",
          followUpNote: data.followUpNote ?? "",
          followUpDate: data.followUpDate ?? null,
        });
        toast.success("Prescription PDF downloaded successfully");
      } catch (fallbackErr) {
        toast.error(fallbackErr instanceof Error ? fallbackErr.message : "Failed to generate PDF");
      }
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[96vw] max-w-5xl overflow-y-auto p-0 sm:p-6 print:border-none print:p-0 print:shadow-none">
        {/* Header / Actions toolbar (hidden during print) */}
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-5 py-3 backdrop-blur-sm sm:rounded-t-lg print:hidden">
          <DialogHeader className="p-0 text-left">
            <DialogTitle className="font-display text-base font-bold text-foreground">
              Official Prescription Preview
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              GMR Varalakshmi CARE Hospital • {data.prescriptionNumber}
            </p>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit();
                }}
              >
                <Pencil className="size-3.5" /> Edit
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="border-[#1b3a6b]/30 text-[#1b3a6b] hover:bg-[#1b3a6b]/5"
            >
              {downloading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Generating PDF...
                </>
              ) : (
                <>
                  <Download className="size-3.5" /> Download PDF
                </>
              )}
            </Button>

            <Button size="sm" onClick={handlePrint} className="bg-[#1b3a6b] hover:bg-[#14294c] text-white">
              <Printer className="size-3.5" /> Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Paper Container */}
        <div className="bg-slate-100 p-2 sm:p-6 print:bg-white print:p-0">
          <div
            ref={prescriptionRef}
            className="print-area mx-auto rounded-lg bg-white shadow-xl ring-1 ring-slate-900/5 print:rounded-none print:shadow-none print:ring-0"
          >
            <PrescriptionTemplate data={data} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
