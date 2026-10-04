import { jsPDF } from "jspdf";
import type { Medicine } from "@/hooks/use-clinical";

type Doctor = { full_name?: string | null; specialty?: string | null; hospital?: string | null };

const MARGIN = 48;

function header(doc: jsPDF, doctor: Doctor, title: string) {
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 76, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("MediScribe AI", MARGIN, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    [doctor.full_name, doctor.specialty, doctor.hospital].filter(Boolean).join("  •  ") ||
      "Clinical documentation",
    MARGIN,
    54,
  );
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, MARGIN, 110);
  return 130;
}

function block(doc: jsPDF, y: number, label: string, value: string) {
  const width = doc.internal.pageSize.getWidth() - MARGIN * 2;
  if (y > doc.internal.pageSize.getHeight() - 90) {
    doc.addPage();
    y = MARGIN;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(37, 99, 235);
  doc.text(label.toUpperCase(), MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  const lines = doc.splitTextToSize(value?.trim() || "—", width);
  doc.text(lines, MARGIN, y + 16);
  return y + 16 + lines.length * 14 + 14;
}

function footer(doc: jsPDF) {
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, h - 58, doc.internal.pageSize.getWidth() - MARGIN, h - 58);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generated ${new Date().toLocaleString()} — MediScribe AI. Not valid without clinician review.`,
    MARGIN,
    h - 38,
  );
}


export type PrescriptionPdfInput = {
  doctor: Doctor & { registration_number?: string | null };
  hospital?: { name?: string | null; address?: string | null; phone?: string | null };
  prescriptionNumber: string;
  consultedAt?: string | Date | null;
  patient: {
    name: string;
    age?: number | string | null;
    gender?: string | null;
    bloodGroup?: string | null;
    phone?: string | null;
  };
  diagnosis: string;
  medicines: Medicine[];
  advice: string;
  tests: string;
  followUpNote: string;
  followUpDate: string | null;
};

export function downloadPrescriptionPdf(input: PrescriptionPdfInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const width = pageW - MARGIN * 2;
  const BOTTOM = 92;
  const BLUE_C: [number, number, number] = [37, 99, 235];
  const INK_C: [number, number, number] = [30, 41, 59];
  const generatedAt = new Date();
  const consulted = input.consultedAt ? new Date(input.consultedAt) : generatedAt;
  const nd = (v?: string | number | null) => {
    const t = String(v ?? "").trim();
    return !t || /^not documented$/i.test(t) ? "Not Documented" : t;
  };
  const lines = (text: string) =>
    (text ?? "")
      .split(/\n|;/)
      .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
      .filter((l) => l && !/^not documented$/i.test(l));

  /* Letterhead --------------------------------------------------- */
  function letterhead() {
    doc.setFillColor(...BLUE_C);
    doc.rect(0, 0, pageW, 112, "F");

    doc.setFillColor(255, 255, 255);
    doc.circle(MARGIN + 15, 40, 15, "F");
    doc.setDrawColor(...BLUE_C);
    doc.setLineWidth(3);
    doc.line(MARGIN + 15, 32, MARGIN + 15, 48);
    doc.line(MARGIN + 7, 40, MARGIN + 23, 40);

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("MediScribe AI", MARGIN + 40, 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const hospitalName =
      input.hospital?.name?.trim() || input.doctor.hospital?.trim() || "Clinical Documentation";
    doc.text(hospitalName, MARGIN + 40, 53);
    let ly = 67;
    if (input.hospital?.address?.trim()) {
      doc.setFontSize(8.5);
      doc.text(input.hospital.address.trim(), MARGIN + 40, ly, { maxWidth: width * 0.5 });
      ly += 12;
    }
    if (input.hospital?.phone?.trim()) {
      doc.setFontSize(8.5);
      doc.text(`Tel: ${input.hospital.phone.trim()}`, MARGIN + 40, ly);
    }

    const right = pageW - MARGIN;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(input.doctor.full_name?.trim() || "Clinician", right, 34, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(nd(input.doctor.specialty), right, 48, { align: "right" });
    doc.text(`Reg. No: ${nd(input.doctor.registration_number)}`, right, 61, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`Rx No: ${input.prescriptionNumber}`, MARGIN, 98);
    doc.text(`Date: ${consulted.toLocaleString()}`, right, 98, { align: "right" });
    return 146;
  }

  let y = letterhead();
  let page = 1;

  function footer(p: number) {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, pageH - 64, pageW - MARGIN, pageH - 64);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated by MediScribe AI  •  ${generatedAt.toLocaleString()}`, MARGIN, pageH - 48);
    doc.text(`Page ${p}`, pageW - MARGIN, pageH - 48, { align: "right" });
    doc.text(
      "This prescription has been generated using AI assistance and must be reviewed and approved by the attending physician before use.",
      MARGIN,
      pageH - 34,
      { maxWidth: width },
    );
  }

  const newPage = () => {
    footer(page);
    doc.addPage();
    page += 1;
    y = letterhead();
  };
  const ensure = (need: number) => {
    if (y + need > pageH - BOTTOM) newPage();
  };

  function heading(label: string) {
    ensure(46);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, y - 12, pageW - MARGIN, y - 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLUE_C);
    doc.text(label.toUpperCase(), MARGIN, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
  }

  function body(text: string, indent = 0) {
    const wrapped = doc.splitTextToSize(text, width - indent) as string[];
    wrapped.forEach((line) => {
      ensure(14);
      doc.text(line, MARGIN + indent, y);
      y += 14;
    });
  }

  /* Patient block ------------------------------------------------ */
  const rows: Array<[string, string]> = [
    ["Patient Name", nd(input.patient.name)],
    ["Age", input.patient.age ? `${input.patient.age} yrs` : "Not Documented"],
    ["Gender", nd(input.patient.gender)],
    ["Blood Group", nd(input.patient.bloodGroup)],
    ["Phone", nd(input.patient.phone)],
  ];
  const boxH = 34 + Math.ceil(rows.length / 2) * 20;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(MARGIN, y - 14, width, boxH, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLUE_C);
  doc.text("PATIENT DETAILS", MARGIN + 14, y + 4);
  let ry = y + 24;
  rows.forEach(([label, value], i) => {
    const x = MARGIN + 14 + (i % 2) * (width / 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK_C);
    doc.text(`${label}:`, x, ry);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(value, x + 78, ry, { maxWidth: width / 2 - 96 });
    if (i % 2 === 1) ry += 20;
  });
  y = y - 14 + boxH + 30;

  /* Diagnosis ---------------------------------------------------- */
  heading("Diagnosis");
  body(nd(input.diagnosis));
  y += 16;

  /* Medicines table ---------------------------------------------- */
  heading("Medicines (Rx)");
  const cols = [
    { label: "Medicine", w: 0.24 },
    { label: "Strength", w: 0.13 },
    { label: "Dose", w: 0.13 },
    { label: "Frequency", w: 0.18 },
    { label: "Duration", w: 0.14 },
    { label: "Timing", w: 0.18 },
  ].map((c) => ({ ...c, w: c.w * width }));

  function tableHead() {
    ensure(30);
    doc.setFillColor(...BLUE_C);
    doc.rect(MARGIN, y - 12, width, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    let x = MARGIN + 6;
    cols.forEach((c) => {
      doc.text(c.label, x, y + 3);
      x += c.w;
    });
    y += 22;
  }

  tableHead();
  const meds = input.medicines.filter((m) => (m.name ?? "").trim());
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK_C);

  if (!meds.length) {
    ensure(22);
    doc.text("No medicines prescribed.", MARGIN + 6, y + 4);
    y += 26;
  } else {
    meds.forEach((m, idx) => {
      const cells = [
        m.name.trim(),
        (m.strength ?? "").trim() || "—",
        (m.dosage ?? "").trim() || "—",
        (m.frequency ?? "").trim() || "—",
        (m.duration ?? "").trim() || "—",
        (m.timing ?? "").trim() || "—",
      ];
      const wrapped = cells.map(
        (text, i) => doc.splitTextToSize(text, cols[i]!.w - 12) as string[],
      );
      const rowH = Math.max(...wrapped.map((w) => w.length)) * 12 + 12;
      if (y + rowH > pageH - BOTTOM) {
        newPage();
        heading("Medicines (Rx) — continued");
        tableHead();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...INK_C);
      }
      if (idx % 2 === 1) {
        doc.setFillColor(246, 249, 253);
        doc.rect(MARGIN, y - 12, width, rowH, "F");
      }
      let x = MARGIN + 6;
      wrapped.forEach((linesOfCell, i) => {
        linesOfCell.forEach((line, li) => {
          doc.setFont("helvetica", i === 0 ? "bold" : "normal");
          doc.text(line, x, y + 2 + li * 12);
        });
        x += cols[i]!.w;
      });
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, y - 12 + rowH, pageW - MARGIN, y - 12 + rowH);
      y += rowH;
    });
    y += 14;
  }

  /* Advice ------------------------------------------------------- */
  heading("Advice");
  const adviceLines = lines(input.advice);
  if (!adviceLines.length) body("No specific advice recorded.");
  else adviceLines.forEach((l) => body(`•  ${l}`));
  y += 16;

  /* Recommended tests ------------------------------------------- */
  heading("Recommended Tests");
  const testLines = lines(input.tests);
  if (!testLines.length) body("No investigations required at present.");
  else testLines.forEach((l) => body(`•  ${l}`));
  y += 16;

  /* Follow-up ---------------------------------------------------- */
  heading("Follow-up");
  const followUp = [
    input.followUpNote?.trim(),
    input.followUpDate ? `Review date: ${new Date(input.followUpDate).toLocaleDateString()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  if (!followUp) body("Review if symptoms worsen.");
  else lines(followUp).forEach((l) => body(l));
  y += 20;

  /* Signature ---------------------------------------------------- */
  ensure(110);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y - 12, pageW - MARGIN, y - 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLUE_C);
  doc.text("DOCTOR SIGNATURE", MARGIN, y);
  y += 34;
  doc.setDrawColor(148, 163, 184);
  doc.line(MARGIN, y, MARGIN + 220, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK_C);
  doc.text(`Dr. ${(input.doctor.full_name ?? "").replace(/^Dr\.?\s*/i, "").trim() || "Clinician"}`, MARGIN, y);
  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(nd(input.doctor.specialty), MARGIN, y);
  y += 14;
  doc.text(`Medical Registration No: ${nd(input.doctor.registration_number)}`, MARGIN, y);

  footer(page);
  doc.save(
    `prescription-${input.prescriptionNumber}-${input.patient.name.replace(/\s+/g, "-").toLowerCase()}.pdf`,
  );
}



export function downloadReportPdf(input: {
  doctor: Doctor;
  patientName: string;
  patientMeta: string;
  sections: Array<{ label: string; value: string }>;
  title?: string;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = header(doc, input.doctor, input.title ?? "Clinical Report");
  y = block(doc, y, "Patient", `${input.patientName}\n${input.patientMeta}`);
  input.sections.forEach((s) => {
    y = block(doc, y, s.label, s.value);
  });
  footer(doc);
  doc.save(`report-${input.patientName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

/* ------------------------------------------------------------------ */
/* SOAP Clinical Note — hospital-style A4 document                     */
/* ------------------------------------------------------------------ */

type SoapDoctor = Doctor & { registration_number?: string | null };

export type SoapPdfSection = {
  letter: string;
  title: string;
  fields: Array<{ label: string; value: string }>;
};

const BLUE: [number, number, number] = [37, 99, 235];
const INK: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];

export function downloadSoapNotePdf(input: {
  doctor: SoapDoctor;
  patient: {
    name: string;
    age?: number | string | null;
    gender?: string | null;
    bloodGroup?: string | null;
    id?: string | null;
  };
  sections: SoapPdfSection[];
  consultedAt?: string | Date | null;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const width = pageW - MARGIN * 2;
  const BOTTOM = 96;
  const generatedAt = new Date();
  const consulted = input.consultedAt ? new Date(input.consultedAt) : generatedAt;
  const nd = (v?: string | null) => {
    const t = (v ?? "").trim();
    return !t || /^not documented$/i.test(t) ? "Not Documented" : t;
  };

  /* Letterhead --------------------------------------------------- */
  function letterhead() {
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, pageW, 108, "F");

    // logo mark
    doc.setFillColor(255, 255, 255);
    doc.circle(MARGIN + 15, 40, 15, "F");
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(3);
    doc.line(MARGIN + 15, 32, MARGIN + 15, 48);
    doc.line(MARGIN + 7, 40, MARGIN + 23, 40);

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("MediScribe AI", MARGIN + 40, 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(nd(input.doctor.hospital) === "Not Documented" ? "Clinical Documentation" : input.doctor.hospital!.trim(), MARGIN + 40, 53);

    const right = pageW - MARGIN;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(input.doctor.full_name?.trim() || "Clinician", right, 34, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(nd(input.doctor.specialty), right, 48, { align: "right" });
    doc.text(`Reg. No: ${nd(input.doctor.registration_number)}`, right, 61, { align: "right" });

    doc.setFontSize(9);
    doc.text(`Consultation: ${consulted.toLocaleString()}`, MARGIN, 88);
    doc.text("SOAP CLINICAL NOTE", right, 88, { align: "right" });
    return 140;
  }

  let y = letterhead();

  function footer(page: number) {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, pageH - 66, pageW - MARGIN, pageH - 66);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Generated by MediScribe AI  •  ${generatedAt.toLocaleString()}`, MARGIN, pageH - 50);
    doc.text(`Page ${page}`, pageW - MARGIN, pageH - 50, { align: "right" });
    doc.text(
      "This AI-generated clinical note must be reviewed and approved by the attending physician.",
      MARGIN,
      pageH - 36,
    );
  }

  let page = 1;
  const newPage = () => {
    footer(page);
    doc.addPage();
    page += 1;
    y = letterhead();
  };
  const ensure = (need: number) => {
    if (y + need > pageH - BOTTOM) newPage();
  };

  /* Patient block ------------------------------------------------ */
  doc.setFillColor(241, 245, 249);
  const rows: Array<[string, string]> = [
    ["Patient Name", nd(input.patient.name)],
    ["Age", input.patient.age ? `${input.patient.age} yrs` : "Not Documented"],
    ["Gender", nd(input.patient.gender)],
    ["Blood Group", nd(input.patient.bloodGroup)],
  ];
  if (input.patient.id) rows.push(["Patient ID", input.patient.id.slice(0, 8).toUpperCase()]);
  const boxH = 34 + Math.ceil(rows.length / 2) * 20;
  doc.roundedRect(MARGIN, y - 14, width, boxH, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLUE);
  doc.text("PATIENT INFORMATION", MARGIN + 14, y + 4);
  let ry = y + 24;
  rows.forEach(([label, value], i) => {
    const x = MARGIN + 14 + (i % 2) * (width / 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(`${label}:`, x, ry);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(value, x + 78, ry, { maxWidth: width / 2 - 96 });
    if (i % 2 === 1) ry += 20;
  });
  y = y - 14 + boxH + 26;

  /* SOAP sections ------------------------------------------------ */
  input.sections.forEach((section, idx) => {
    ensure(70);
    if (idx > 0) {
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.8);
      doc.line(MARGIN, y - 14, pageW - MARGIN, y - 14);
    }
    doc.setFillColor(...BLUE);
    doc.roundedRect(MARGIN, y - 2, 20, 20, 4, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(section.letter, MARGIN + 10, y + 12, { align: "center" });
    doc.setTextColor(...BLUE);
    doc.setFontSize(12);
    doc.text(section.title.toUpperCase(), MARGIN + 30, y + 12);
    y += 32;

    section.fields.forEach((field) => {
      const lines = doc.splitTextToSize(nd(field.value), width - 12) as string[];
      ensure(20 + lines.length * 13);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      doc.text(field.label, MARGIN, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      lines.forEach((line) => {
        ensure(14);
        doc.text(line, MARGIN + 12, y);
        y += 13;
      });
      y += 8;
    });
    y += 10;
  });

  /* Verification -------------------------------------------------- */
  ensure(120);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y - 6, pageW - MARGIN, y - 6);
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLUE);
  doc.text("DOCTOR VERIFICATION", MARGIN, y);
  y += 26;
  doc.setTextColor(...INK);
  doc.setFontSize(9.5);
  doc.text("Doctor Signature:", MARGIN, y);
  doc.setDrawColor(148, 163, 184);
  doc.line(MARGIN + 96, y + 3, MARGIN + 290, y + 3);
  y += 22;
  const vrows: Array<[string, string]> = [
    ["Doctor Name", input.doctor.full_name?.trim() || "Not Documented"],
    ["Specialization", nd(input.doctor.specialty)],
    ["Medical Registration No.", nd(input.doctor.registration_number)],
  ];
  vrows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(`${label}:`, MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(value, MARGIN + 140, y);
    y += 16;
  });

  footer(page);
  doc.save(`soap-note-${input.patient.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
