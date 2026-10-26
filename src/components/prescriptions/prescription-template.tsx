import React from "react";
import type { Medicine } from "@/hooks/use-clinical";
import type { Patient } from "@/hooks/use-patients";
import { HOSPITAL_HEADER_BASE64 } from "@/assets/hospital-header-image";

export type PrescriptionData = {
  prescriptionNumber: string;
  createdAt?: string | Date | null;
  consultedAt?: string | Date | null;
  status?: string;
  doctor?: {
    full_name?: string | null;
    qualification?: string | null;
    specialty?: string | null;
    registration_number?: string | null;
    department?: string | null;
  } | null;
  patient?: Partial<Patient> | null;
  clinical?: {
    chiefComplaint?: string | null;
    clinicalFindings?: string | null;
    weight?: string | null;
  } | null;
  diagnosis?: string | null;
  advice?: string | null;
  tests?: string | null;
  followUpDate?: string | null;
  followUpNote?: string | null;
  medicines?: Medicine[] | null;
  isSample?: boolean;
};

function formatDate(dateVal?: string | Date | null): string {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(dateVal);
  }
}

function formatDateTime(dateVal?: string | Date | null): string {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const datePart = formatDate(d);
    const timePart = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${datePart} | ${timePart}`;
  } catch {
    return String(dateVal);
  }
}

function toLines(text?: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n|;/)
    .map((l) => l.replace(/^\s*[-•*0-9.]+\s*/, "").trim())
    .filter((l) => l && !/^not documented$/i.test(l));
}

export function PrescriptionTemplate({
  data,
  className = "",
}: {
  data: PrescriptionData;
  className?: string;
}) {
  const p = data.patient;
  const doc = data.doctor;

  // Doctor credentials
  const doctorName =
    doc?.full_name?.trim() || "Dr. R. Anil Kumar";
  const doctorDisplayName = doctorName.startsWith("Dr.") ? doctorName : `Dr. ${doctorName}`;
  const doctorQualification = doc?.qualification?.trim() || "MBBS, MD (General Medicine)";
  const doctorSpecialty = doc?.specialty?.trim() || "Consultant Physician";
  const doctorReg = doc?.registration_number
    ? `Reg. No.: ${doc.registration_number}`
    : "Reg. No.: AP/MC/78945";

  // Patient credentials
  const patientName = p?.full_name?.trim() || "Mr. K. Suresh";
  const uhid =
    p?.uhid?.trim() ||
    (p?.id ? `GMRVCH${p.id.replace(/-/g, "").slice(0, 8).toUpperCase()}` : "GMRVCH25004567");
  const dob = p?.date_of_birth ? formatDate(p.date_of_birth) : "12-Mar-1997";
  const age = p?.age != null ? `${p.age} Years` : "28 Years";
  const gender = p?.gender?.trim() || "Male";
  const phone = p?.phone?.trim() || "+91 98765 43210";
  const addressParts = [p?.address, p?.city, p?.state, p?.pincode].filter(Boolean);
  const address =
    addressParts.length > 0
      ? addressParts.join(", ")
      : "Dwarakanagar, Visakhapatnam – 530016";
  const weight = data.clinical?.weight?.trim() || "72 kg";
  const bloodGroup = p?.blood_group?.trim() || "O+";
  const allergies = p?.allergies?.trim() || "No known allergies";

  // Clinical info
  const chiefComplaint =
    data.clinical?.chiefComplaint?.trim() || "Fever, cough and headache since 3 days.";
  const clinicalFindings =
    data.clinical?.clinicalFindings?.trim() ||
    "Mild fever (100.4°F), throat congestion, normal BP, no breathlessness.";
  const diagnosis = data.diagnosis?.trim() || "Acute Upper Respiratory Tract Infection (URTI)";
  const primaryAdvice = data.advice
    ? toLines(data.advice)[0] || "Take medications as prescribed. Maintain hydration and rest."
    : "Take medications as prescribed. Maintain hydration and rest.";

  // Medicines
  const rawMeds = (data.medicines ?? []).filter((m) => m && m.name?.trim());
  const meds =
    rawMeds.length > 0
      ? rawMeds.map((m) => {
          let medName = m.name.trim();
          if (m.strength && !medName.toLowerCase().includes(m.strength.toLowerCase())) {
            medName = `${medName} ${m.strength.trim()}`;
          }
          const dose = m.dosage?.trim() || m.strength?.trim() || "1 Tab";
          const route = (m as { route?: string }).route?.trim() || "Oral";
          const frequency = m.frequency?.trim() || "1-1-1";
          const duration = m.duration?.trim() || "5 Days";
          const instructions =
            (m as { instructions?: string }).instructions?.trim() ||
            m.timing?.trim() ||
            "After food";
          return { name: medName, dose, route, frequency, duration, instructions };
        })
      : [
          {
            name: "Paracetamol 650 mg",
            dose: "650 mg",
            route: "Oral",
            frequency: "1-1-1",
            duration: "3 Days",
            instructions: "After food",
          },
          {
            name: "Azithromycin 500 mg",
            dose: "500 mg",
            route: "Oral",
            frequency: "1-0-0",
            duration: "5 Days",
            instructions: "After food",
          },
          {
            name: "Levocetirizine 5 mg",
            dose: "5 mg",
            route: "Oral",
            frequency: "0-0-1",
            duration: "5 Days",
            instructions: "At night",
          },
          {
            name: "Dextromethorphan Syrup",
            dose: "10 ml",
            route: "Oral",
            frequency: "1-1-1",
            duration: "5 Days",
            instructions: "After food",
          },
        ];

  // Investigations & general advice
  const parsedTests = toLines(data.tests);
  const testsList =
    parsedTests.length > 0
      ? parsedTests
      : ["Complete Blood Count (CBC)", "Chest X-Ray (PA view)", "CRP (C-Reactive Protein)"];

  const parsedAdvice = toLines(data.advice);
  const adviceList =
    parsedAdvice.length > 0
      ? parsedAdvice
      : [
          "Take plenty of fluids.",
          "Get adequate rest.",
          "Use a mask and avoid exposure to dust/pollution.",
          "Consult immediately if symptoms worsen or persist beyond 5 days.",
        ];

  // Follow-up
  const followUpDate = data.followUpDate ? formatDate(data.followUpDate) : "28-Sep-2025";
  const followUpInstructions =
    data.followUpNote?.trim() || "Review with reports or earlier if symptoms persist.";

  // Dates & metadata
  const rxDate = data.createdAt ? formatDate(data.createdAt) : "22-Sep-2025";
  const rxConsulted = data.consultedAt
    ? formatDateTime(data.consultedAt)
    : data.createdAt
      ? formatDateTime(data.createdAt)
      : "22-Sep-2025 | 10:30 AM";
  const rxNumber = data.prescriptionNumber || "RX250922001";
  const status = data.status || "Approved";

  return (
    <div
      className={`prescription-root relative mx-auto w-full max-w-[850px] bg-white font-sans text-[#1e293b] antialiased print:m-0 print:w-full print:max-w-none print:p-0 ${className}`}
      style={{
        boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.12)",
      }}
    >
      <div className="p-6 sm:p-8">
        {/* ========================================================= */}
        {/* TOP LETTERHEAD (Official Hospital Letterhead Banner)       */}
        {/* ========================================================= */}
        <header className="relative w-full overflow-hidden rounded-xl">
          <img
            src={HOSPITAL_HEADER_BASE64}
            alt="GMR Varalakshmi CARE Hospital - A Unit of GMR Varalakshmi Foundation"
            className="block h-auto w-full select-none"
            loading="eager"
            decoding="sync"
          />
        </header>

        {/* ========================================================= */}
        {/* DOCTOR DETAILS & OPD TIMINGS                              */}
        {/* ========================================================= */}
        <section className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-[#cbd5e1] pb-3">
          {/* Doctor Info */}
          <div>
            <h2 className="text-[17px] font-black text-[#1b3a6b]">
              {doctorDisplayName}
            </h2>
            <p className="text-[11.5px] font-medium text-[#334155]">{doctorQualification}</p>
            <p className="text-[11.5px] font-semibold text-[#0284c7]">{doctorSpecialty}</p>
            <p className="text-[11px] text-[#475569]">{doctorReg}</p>
          </div>

          {/* OPD Timings */}
          <div className="text-right text-[11px] text-[#334155]">
            <p className="font-bold text-[#1b3a6b]">OPD Timings:</p>
            <p>
              <span className="font-medium">Mon - Sat :</span> 9:00 AM – 5:00 PM
            </p>
            <p>
              <span className="font-medium">Emergency :</span> 24 x 7
            </p>
          </div>
        </section>

        {/* ========================================================= */}
        {/* PRESCRIPTION TITLE & METADATA                             */}
        {/* ========================================================= */}
        <section className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1" />
          {/* Centered Large Pill Banner */}
          <div className="rounded-full border border-[#bae6fd] bg-[#e0f2fe] px-10 py-1 shadow-xs">
            <h3 className="text-center text-[15px] font-black tracking-widest text-[#0369a1]">
              PRESCRIPTION
            </h3>
          </div>

          {/* Right Metadata Block */}
          <div className="flex flex-1 flex-col items-end text-[11px] leading-tight text-[#334155]">
            <div>
              <span className="font-semibold text-[#1e293b]">Date : </span>
              <span>{rxDate}</span>
            </div>
            <div className="mt-0.5">
              <span className="font-semibold text-[#1e293b]">Consultation Date & Time : </span>
              <span>{rxConsulted}</span>
            </div>
            <div className="mt-0.5">
              <span className="font-semibold text-[#1e293b]">Prescription No. : </span>
              <span className="font-mono font-bold text-[#0f172a]">{rxNumber}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="font-semibold text-[#1e293b]">Status : </span>
              <span className="inline-block rounded-xs bg-[#dcfce7] px-2 py-0.5 text-[10px] font-bold text-[#15803d]">
                {status}
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 1: PATIENT DETAILS                                */}
        {/* ========================================================= */}
        <section className="mt-3.5 overflow-hidden rounded-xl border border-[#cfe2fe] bg-[#f2f7ff]">
          {/* Header Bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 text-[#1b3a6b]">
            <span className="flex size-6 items-center justify-center rounded-full bg-[#0284c7] text-white">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </span>
            <h4 className="text-[13px] font-bold tracking-tight text-[#1b3a6b]">
              Patient Details
            </h4>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 px-4 pb-3 pt-1 text-[11.5px] sm:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-1">
              <div className="grid grid-cols-[105px_10px_1fr] items-baseline">
                <span className="font-semibold text-[#334155]">Patient Name</span>
                <span>:</span>
                <span className="font-bold text-[#0f172a]">{patientName}</span>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr] items-baseline">
                <span className="font-semibold text-[#334155]">UHID</span>
                <span>:</span>
                <span className="font-medium text-[#1e293b]">{uhid}</span>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr] items-baseline">
                <span className="font-semibold text-[#334155]">Date of Birth</span>
                <span>:</span>
                <span className="text-[#1e293b]">{dob}</span>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr] items-baseline">
                <span className="font-semibold text-[#334155]">Age / Gender</span>
                <span>:</span>
                <span className="text-[#1e293b]">
                  {age} / {gender}
                </span>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr] items-baseline">
                <span className="font-semibold text-[#334155]">Phone</span>
                <span>:</span>
                <span className="text-[#1e293b]">{phone}</span>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr] items-baseline">
                <span className="font-semibold text-[#334155]">Address</span>
                <span>:</span>
                <span className="text-[#1e293b]">{address}</span>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-1">
              <div className="grid grid-cols-[90px_10px_1fr] items-baseline">
                <span className="font-semibold text-[#334155]">Weight</span>
                <span>:</span>
                <span className="text-[#1e293b]">{weight}</span>
              </div>
              <div className="grid grid-cols-[90px_10px_1fr] items-baseline">
                <span className="font-semibold text-[#334155]">Blood Group</span>
                <span>:</span>
                <span className="font-bold text-[#0f172a]">{bloodGroup}</span>
              </div>
              <div className="grid grid-cols-[90px_10px_1fr] items-baseline">
                <span className="font-semibold text-[#334155]">Allergies</span>
                <span>:</span>
                <span className="text-[#1e293b]">{allergies}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: CLINICAL INFORMATION                           */}
        {/* ========================================================= */}
        <section className="mt-3.5 overflow-hidden rounded-xl border border-[#cfe2fe] bg-[#f2f7ff]">
          {/* Header Bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 text-[#1b3a6b]">
            <span className="flex size-6 items-center justify-center rounded-full bg-[#0284c7] text-white">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .2.3" />
                <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
                <circle cx="20" cy="10" r="2" />
              </svg>
            </span>
            <h4 className="text-[13px] font-bold tracking-tight text-[#1b3a6b]">
              Clinical Information
            </h4>
          </div>

          {/* Details */}
          <div className="space-y-1 px-4 pb-3 pt-1 text-[11.5px]">
            <div className="grid grid-cols-[120px_10px_1fr] items-baseline">
              <span className="font-semibold text-[#334155]">Chief Complaint</span>
              <span>:</span>
              <span className="text-[#1e293b]">{chiefComplaint}</span>
            </div>
            <div className="grid grid-cols-[120px_10px_1fr] items-baseline">
              <span className="font-semibold text-[#334155]">Clinical Findings</span>
              <span>:</span>
              <span className="text-[#1e293b]">{clinicalFindings}</span>
            </div>
            <div className="grid grid-cols-[120px_10px_1fr] items-baseline">
              <span className="font-semibold text-[#334155]">Diagnosis</span>
              <span>:</span>
              <span className="font-bold text-[#0f172a]">{diagnosis}</span>
            </div>
            <div className="grid grid-cols-[120px_10px_1fr] items-baseline">
              <span className="font-semibold text-[#334155]">Advice</span>
              <span>:</span>
              <span className="text-[#1e293b]">{primaryAdvice}</span>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: MEDICATIONS                                    */}
        {/* ========================================================= */}
        <section className="mt-3.5 overflow-hidden rounded-xl border border-[#ddd6fe] bg-[#fbfaff]">
          {/* Header Bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 text-[#581c87]">
            <span className="flex size-6 items-center justify-center rounded-full bg-[#7c3aed] text-white">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.5 10.5C3.67 9.67 3.67 8.33 4.5 7.5L7.5 4.5C8.33 3.67 9.67 3.67 10.5 4.5L19.5 13.5C20.33 14.33 20.33 15.67 19.5 16.5L16.5 19.5C15.67 20.33 14.33 20.33 13.5 19.5L4.5 10.5Z" />
                <line x1="8" y1="16" x2="16" y2="8" stroke="white" strokeWidth="2" />
              </svg>
            </span>
            <h4 className="text-[13px] font-bold tracking-tight text-[#4c1d95]">
              Medications
            </h4>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead>
                <tr className="border-y border-[#ddd6fe] bg-[#ece7fe] text-[#4338ca]">
                  <th className="py-1.5 pl-3 pr-2 font-bold text-center w-12">S.No.</th>
                  <th className="py-1.5 px-2 font-bold">Medicine Name</th>
                  <th className="py-1.5 px-2 font-bold text-center">Dose</th>
                  <th className="py-1.5 px-2 font-bold text-center">Route</th>
                  <th className="py-1.5 px-2 font-bold text-center">Frequency</th>
                  <th className="py-1.5 px-2 font-bold text-center">Duration</th>
                  <th className="py-1.5 pl-2 pr-3 font-bold">Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {meds.map((m, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-[#f5f3ff]">
                    <td className="py-1.5 pl-3 pr-2 text-center font-medium text-[#475569]">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2 font-bold text-[#0f172a]">{m.name}</td>
                    <td className="py-1.5 px-2 text-center text-[#334155]">{m.dose}</td>
                    <td className="py-1.5 px-2 text-center text-[#334155]">{m.route}</td>
                    <td className="py-1.5 px-2 text-center font-semibold text-[#1e293b]">
                      {m.frequency}
                    </td>
                    <td className="py-1.5 px-2 text-center text-[#334155]">{m.duration}</td>
                    <td className="py-1.5 pl-2 pr-3 text-[#334155]">{m.instructions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================= */}
        {/* TWO-COLUMN: INVESTIGATIONS & GENERAL ADVICE               */}
        {/* ========================================================= */}
        <section className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {/* Left: Investigations */}
          <div className="overflow-hidden rounded-xl border border-[#cfe2fe] bg-[#f2f7ff] p-3">
            <div className="flex items-center gap-2 text-[#1b3a6b]">
              <span className="flex size-6 items-center justify-center rounded-full bg-[#0284c7] text-white">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10 2v7.31L4.65 19.3A2 2 0 0 0 6.4 22h11.2a2 2 0 0 0 1.75-2.7L14 9.31V2" />
                  <path d="M8.5 2h7" />
                  <path d="M7 16h10" />
                </svg>
              </span>
              <h4 className="text-[12.5px] font-bold text-[#1b3a6b]">
                Investigations (If symptoms persist)
              </h4>
            </div>
            <ol className="mt-2 space-y-1 pl-3 text-[11px] text-[#1e293b]">
              {testsList.map((test, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="font-semibold text-[#0284c7]">{i + 1}.</span>
                  <span>{test}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Right: General Advice */}
          <div className="overflow-hidden rounded-xl border border-[#cfe2fe] bg-[#f2f7ff] p-3">
            <div className="flex items-center gap-2 text-[#1b3a6b]">
              <span className="flex size-6 items-center justify-center rounded-full bg-[#0284c7] text-white">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </span>
              <h4 className="text-[12.5px] font-bold text-[#1b3a6b]">General Advice</h4>
            </div>
            <ol className="mt-2 space-y-1 pl-3 text-[11px] text-[#1e293b]">
              {adviceList.map((adv, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="font-semibold text-[#0284c7]">{i + 1}.</span>
                  <span>{adv}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ========================================================= */}
        {/* BOTTOM ROW: FOLLOW-UP & DOCTOR REVIEW                     */}
        {/* ========================================================= */}
        <section className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {/* Left: Follow-up */}
          <div className="overflow-hidden rounded-xl border border-[#ddd6fe] bg-[#faf8ff] p-3">
            <div className="flex items-center gap-2 text-[#581c87]">
              <span className="flex size-6 items-center justify-center rounded-full bg-[#7c3aed] text-white">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <h4 className="text-[12.5px] font-bold text-[#4c1d95]">Follow-up</h4>
            </div>

            <div className="mt-2 space-y-1 text-[11px]">
              <div className="grid grid-cols-[125px_10px_1fr] items-baseline">
                <span className="font-semibold text-[#4b5563]">Follow-up Date</span>
                <span>:</span>
                <span className="font-bold text-[#1e293b]">{followUpDate}</span>
              </div>
              <div className="grid grid-cols-[125px_10px_1fr] items-baseline">
                <span className="font-semibold text-[#4b5563]">Follow-up Instructions</span>
                <span>:</span>
                <span className="text-[#334155]">{followUpInstructions}</span>
              </div>
            </div>
          </div>

          {/* Right: Doctor Review & Approval */}
          <div className="overflow-hidden rounded-xl border border-[#cfe2fe] bg-[#f2f7ff] p-3">
            <div className="flex items-center gap-2 text-[#1b3a6b]">
              <span className="flex size-6 items-center justify-center rounded-full bg-[#0284c7] text-white">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <h4 className="text-[12.5px] font-bold text-[#1b3a6b]">
                Doctor Review & Approval
              </h4>
            </div>
            <p className="mt-1 text-[10px] text-[#64748b]">
              AI-generated draft reviewed and approved by the authorized physician.
            </p>

            <div className="mt-2 flex items-center justify-between gap-2">
              {/* Doctor Signature & Info */}
              <div className="min-w-0">
                {/* Stylized Doctor Signature Graphic */}
                <div className="h-8 w-36">
                  <svg viewBox="0 0 160 45" className="h-full w-full overflow-visible">
                    <path
                      d="M 10 32 C 18 10 24 4 30 18 C 36 32 40 12 48 24 Q 60 4 75 22 T 95 24 Q 110 32 125 18 L 145 28"
                      fill="none"
                      stroke="#1e3a8a"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M 12 36 L 150 34"
                      fill="none"
                      stroke="#1e3a8a"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="border-t border-[#94a3b8] pt-1">
                  <p className="font-bold text-[12px] text-[#1b3a6b] leading-tight">
                    {doctorDisplayName}
                  </p>
                  <p className="text-[10px] text-[#475569]">{doctorSpecialty}</p>
                  <p className="text-[9.5px] text-[#64748b]">{doctorReg}</p>
                </div>
              </div>

              {/* Official Circular Stamp / Seal */}
              <div className="relative shrink-0">
                <svg
                  width="86"
                  height="86"
                  viewBox="0 0 120 120"
                  className="rotate-[-2deg] select-none text-[#1e3a8a] opacity-90"
                >
                  {/* Outer circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r="56"
                    fill="none"
                    stroke="#1e3a8a"
                    strokeWidth="2.5"
                  />
                  {/* Inner circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r="47"
                    fill="none"
                    stroke="#1e3a8a"
                    strokeWidth="1.2"
                    strokeDasharray="2.5 1.5"
                  />

                  {/* Arched top text: GMR Varalakshmi CARE Hospital */}
                  <path
                    id="stampTopCurve"
                    d="M 18 60 A 42 42 0 0 1 102 60"
                    fill="none"
                  />
                  <text className="fill-[#1e3a8a] text-[8.5px] font-black uppercase tracking-tight">
                    <textPath href="#stampTopCurve" startOffset="50%" textAnchor="middle">
                      GMR Varalakshmi CARE Hospital
                    </textPath>
                  </text>

                  {/* Arched bottom text: Rajam, Srikakulam Dist. */}
                  <path
                    id="stampBottomCurve"
                    d="M 102 60 A 42 42 0 0 1 18 60"
                    fill="none"
                  />
                  <text className="fill-[#1e3a8a] text-[8px] font-bold uppercase tracking-wider">
                    <textPath href="#stampBottomCurve" startOffset="50%" textAnchor="middle">
                      Rajam, Srikakulam Dist.
                    </textPath>
                  </text>

                  {/* Center emblem */}
                  <g transform="translate(42, 42)">
                    <rect x="12" y="4" width="12" height="26" fill="#1e3a8a" rx="1" />
                    <rect x="5" y="11" width="26" height="12" fill="#1e3a8a" rx="1" />
                    <circle cx="18" cy="17" r="4" fill="white" />
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* BOTTOM METRICS & FOOTER                                   */}
        {/* ========================================================= */}
        <footer className="mt-4 flex flex-col gap-2">
          {/* Row with MediScribe bot credit and status badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0284c7]">
              <span className="flex size-5 items-center justify-center rounded-sm bg-[#0284c7] text-white">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.38-1 1.72V7h2a5 5 0 0 1 5 5v1h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v1a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-1H3a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h1v-1a5 5 0 0 1 5-5h2V5.72A2 2 0 0 1 10 4a2 2 0 0 1 2-2zM7.5 12a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
                </svg>
              </span>
              <span>
                Clinical Documentation powered by{" "}
                <strong className="font-bold text-[#0369a1]">MediScribe AI</strong>
              </span>
            </div>

            <span className="rounded-xs bg-[#c7d2fe] px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[#3730a3]">
              {data.isSample ? "SAMPLE / DEMO" : "OFFICIAL PRESCRIPTION"}
            </span>
          </div>

          {/* Cyan validity disclaimer banner */}
          <div className="rounded-sm bg-[#e0f2fe]/70 py-1 text-center text-[10.5px] italic text-[#0369a1]">
            This prescription is valid only after review and approval by the authorized physician.
          </div>

          {/* Motto line */}
          <div className="flex items-center justify-center gap-2 pt-0.5 font-serif text-[11px] font-semibold tracking-wide text-[#1b3a6b]">
            <span>Better Care</span>
            <span className="text-[#94a3b8]">|</span>
            <span>Brighter Lives</span>
            <span className="text-[#94a3b8]">|</span>
            <span>Stronger Communities</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
