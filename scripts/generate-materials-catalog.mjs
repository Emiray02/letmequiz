#!/usr/bin/env node
// Pre-generates the materials catalog at build time so the production server
// does not need to do fs.readdirSync on /public/materials (which causes
// Next.js to trace the entire 450+ MB folder into the serverless function).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const MATERIALS_DIR = path.join(ROOT, "public", "materials");
const OUT_FILE = path.join(ROOT, "src", "lib", "materials-data", "catalog.json");
const URL_PREFIX = "/materials";

function safeStat(p) {
  try { return fs.statSync(p); } catch { return null; }
}

function classifyPdf(name) {
  const url = `${URL_PREFIX}/${encodeURI(name)}`;
  const size = safeStat(path.join(MATERIALS_DIR, name))?.size ?? 0;

  let series = "Diğer";
  if (name.startsWith("Einfach_gut")) series = "Einfach gut";
  else if (name.startsWith("Auf_jeden_Fall")) series = "Auf jeden Fall";

  let level = "Karışık";
  if (name.includes("A1.1") || name.includes("A1_1")) level = "A1.1";
  else if (name.includes("A1.2") || name.includes("A1_2")) level = "A1.2";
  else if (name.includes("A2.1") || name.includes("A2_1")) level = "A2.1";
  else if (name.includes("A2.2") || name.includes("A2_2")) level = "A2.2";

  let kind = "Diğer";
  if (/Lesetext/i.test(name)) kind = "Lesetext";
  else if (/Wortschatz/i.test(name)) kind = "Wortschatz";
  else if (/Hoertexte|Hörtexte/i.test(name)) kind = "Hörtexte (transkript)";
  else if (/Loesung|Lösung/i.test(name)) kind = "Lösungen";
  else if (/Transkripte_Videos/i.test(name)) kind = "Video transkript";

  let lektion;
  let topic;
  const lekMatch = name.match(/Lektion_(\d+)_Lesetext_([^.]+)\.pdf$/i);
  if (lekMatch) {
    lektion = `Lektion ${lekMatch[1]}`;
    topic = lekMatch[2].replace(/_/g, " ");
  }

  return { name, url, series, level, kind, lektion, topic, sizeBytes: size };
}

function readAudioFolder(folderName) {
  const m = folderName.match(/Auf_jeden_Fall_(A\d)_(\d)_Track_([\d-]+)/);
  if (!m) return null;
  const level = `${m[1]}.${m[2]}`;
  const trackRange = m[3];
  const folderPath = path.join(MATERIALS_DIR, folderName);
  const entries = fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".mp3"))
    .sort((a, b) => a.name.localeCompare(b.name));
  const files = entries.map((e) => {
    const p = path.join(folderPath, e.name);
    const stat = safeStat(p);
    return {
      name: e.name,
      url: `${URL_PREFIX}/${encodeURI(folderName)}/${encodeURI(e.name)}`,
      sizeBytes: stat?.size ?? 0,
      ext: "mp3",
    };
  });
  return { level, folder: folderName, trackRange, url: `${URL_PREFIX}/${encodeURI(folderName)}`, files };
}

function build() {
  if (!fs.existsSync(MATERIALS_DIR)) {
    console.warn(`[materials-catalog] ${MATERIALS_DIR} not found – writing empty catalog.`);
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify({ pdfs: [], audio: [], totals: { pdfCount: 0, audioCount: 0, totalSizeMB: 0 } }, null, 2));
    return;
  }
  const entries = fs.readdirSync(MATERIALS_DIR, { withFileTypes: true });
  const pdfs = [];
  const audio = [];
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
  const catalog = {
    pdfs,
    audio,
    totals: { pdfCount: pdfs.length, audioCount, totalSizeMB: Math.round(totalBytes / (1024 * 1024)) },
  };
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(catalog, null, 2));
  console.log(`[materials-catalog] wrote ${pdfs.length} pdfs + ${audioCount} audio (${catalog.totals.totalSizeMB} MB) → ${path.relative(ROOT, OUT_FILE)}`);
}

build();
