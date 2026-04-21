/**
 * Local (no-account) self-serve exam plan + progress log.
 *
 * The user sets level + exam date on the home page; we generate the per-day
 * schedule from `exam-plan.ts` and remember done/weak/skipped checks per
 * (dayIndex, itemId) in localStorage. This lets the daily mode work without
 * a teacher account.
 *
 * Cloud (teacher-assigned) plan still wins when present.
 */

import {
  suggestDailyMinutes,
  todayISO,
  type CefrLevel,
  type DailyAdaptation,
} from "@/lib/exam-plan";

const PLAN_KEY     = "letmequiz.local.examplan";
const PROGRESS_KEY = "letmequiz.local.examplan.progress";

export type LocalExamPlan = {
  level: CefrLevel;
  examDate: string;        // YYYY-MM-DD
  startDate: string;       // YYYY-MM-DD (when the plan was created)
  dailyMinutes: number;    // 15..240 (auto-suggested by default)
  createdAt: string;       // ISO
};

export type LocalProgressEntry = {
  dayIndex: number;
  itemId: string;
  status: "done" | "skipped" | "weak";
  recordedAt: string;      // ISO
};

function isBrowser() { return typeof window !== "undefined"; }

export function loadLocalPlan(): LocalExamPlan | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as LocalExamPlan;
    if (!p?.level || !p?.examDate || !p?.startDate || !p?.dailyMinutes) return null;
    return p;
  } catch { return null; }
}

export function saveLocalPlan(plan: LocalExamPlan): void {
  if (!isBrowser()) return;
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

export function clearLocalPlan(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(PLAN_KEY);
  localStorage.removeItem(PROGRESS_KEY);
}

export function createLocalPlan(args: { level: CefrLevel; examDate: string; dailyMinutes?: number }): LocalExamPlan {
  const start = todayISO();
  const minutes = args.dailyMinutes ?? suggestDailyMinutes({
    level: args.level, examDate: args.examDate, startDate: start,
  });
  const plan: LocalExamPlan = {
    level: args.level,
    examDate: args.examDate,
    startDate: start,
    dailyMinutes: minutes,
    createdAt: new Date().toISOString(),
  };
  saveLocalPlan(plan);
  return plan;
}

export function listLocalProgress(): LocalProgressEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as LocalProgressEntry[]) : [];
  } catch { return []; }
}

export function recordLocalProgress(entry: Omit<LocalProgressEntry, "recordedAt">): void {
  if (!isBrowser()) return;
  const all = listLocalProgress();
  const idx = all.findIndex((e) => e.dayIndex === entry.dayIndex && e.itemId === entry.itemId);
  const next: LocalProgressEntry = { ...entry, recordedAt: new Date().toISOString() };
  if (idx >= 0) all[idx] = next; else all.push(next);
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
}

/**
 * Build the adaptation map (done + weak carry-over) from progress entries
 * BEFORE the given dayIndex. Items marked done after weak get pulled out
 * of weak so they don't repeat forever.
 */
export function adaptationFromLocalProgress(rows: LocalProgressEntry[], dayIndex: number): DailyAdaptation {
  const done = new Set<string>();
  const weak = new Set<string>();
  for (const r of rows) {
    if (r.dayIndex >= dayIndex) continue;
    if (r.status === "done") { done.add(r.itemId); weak.delete(r.itemId); }
    if (r.status === "weak") weak.add(r.itemId);
  }
  return { done, weak };
}
