// Pure JSON-backed materials catalog. Generated at build time by
// scripts/generate-materials-catalog.mjs (npm run prebuild). The production
// server never reads /public/materials at request time — that would cause
// Next.js to trace ~460 MB of PDFs/mp3s into the serverless function bundle
// and exceed Vercel's 300 MB function size limit.
import catalogJson from "./materials-data/catalog.json";

export type MaterialFile = {
  name: string;
  url: string;
  sizeBytes: number;
  ext: string;
};

export type MaterialFolder = {
  name: string;
  url: string;
  files: MaterialFile[];
  totalSize: number;
};

export type MaterialPdf = {
  name: string;
  url: string;
  series: "Einfach gut" | "Auf jeden Fall" | "Diğer";
  level: "A1.1" | "A1.2" | "A2.1" | "A2.2" | "Karışık";
  kind:
    | "Lesetext"
    | "Wortschatz"
    | "Hörtexte (transkript)"
    | "Lösungen"
    | "Video transkript"
    | "Diğer";
  lektion?: string;
  topic?: string;
  sizeBytes: number;
};

export type AudioCollection = {
  level: "A1.1" | "A1.2" | "A2.1" | "A2.2";
  folder: string;
  trackRange: string;
  url: string;
  files: MaterialFile[];
};

export type MaterialsCatalog = {
  pdfs: MaterialPdf[];
  audio: AudioCollection[];
  totals: { pdfCount: number; audioCount: number; totalSizeMB: number };
};

const CATALOG = catalogJson as MaterialsCatalog;

export function getMaterialsCatalog(): MaterialsCatalog {
  return CATALOG;
}

export function getLesetexte(level?: MaterialPdf["level"]): MaterialPdf[] {
  return CATALOG.pdfs.filter(
    (p) => p.kind === "Lesetext" && (!level || p.level === level),
  );
}

export function getWortschatz(): MaterialPdf[] {
  return CATALOG.pdfs.filter((p) => p.kind === "Wortschatz");
}

export function getHoertexteTranscripts(): MaterialPdf[] {
  return CATALOG.pdfs.filter((p) => p.kind === "Hörtexte (transkript)");
}

export function getAudioByLevel(level: AudioCollection["level"]): AudioCollection[] {
  return CATALOG.audio.filter((a) => a.level === level);
}

export function getAllAudioFlat(): { level: AudioCollection["level"]; track: MaterialFile }[] {
  const out: { level: AudioCollection["level"]; track: MaterialFile }[] = [];
  for (const a of CATALOG.audio) {
    for (const f of a.files) out.push({ level: a.level, track: f });
  }
  return out;
}
