import lesetexteJson from "./materials-data/lesetexte.json";
import wortschatzJson from "./materials-data/wortschatz.json";
import hoertexteJson from "./materials-data/hoertexte.json";
import videoJson from "./materials-data/video-transkripte.json";

export type Level = "A1.1" | "A1.2" | "A2.1" | "A2.2";

export type Lesetext = {
  id: string;
  level: Level;
  lektion: number;
  topic: string;
  fileName: string;
  url: string;
  text: string;
  wordCount: number;
};

export type Hoertext = {
  id: string;
  level: Level;
  lektion: number;
  aufgabe: string;
  track: string;
  fileName: string;
  url: string;
  text: string;
  wordCount: number;
};

export type VideoTranskript = {
  id: string;
  level: Level;
  lektion: number;
  fileName: string;
  url: string;
  text: string;
  wordCount: number;
};

export type WortschatzEntry = {
  /** Article ("der" / "die" / "das") if structured. */
  artikel?: string | null;
  word?: string | null;
  plural?: string | null;
  inflection?: string | null;
  example?: string | null;
  /** Turkish translation if available. */
  tr?: string | null;
  /** Raw line if structure couldn't be detected. */
  raw?: string | null;
  /** German-only fallback fields. */
  de?: string | null;
  lektion?: number | null;
};

export type Wortschatz = {
  id: string;
  level: Level;
  language: "deutsch" | "tuerkisch";
  fileName: string;
  url: string;
  entries: WortschatzEntry[];
  entryCount: number;
};

export const LESETEXTE = lesetexteJson as Lesetext[];
export const HOERTEXTE = hoertexteJson as Hoertext[];
export const VIDEO_TRANSKRIPTE = videoJson as VideoTranskript[];
export const WORTSCHATZ = wortschatzJson as Wortschatz[];

export const ALL_LEVELS: Level[] = ["A1.1", "A1.2", "A2.1", "A2.2"];

export function lesetexteByLevel(level: Level): Lesetext[] {
  return LESETEXTE.filter((l) => l.level === level);
}

export function hoertexteByLevel(level: Level): Hoertext[] {
  return HOERTEXTE.filter((h) => h.level === level);
}

export function videosByLevel(level: Level): VideoTranskript[] {
  return VIDEO_TRANSKRIPTE.filter((v) => v.level === level);
}

export function wortschatzByLevel(level: Level): Wortschatz | undefined {
  return WORTSCHATZ.find((w) => w.level === level && w.language === "tuerkisch")
    ?? WORTSCHATZ.find((w) => w.level === level);
}

/** Returns only Wortschatz entries that have both a German word and a Turkish translation. */
export function bilingualEntries(level?: Level): WortschatzEntry[] {
  const sets = level
    ? WORTSCHATZ.filter((w) => w.level === level && w.language === "tuerkisch")
    : WORTSCHATZ.filter((w) => w.language === "tuerkisch");
  const all: WortschatzEntry[] = [];
  for (const set of sets) {
    for (const e of set.entries) {
      if (e.tr && (e.word || e.de)) all.push(e);
    }
  }
  return all;
}

/** Pick a Hörtext that matches a specific track number (e.g. "Track 12"). */
export function findHoertextByTrack(level: Level, trackNumber: number): Hoertext | undefined {
  return HOERTEXTE.find(
    (h) => h.level === level && h.track === `Track ${trackNumber}`,
  );
}

export function materialsTotals() {
  return {
    lesetexte: LESETEXTE.length,
    hoertexte: HOERTEXTE.length,
    videos: VIDEO_TRANSKRIPTE.length,
    wortschatzEntries: WORTSCHATZ.reduce((s, w) => s + w.entryCount, 0),
    bilingual: bilingualEntries().length,
  };
}
