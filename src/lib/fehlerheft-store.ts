"use client";

/** Hata defteri — AI feedback'ten gelen düzeltmeler ve manuel girişler. */

import { profileScopedKey } from "@/lib/profile-store";

export type FehlerEntry = {
  id: string;
  at: string;            // ISO
  source: "schreiben" | "sprechen" | "lesen" | "hoeren" | "diktat" | "manual";
  wrong: string;         // yanlış form
  right: string;         // doğru form
  reason: string;        // TR açıklama
  category: "grammatik" | "wortschatz" | "rechtschreibung" | "stil" | "andere";
  reviewCount: number;
  lastReviewedAt?: string;
  resolved?: boolean;
};

const KEY = () => profileScopedKey("letmequiz.fehlerheft.entries");

function isBrowser() { return typeof window !== "undefined"; }

function read(): FehlerEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY());
    return raw ? (JSON.parse(raw) as FehlerEntry[]) : [];
  } catch { return []; }
}

function write(arr: FehlerEntry[]) {
  if (!isBrowser()) return;
  try { window.localStorage.setItem(KEY(), JSON.stringify(arr)); } catch {}
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function listEntries(): FehlerEntry[] {
  return read().sort((a, b) => (a.at < b.at ? 1 : -1));
}

export function addEntry(e: Omit<FehlerEntry, "id" | "at" | "reviewCount">): FehlerEntry {
  const entry: FehlerEntry = {
    ...e,
    id: uid(),
    at: new Date().toISOString(),
    reviewCount: 0,
  };
  const arr = read();
  // De-duplicate same wrong/right within last 7 days
  const cutoff = Date.now() - 7 * 86400000;
  const exists = arr.some(x =>
    x.wrong.trim().toLowerCase() === entry.wrong.trim().toLowerCase() &&
    x.right.trim().toLowerCase() === entry.right.trim().toLowerCase() &&
    new Date(x.at).getTime() > cutoff
  );
  if (exists) return entry;
  arr.push(entry);
  write(arr);
  return entry;
}

export function addManyFromFeedback(corrections: Array<{wrong: string; right: string; reason: string; category: FehlerEntry["category"]}>, source: FehlerEntry["source"]) {
  for (const c of corrections) {
    if (!c.wrong || !c.right) continue;
    addEntry({ ...c, source });
  }
}

export function markReviewed(id: string) {
  const arr = read();
  const e = arr.find(x => x.id === id);
  if (e) {
    e.reviewCount += 1;
    e.lastReviewedAt = new Date().toISOString();
    write(arr);
  }
}

export function setResolved(id: string, resolved: boolean) {
  const arr = read();
  const e = arr.find(x => x.id === id);
  if (e) { e.resolved = resolved; write(arr); }
}

export function deleteEntry(id: string) {
  write(read().filter(x => x.id !== id));
}

export function clearAll() { write([]); }

export function pickWeeklyQuiz(n = 10): FehlerEntry[] {
  const arr = read().filter(x => !x.resolved);
  if (arr.length === 0) return [];
  // Lowest reviewCount first, then oldest
  arr.sort((a, b) => a.reviewCount - b.reviewCount || (a.at < b.at ? -1 : 1));
  return arr.slice(0, n);
}

export function counts(): { total: number; open: number; byCategory: Record<string, number> } {
  const arr = read();
  const open = arr.filter(x => !x.resolved).length;
  const byCategory: Record<string, number> = {};
  for (const e of arr) byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
  return { total: arr.length, open, byCategory };
}
