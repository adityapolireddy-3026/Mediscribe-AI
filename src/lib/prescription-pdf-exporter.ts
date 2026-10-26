import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import React from "react";
import { createRoot } from "react-dom/client";
import {
  PrescriptionTemplate,
  type PrescriptionData,
} from "@/components/prescriptions/prescription-template";
import { downloadPrescriptionPdf, type PrescriptionPdfInput } from "./pdf";

/**
 * Captures an existing DOM element and generates a full-page A4 PDF.
 * Uses 2x Retina scale for crystal-clear text and SVG rendering.
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2.2, // Crisp, print-ready 200+ DPI
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    scrollX: 0,
    scrollY: 0,
    windowWidth: 1200, // Force desktop width media queries for clean layout
    onclone: (clonedDoc) => {
      // html2canvas does not support CSS oklch() color functions; replace with fallback hex in cloned doc
      const styles = clonedDoc.querySelectorAll("style");
      styles.forEach((s) => {
        if (s.textContent && s.textContent.includes("oklch")) {
          s.textContent = s.textContent.replace(/oklch\([^)]+\)/g, "#64748b");
        }
      });

      const clonedEl = clonedDoc.querySelector(".prescription-root") as HTMLElement | null;
      if (clonedEl) {
        clonedEl.style.boxShadow = "none";
        clonedEl.style.margin = "0 auto";
        clonedEl.style.width = "820px";
        clonedEl.style.maxWidth = "820px";
        clonedEl.style.background = "#ffffff";
      }
    },
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.98);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth(); // 595.28 pt
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 841.89 pt

  // Calculate proportional height
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  if (imgHeight <= pdfHeight) {
    // Fill the full page A4 height seamlessly
    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
  } else {
    // Fit to page height so everything stays on 1 clean page
    const scaleFactor = pdfHeight / imgHeight;
    const finalWidth = pdfWidth * scaleFactor;
    const offsetX = (pdfWidth - finalWidth) / 2;
    pdf.addImage(imgData, "JPEG", offsetX, 0, finalWidth, pdfHeight, undefined, "FAST");
  }

  pdf.save(filename);
}

/**
 * Mounts an offscreen <PrescriptionTemplate /> container, captures it via html2canvas,
 * and downloads a pixel-perfect A4 PDF. Falls back to programmatic jsPDF if DOM fails.
 */
export async function downloadPrescriptionHtmlPdf(
  data: PrescriptionData,
  fallbackInput?: PrescriptionPdfInput,
): Promise<void> {
  const safeName = (data.patient?.full_name || "patient")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toLowerCase();
  const filename = `prescription-${data.prescriptionNumber}-${safeName}.pdf`;

  if (typeof document === "undefined") {
    // Server or non-DOM environment fallback
    if (fallbackInput) downloadPrescriptionPdf(fallbackInput);
    return;
  }

  // Check if a live prescription root is already present in the active DOM (e.g. preview dialog)
  const existingRoot = document.querySelector(".prescription-root") as HTMLElement | null;
  if (existingRoot && existingRoot.offsetParent !== null) {
    try {
      await downloadElementAsPdf(existingRoot, filename);
      return;
    } catch (err) {
      console.warn("Live DOM PDF export failed, falling back to offscreen mount:", err);
    }
  }

  // Create an offscreen mount
  const mount = document.createElement("div");
  mount.id = "offscreen-prescription-mount";
  mount.style.position = "fixed";
  mount.style.top = "0";
  mount.style.left = "-10000px";
  mount.style.width = "820px";
  mount.style.background = "#ffffff";
  mount.style.zIndex = "-99999";
  mount.style.opacity = "0";
  mount.style.pointerEvents = "none";
  document.body.appendChild(mount);

  try {
    const root = createRoot(mount);
    root.render(
      React.createElement(PrescriptionTemplate, {
        data,
        className: "w-[820px] max-w-[820px]",
      }),
    );

    // Allow browser time to render DOM, load fonts, and evaluate CSS
    await new Promise((resolve) => setTimeout(resolve, 200));

    const target = (mount.firstElementChild as HTMLElement) || mount;
    await downloadElementAsPdf(target, filename);

    root.unmount();
  } catch (err) {
    console.warn("Offscreen HTML PDF export failed, using calibrated jsPDF fallback:", err);
    if (fallbackInput) {
      downloadPrescriptionPdf(fallbackInput);
    } else {
      throw err;
    }
  } finally {
    mount.remove();
  }
}
