import "server-only";
import fs from "node:fs";
import path from "node:path";

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
  folder: string; // e.g. Auf_jeden_Fall_A1_1_Track_001-016
  trackRange: string; // 001-016
  url: string; // /materials/<folder>
  files: MaterialFile[];
};

export type MaterialsCatalog = {
  pdfs: MaterialPdf[];
  audio: AudioCollection[];
  totals: { pdfCount: number; audioCount: number; totalSizeMB: number };
};

const MATERIALS_DIR = path.join(process.cwd(), "public", "materials");
const URL_PREFIX = "/materials";

let cached: MaterialsCatalog | null = null;

function safeStat(p: string) {
  try { return fs.statSync(p); } catch { return null; }
}

function classifyPdf(name: string): MaterialPdf {
  const url = `${URL_PREFIX}/${encodeURI(name)}`;
  const size = safeStat(path.join(MATERIALS_DIR, name))?.size ?? 0;

  let series: MaterialPdf["series"] = "Diğer";
  if (name.startsWith("Einfach_gut")) series = "Einfach gut";
  else if (name.startsWith("Auf_jeden_Fall")) series = "Auf jeden Fall";

  let level: MaterialPdf["level"] = "Karışık";
  if (name.includes("A1.1") || name.includes("A1_1")) level = "A1.1";
  else if (name.includes("A1.2") || name.includes("A1_2")) level = "A1.2";
  else if (name.includes("A2.1") || name.includes("A2_1")) level = "A2.1";
  else if (name.includes("A2.2") || name.includes("A2_2")) level = "A2.2";

  let kind: MaterialPdf["kind"] = "Diğer";
  if (/Lesetext/i.test(name)) kind = "Lesetext";
  else if (/Wortschatz/i.test(name)) kind = "Wortschatz";
  else if (/Hoertexte|Hörtexte/i.test(name)) kind = "Hörtexte (transkript)";
  else if (/Loesung|Lösung/i.test(name)) kind = "Lösungen";
  else if (/Transkripte_Videos/i.test(name)) kind = "Video transkript";

  let lektion: string | undefined;
  let topic: string | undefined;
  const lekMatch = name.match(/Lektion_(\d+)_Lesetext_([^.]+)\.pdf$/i);
  if (lekMatch) {
    lektion = `Lektion ${lekMatch[1]}`;
    topic = lekMatch[2].replace(/_/g, " ");
  }

  return {
    name,
    url,
    series,
    level,
    kind,
    lektion,
    topic,
    sizeBytes: size,
  };
}

function readAudioFolder(folderName: string): AudioCollection | null {
  const m = folderName.match(/Auf_jeden_Fall_(A\d)_(\d)_Track_([\d-]+)/);
  if (!m) return null;
  const level = `${m[1]}.${m[2]}` as AudioCollection["level"];
  const trackRange = m[3];
  const folderPath = path.join(MATERIALS_DIR, folderName);
  const entries = fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".mp3"))
    .sort((a, b) => a.name.localeCompare(b.name));
  const files: MaterialFile[] = entries.map((e) => {
    const p = path.join(folderPath, e.name);
    const stat = safeStat(p);
    return {
      name: e.name,
      url: `${URL_PREFIX}/${encodeURI(folderName)}/${encodeURI(e.name)}`,
      sizeBytes: stat?.size ?? 0,
      ext: "mp3",
    };
  });
  return {
    level,
    folder: folderName,
    trackRange,
    url: `${URL_PREFIX}/${encodeURI(folderName)}`,
    files,
  };
}

export function getMaterialsCatalog(): MaterialsCatalog {
  if (cached) return cached;
  if (!fs.existsSync(MATERIALS_DIR)) {
    cached = { pdfs: [], audio: [], totals: { pdfCount: 0, audioCount: 0, totalSizeMB: 0 } };
    return cached;
  }
  const entries = fs.readdirSync(MATERIALS_DIR, { withFileTypes: true });
  const pdfs: MaterialPdf[] = [];
  const audio: AudioCollection[] = [];
  for (const e of entries) {
    if (e.isFile() && e.name.toLowerCase().endsWith(".pdf")) {
      pdfs.push(classifyPdf(e.name));
    } else if (e.isDirectory() && e.name.startsWith("Auf_jeden_Fall_")) {
      const ac = readAudioFolder(e.name);
      if (ac) audio.push(ac);
    }
  }
  pdfs.sort((a, b) => a.name.localeCompare(b.name));
  audio.sort((a, b) => a.folder.localeCompare(b.folder));
  const audioCount = audio.reduce((s, a) => s + a.files.length, 0);
  const totalBytes =
    pdfs.reduce((s, p) => s + p.sizeBytes, 0) +
    audio.reduce((s, a) => s + a.files.reduce((x, f) => x + f.sizeBytes, 0), 0);
  cached = {
    pdfs,
    audio,
    totals: { pdfCount: pdfs.length, audioCount, totalSizeMB: Math.round(totalBytes / (1024 * 1024)) },
  };
  return cached;
}

export function getLesetexte(level?: MaterialPdf["level"]): MaterialPdf[] {
  return getMaterialsCatalog().pdfs.filter(
    (p) => p.kind === "Lesetext" && (!level || p.level === level),
  );
}

export function getWortschatz(): MaterialPdf[] {
  return getMaterialsCatalog().pdfs.filter((p) => p.kind === "Wortschatz");
}

export function getHoertexteTranscripts(): MaterialPdf[] {
  return getMaterialsCatalog().pdfs.filter((p) => p.kind === "Hörtexte (transkript)");
}

export function getAudioByLevel(level: AudioCollection["level"]): AudioCollection[] {
  return getMaterialsCatalog().audio.filter((a) => a.level === level);
}

export function getAllAudioFlat(): { level: AudioCollection["level"]; track: MaterialFile }[] {
  const out: { level: AudioCollection["level"]; track: MaterialFile }[] = [];
  for (const a of getMaterialsCatalog().audio) {
    for (const f of a.files) out.push({ level: a.level, track: f });
  }
  return out;
}
