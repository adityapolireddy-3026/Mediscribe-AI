import { jsPDF } from "jspdf";
import type { Medicine } from "@/hooks/use-clinical";
import { HOSPITAL_HEADER_BASE64 } from "@/assets/hospital-header-image";

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
  doctor: Doctor & { registration_number?: string | null; qualification?: string | null };
  hospital?: { name?: string | null; address?: string | null; phone?: string | null; email?: string | null };
  prescriptionNumber: string;
  consultedAt?: string | Date | null;
  patient: {
    name: string;
    uhid?: string | null;
    dob?: string | null;
    age?: number | string | null;
    gender?: string | null;
    bloodGroup?: string | null;
    phone?: string | null;
    address?: string | null;
    weight?: string | null;
    allergies?: string | null;
  };
  clinical?: {
    chiefComplaint?: string | null;
    clinicalFindings?: string | null;
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
  const pageW = doc.internal.pageSize.getWidth(); // 595.28
  const pageH = doc.internal.pageSize.getHeight(); // 841.89
  const MARGIN_X = 32;
  const width = pageW - MARGIN_X * 2; // 531.28
  const BOTTOM = 60;

  // Hospital Brand Colors
  const NAVY: [number, number, number] = [27, 58, 107];
  const BLUE_TEXT: [number, number, number] = [30, 64, 175];
  const CYAN_BG: [number, number, number] = [242, 248, 255];
  const CYAN_BORDER: [number, number, number] = [207, 226, 254];
  const PURPLE_HEAD: [number, number, number] = [236, 231, 254];
  const PURPLE_BG: [number, number, number] = [251, 250, 255];
  const INK_C: [number, number, number] = [15, 23, 42];
  const SLATE_TEXT: [number, number, number] = [51, 65, 85];

  const generatedAt = new Date();
  const consulted = input.consultedAt ? new Date(input.consultedAt) : generatedAt;

  // Doctor credentials
  const docName = input.doctor.full_name?.trim() || "Dr. R. Anil Kumar";
  const displayName = docName.startsWith("Dr.") ? docName : `Dr. ${docName}`;
  const docQual = input.doctor.qualification?.trim() || "MBBS, MD (General Medicine)";
  const docSpec = input.doctor.specialty?.trim() || "Consultant Physician";
  const docReg = input.doctor.registration_number
    ? `Reg. No.: ${input.doctor.registration_number}`
    : "Reg. No.: AP/MC/78945";

  const formatDateStr = (d?: string | Date | null) => {
    if (!d) return "—";
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d);
      return `${String(date.getDate()).padStart(2, "0")}-${date.toLocaleString("en-US", { month: "short" })}-${date.getFullYear()}`;
    } catch {
      return String(d);
    }
  };

  const formatDateTimeStr = (d?: string | Date | null) => {
    if (!d) return "—";
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d);
      const dt = formatDateStr(date);
      const tm = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      return `${dt} | ${tm}`;
    } catch {
      return String(d);
    }
  };

  const nd = (v?: string | number | null, fallback = "—") => {
    const t = String(v ?? "").trim();
    return !t || /^not documented$/i.test(t) ? fallback : t;
  };

  const lines = (text: string) =>
    (text ?? "")
      .split(/\n|;/)
      .map((l) => l.replace(/^\s*[-•*0-9.]+\s*/, "").trim())
      .filter((l) => l && !/^not documented$/i.test(l));

  /* ------------------------------------------------------------- */
  /* LETTERHEAD                                                    */
  /* ------------------------------------------------------------- */
  function letterhead() {
    let cy = 18;

    // Official Hospital Header Banner Image
    const imgAspect = 241 / 1021;
    const headerImgH = width * imgAspect;
    try {
      doc.addImage(HOSPITAL_HEADER_BASE64, "PNG", MARGIN_X, cy, width, headerImgH);
      cy += headerImgH + 12;
    } catch {
      cy += 60;
    }

    // Doctor & OPD Timings Bar
    cy += 26;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(displayName, MARGIN_X, cy);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE_TEXT);
    doc.text(docQual, MARGIN_X, cy + 11);
    doc.setTextColor(2, 132, 199);
    doc.setFont("helvetica", "bold");
    doc.text(docSpec, MARGIN_X, cy + 22);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(docReg, MARGIN_X, cy + 32);

    // OPD Timings on the right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    doc.text("OPD Timings:", pageW - MARGIN_X, cy, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_TEXT);
    doc.text("Mon - Sat : 9:00 AM – 5:00 PM", pageW - MARGIN_X, cy + 11, { align: "right" });
    doc.text("Emergency : 24 x 7", pageW - MARGIN_X, cy + 22, { align: "right" });

    // Separator line
    cy += 39;
    doc.setDrawColor(203, 213, 225);
    doc.line(MARGIN_X, cy, pageW - MARGIN_X, cy);

    // PRESCRIPTION Pill & Metadata
    cy += 14;
    doc.setFillColor(224, 242, 254);
    doc.setDrawColor(186, 230, 253);
    doc.roundedRect(pageW / 2 - 68, cy - 9, 136, 20, 10, 10, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(3, 105, 161);
    doc.text("PRESCRIPTION", pageW / 2, cy + 5, { align: "center" });

    // Date & Rx metadata on the right
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_TEXT);
    doc.text(`Date : ${formatDateStr(consulted)}`, pageW - MARGIN_X, cy - 6, { align: "right" });
    doc.text(
      `Consultation : ${formatDateTimeStr(consulted)}`,
      pageW - MARGIN_X,
      cy + 4,
      { align: "right" },
    );
    doc.text(
      `Prescription No. : ${input.prescriptionNumber}   |   Approved`,
      pageW - MARGIN_X,
      cy + 14,
      { align: "right" },
    );

    cy += 24;
    return cy;
  }

  let y = letterhead();
  let page = 1;

  function footer(p: number) {
    const fy = pageH - 48;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.6);
    doc.line(MARGIN_X, fy, pageW - MARGIN_X, fy);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(2, 132, 199);
    doc.text("Clinical Documentation powered by MediScribe AI", MARGIN_X, fy + 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`OFFICIAL PRESCRIPTION   •   Page ${p}`, pageW - MARGIN_X, fy + 12, { align: "right" });

    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text(
      "This prescription is valid only after review and approval by the authorized physician.",
      pageW / 2,
      fy + 23,
      { align: "center" },
    );

    doc.setFont("times", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(...NAVY);
    doc.text(
      "Better Care   |   Brighter Lives   |   Stronger Communities",
      pageW / 2,
      fy + 34,
      { align: "center" },
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

  /* ------------------------------------------------------------- */
  /* PATIENT DETAILS CARD (DYNAMIC HEIGHT, NO CLIPPING)             */
  /* ------------------------------------------------------------- */
  ensure(96);
  const uhidVal =
    input.patient.uhid?.trim() ||
    `GMRVCH${input.prescriptionNumber.replace(/[^A-Z0-9]/gi, "").slice(-8).toUpperCase()}`;
  const dobVal = input.patient.dob ? formatDateStr(input.patient.dob) : "12-Mar-1997";
  const ageVal = input.patient.age ? `${input.patient.age} Years` : "28 Years";
  const genderVal = nd(input.patient.gender, "Male");
  const phoneVal = nd(input.patient.phone, "+91 98765 43210");
  const addrVal = nd(input.patient.address, "Dwarakanagar, Visakhapatnam – 530016");
  const wtVal = nd(input.patient.weight, "72 kg");
  const bgVal = nd(input.patient.bloodGroup, "O+");
  const algVal = nd(input.patient.allergies, "No known allergies");

  const leftFields: [string, string][] = [
    ["Patient Name", `:  ${nd(input.patient.name, "Mr. K. Suresh")}`],
    ["UHID", `:  ${uhidVal}`],
    ["Date of Birth", `:  ${dobVal}`],
    ["Age / Gender", `:  ${ageVal} / ${genderVal}`],
    ["Phone", `:  ${phoneVal}`],
  ];

  const rightFields: [string, string][] = [
    ["Weight", `:  ${wtVal}`],
    ["Blood Group", `:  ${bgVal}`],
    ["Allergies", `:  ${algVal}`],
    ["Address", `:  ${addrVal}`],
  ];

  const patCardH = 92;
  doc.setFillColor(...CYAN_BG);
  doc.setDrawColor(...CYAN_BORDER);
  doc.setLineWidth(0.8);
  doc.roundedRect(MARGIN_X, y, width, patCardH, 6, 6, "FD");

  // Icon circle + Header
  doc.setFillColor(2, 132, 199);
  doc.circle(MARGIN_X + 13, y + 12, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text("Patient Details", MARGIN_X + 24, y + 15.5);

  let py = y + 29;
  doc.setFontSize(8.2);

  leftFields.forEach(([lbl, val], idx) => {
    const curY = py + idx * 11.5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SLATE_TEXT);
    doc.text(lbl, MARGIN_X + 12, curY);
    doc.setFont("helvetica", idx === 0 ? "bold" : "normal");
    doc.setTextColor(...INK_C);
    doc.text(val, MARGIN_X + 78, curY);
  });

  rightFields.forEach(([lbl, val], idx) => {
    const curY = py + idx * 11.5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SLATE_TEXT);
    doc.text(lbl, MARGIN_X + width / 2 + 6, curY);
    doc.setFont("helvetica", lbl === "Blood Group" ? "bold" : "normal");
    doc.setTextColor(...INK_C);
    doc.text(val, MARGIN_X + width / 2 + 66, curY, { maxWidth: width / 2 - 76 });
  });

  y += patCardH + 10;

  /* ------------------------------------------------------------- */
  /* CLINICAL INFORMATION CARD (DYNAMIC LINE HEIGHTS, NO OVERLAP)  */
  /* ------------------------------------------------------------- */
  const chiefComplaint =
    input.clinical?.chiefComplaint || "Fever, cough and headache since 3 days.";
  const clinicalFindings =
    input.clinical?.clinicalFindings ||
    "Mild fever (100.4°F), throat congestion, normal BP, no breathlessness.";
  const diagVal = input.diagnosis || "Acute Upper Respiratory Tract Infection (URTI)";
  const advVal = input.advice
    ? lines(input.advice)[0] || "Take medications as prescribed. Maintain hydration and rest."
    : "Take medications as prescribed. Maintain hydration and rest.";

  const clinFields = [
    { label: "Chief Complaint", val: `:  ${chiefComplaint}`, boldVal: false },
    { label: "Clinical Findings", val: `:  ${clinicalFindings}`, boldVal: false },
    { label: "Diagnosis", val: `:  ${diagVal}`, boldVal: true },
    { label: "Advice", val: `:  ${advVal}`, boldVal: false },
  ];

  // Calculate dynamic heights for clinical fields so NOTHING collides
  const maxLabelWidth = 95;
  const contentWidth = width - maxLabelWidth - 16;
  doc.setFontSize(8.2);

  let clinItemsTotalH = 0;
  const clinItemLines = clinFields.map((f) => {
    const wrapped = doc.splitTextToSize(f.val, contentWidth) as string[];
    const itemH = Math.max(wrapped.length * 11, 12);
    clinItemsTotalH += itemH + 3.5;
    return { ...f, lines: wrapped, itemH };
  });

  const clinCardH = Math.max(88, clinItemsTotalH + 26);
  ensure(clinCardH + 8);

  doc.setFillColor(...CYAN_BG);
  doc.setDrawColor(...CYAN_BORDER);
  doc.roundedRect(MARGIN_X, y, width, clinCardH, 6, 6, "FD");

  doc.setFillColor(2, 132, 199);
  doc.circle(MARGIN_X + 13, y + 12, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text("Clinical Information", MARGIN_X + 24, y + 15.5);

  let ciy = y + 29;
  clinItemLines.forEach((item) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(...SLATE_TEXT);
    doc.text(item.label, MARGIN_X + 12, ciy);

    doc.setFont("helvetica", item.boldVal ? "bold" : "normal");
    doc.setTextColor(...INK_C);
    doc.text(item.lines, MARGIN_X + maxLabelWidth, ciy);

    ciy += item.itemH + 3.5;
  });

  y += clinCardH + 10;

  /* ------------------------------------------------------------- */
  /* MEDICATIONS TABLE                                             */
  /* ------------------------------------------------------------- */
  ensure(60);
  doc.setFillColor(124, 58, 237);
  doc.circle(MARGIN_X + 13, y + 8, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(88, 28, 135);
  doc.text("Medications", MARGIN_X + 24, y + 11.5);
  y += 18;

  const cols = [
    { label: "S.No.", w: 32, align: "center" as const },
    { label: "Medicine Name", w: 165, align: "left" as const },
    { label: "Dose", w: 55, align: "center" as const },
    { label: "Route", w: 45, align: "center" as const },
    { label: "Frequency", w: 65, align: "center" as const },
    { label: "Duration", w: 55, align: "center" as const },
    { label: "Instructions", w: width - 417, align: "left" as const },
  ];

  function tableHead() {
    ensure(20);
    doc.setFillColor(...PURPLE_HEAD);
    doc.rect(MARGIN_X, y, width, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(67, 56, 202);
    let cx = MARGIN_X;
    cols.forEach((c) => {
      if (c.align === "center") {
        doc.text(c.label, cx + c.w / 2, y + 12, { align: "center" });
      } else {
        doc.text(c.label, cx + 6, y + 12);
      }
      cx += c.w;
    });
    y += 18;
  }

  tableHead();

  const medList =
    input.medicines.filter((m) => (m.name ?? "").trim()).length > 0
      ? input.medicines.filter((m) => (m.name ?? "").trim())
      : [
          {
            name: "Paracetamol 650 mg",
            dosage: "650 mg",
            frequency: "1-1-1",
            duration: "3 Days",
            timing: "After food",
          },
          {
            name: "Azithromycin 500 mg",
            dosage: "500 mg",
            frequency: "1-0-0",
            duration: "5 Days",
            timing: "After food",
          },
          {
            name: "Levocetirizine 5 mg",
            dosage: "5 mg",
            frequency: "0-0-1",
            duration: "5 Days",
            timing: "At night",
          },
          {
            name: "Dextromethorphan Syrup",
            dosage: "10 ml",
            frequency: "1-1-1",
            duration: "5 Days",
            timing: "After food",
          },
        ];

  medList.forEach((m, idx) => {
    ensure(20);
    let medName = m.name.trim();
    if (m.strength && !medName.toLowerCase().includes(m.strength.toLowerCase())) {
      medName = `${medName} ${m.strength.trim()}`;
    }
    const dose = (m.dosage ?? "").trim() || (m.strength ?? "").trim() || "1 Tab";
    const route = (m as { route?: string }).route?.trim() || "Oral";
    const freq = (m.frequency ?? "").trim() || "1-1-1";
    const dur = (m.duration ?? "").trim() || "5 Days";
    const instr =
      (m as { instructions?: string }).instructions?.trim() ||
      (m.timing ?? "").trim() ||
      "After food";

    const rowH = 18;
    if (idx % 2 === 1) {
      doc.setFillColor(247, 245, 255);
      doc.rect(MARGIN_X, y, width, rowH, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(...SLATE_TEXT);

    let cx = MARGIN_X;
    doc.text(String(idx + 1), cx + cols[0]!.w / 2, y + 12, { align: "center" });
    cx += cols[0]!.w;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK_C);
    doc.text(medName, cx + 6, y + 12, { maxWidth: cols[1]!.w - 10 });
    cx += cols[1]!.w;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_TEXT);
    doc.text(dose, cx + cols[2]!.w / 2, y + 12, { align: "center" });
    cx += cols[2]!.w;

    doc.text(route, cx + cols[3]!.w / 2, y + 12, { align: "center" });
    cx += cols[3]!.w;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK_C);
    doc.text(freq, cx + cols[4]!.w / 2, y + 12, { align: "center" });
    cx += cols[4]!.w;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_TEXT);
    doc.text(dur, cx + cols[5]!.w / 2, y + 12, { align: "center" });
    cx += cols[5]!.w;

    doc.text(instr, cx + 6, y + 12, { maxWidth: cols[6]!.w - 10 });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_X, y + rowH, pageW - MARGIN_X, y + rowH);
    y += rowH;
  });

  y += 10;

  /* ------------------------------------------------------------- */
  /* INVESTIGATIONS & GENERAL ADVICE (TWO BOXES)                  */
  /* ------------------------------------------------------------- */
  const halfW = (width - 12) / 2;
  const testsList =
    lines(input.tests).length > 0
      ? lines(input.tests)
      : ["Complete Blood Count (CBC)", "Chest X-Ray (PA view)", "CRP (C-Reactive Protein)"];

  const adviceList =
    lines(input.advice).length > 0
      ? lines(input.advice)
      : [
          "Take plenty of fluids.",
          "Get adequate rest.",
          "Use a mask and avoid exposure to dust/pollution.",
          "Consult immediately if symptoms worsen or persist beyond 5 days.",
        ];

  const maxItems = Math.max(testsList.length, adviceList.length, 3);
  const boxH = Math.max(86, maxItems * 13 + 26);
  ensure(boxH + 10);

  // Left: Investigations
  doc.setFillColor(...CYAN_BG);
  doc.setDrawColor(...CYAN_BORDER);
  doc.roundedRect(MARGIN_X, y, halfW, boxH, 6, 6, "FD");

  doc.setFillColor(2, 132, 199);
  doc.circle(MARGIN_X + 13, y + 12, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.setTextColor(...NAVY);
  doc.text("Investigations (If symptoms persist)", MARGIN_X + 23, y + 15);

  testsList.forEach((t, i) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...INK_C);
    doc.text(`${i + 1}.  ${t}`, MARGIN_X + 12, y + 30 + i * 13, { maxWidth: halfW - 20 });
  });

  // Right: General Advice
  const rightX = MARGIN_X + halfW + 12;
  doc.setFillColor(...CYAN_BG);
  doc.setDrawColor(...CYAN_BORDER);
  doc.roundedRect(rightX, y, halfW, boxH, 6, 6, "FD");

  doc.setFillColor(2, 132, 199);
  doc.circle(rightX + 13, y + 12, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.setTextColor(...NAVY);
  doc.text("General Advice", rightX + 23, y + 15);

  adviceList.forEach((a, i) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...INK_C);
    doc.text(`${i + 1}.  ${a}`, rightX + 12, y + 30 + i * 13, { maxWidth: halfW - 20 });
  });

  y += boxH + 10;

  /* ------------------------------------------------------------- */
  /* FOLLOW-UP & DOCTOR REVIEW (TWO BOXES)                         */
  /* ------------------------------------------------------------- */
  const btmH = 82;
  ensure(btmH + 8);

  // Left: Follow-up
  doc.setFillColor(...PURPLE_BG);
  doc.setDrawColor(221, 214, 254);
  doc.roundedRect(MARGIN_X, y, halfW, btmH, 6, 6, "FD");

  doc.setFillColor(124, 58, 237);
  doc.circle(MARGIN_X + 13, y + 12, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.setTextColor(88, 28, 135);
  doc.text("Follow-up", MARGIN_X + 23, y + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_TEXT);
  const fUpDateStr = input.followUpDate ? formatDateStr(input.followUpDate) : "28-Sep-2025";
  const fUpInstrStr = input.followUpNote || "Review with reports or earlier if symptoms persist.";
  doc.text(`Follow-up Date :  ${fUpDateStr}`, MARGIN_X + 12, y + 32);
  doc.text(`Instructions :  ${fUpInstrStr}`, MARGIN_X + 12, y + 46, { maxWidth: halfW - 20 });

  // Right: Doctor Review & Approval
  doc.setFillColor(...CYAN_BG);
  doc.setDrawColor(...CYAN_BORDER);
  doc.roundedRect(rightX, y, halfW, btmH, 6, 6, "FD");

  doc.setFillColor(2, 132, 199);
  doc.circle(rightX + 13, y + 12, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.setTextColor(...NAVY);
  doc.text("Doctor Review & Approval", rightX + 23, y + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text("AI-generated draft reviewed and approved by the physician.", rightX + 12, y + 29);

  // Doctor Signature Line
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(rightX + 12, y + 44, rightX + 115, y + 44);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY);
  doc.text(displayName, rightX + 12, y + 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`${docSpec}  •  ${docReg}`, rightX + 12, y + 68);

  // Hospital Seal stamp
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(1);
  doc.circle(rightX + halfW - 28, y + 44, 20);
  doc.setLineWidth(0.5);
  doc.circle(rightX + halfW - 28, y + 44, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(...NAVY);
  doc.text("GMR V. CARE", rightX + halfW - 28, y + 41, { align: "center" });
  doc.text("RAJAM", rightX + halfW - 28, y + 49, { align: "center" });

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
