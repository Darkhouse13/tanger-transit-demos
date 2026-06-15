/* =====================================================================
   Strait Systems — client-side document → text.
   Feeds the SAME /api/extract pipeline as paste, but from a real dropped file:
     • PDF  → pdfjs text layer (fast, offline). If the PDF is image-only
              (scanned), falls back to rendering pages + OCR.
     • image → Tesseract OCR (FR/EN).
   The heavy libraries (pdfjs, tesseract) are dynamically imported so they
   never touch the main bundle — they load only when a file is dropped.
   The structuring (text → {header, lines}) still happens server-side; here we
   only turn the document into text.
   ===================================================================== */

import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const MAX_CHARS = 20000; // server caps invoiceText at 24 KB — stay safely under

export function fileKind(file) {
  const name = (file.name || "").toLowerCase();
  const type = file.type || "";
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|gif|tiff?)$/.test(name)) return "image";
  return "other";
}

/* Returns extracted text (clipped). onProgress({ phase, label, pct }). */
export async function extractTextFromFile(file, onProgress = () => {}) {
  const kind = fileKind(file);
  if (kind === "pdf") return clip(await fromPdf(file, onProgress));
  if (kind === "image") return clip(await fromImage(file, onProgress));
  throw new Error("unsupported");
}

const clip = (t) => (t || "").slice(0, MAX_CHARS);

async function fromPdf(file, onProgress) {
  onProgress({ phase: "pdf", label: "d_drop_reading", pct: 0.08 });
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;

  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    pages.push(content.items.map((it) => it.str).join(" "));
    onProgress({ phase: "pdf", label: "d_drop_reading", pct: p / pdf.numPages });
  }
  const text = pages.join("\n").trim();

  /* No real text layer → scanned PDF → OCR the rendered pages. */
  if (text.replace(/\s/g, "").length < 24) return ocrPdf(pdf, onProgress);
  return text;
}

async function ocrPdf(pdf, onProgress) {
  const worker = await makeOcrWorker(onProgress);
  try {
    const out = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      const { data } = await worker.recognize(canvas);
      out.push(data.text || "");
    }
    return out.join("\n").trim();
  } finally {
    await worker.terminate();
  }
}

async function fromImage(file, onProgress) {
  const worker = await makeOcrWorker(onProgress);
  try {
    const { data } = await worker.recognize(file);
    return (data.text || "").trim();
  } finally {
    await worker.terminate();
  }
}

async function makeOcrWorker(onProgress) {
  onProgress({ phase: "ocr", label: "d_drop_ocr", pct: 0.02 });
  const { createWorker } = await import("tesseract.js");
  return createWorker("fra+eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text") onProgress({ phase: "ocr", label: "d_drop_ocr", pct: m.progress });
    },
  });
}
