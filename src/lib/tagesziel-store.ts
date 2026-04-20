"use client";

/** Günlük çalışma hedefi — streak, görev tamamlama, gün başına XP. */

import { profileScopedKey } from "@/lib/profile-store";

export type DailyTask = {
  id: string;
  title: string;
  href: string;
  target: number;        // ör. 10 kart, 1 metin
  unit: string;          // "kart" | "metin" | "dakika"
  done: number;
};

export type TagesZiel = {
  date: string;          // YYYY-MM-DD
  tasks: DailyTask[];
  xp: number;
  completedAt?: string;
};

export type Streak = {
  current: number;
  longest: number;
  lastDay: string | null;
};

const KEY_TODAY  = () => profileScopedKey("letmequiz.tagesziel.today");
const KEY_STREAK = () => profileScopedKey("letmequiz.tagesziel.streak");

function isBrowser() { return typeof window !== "undefined"; }
function todayISO(): string { return new Date().toISOString().slice(0, 10); }

const DEFAULT_TASKS: Omit<DailyTask, "done">[] = [
  { id: "srs",   title: "10 SRS kartı tekrarla",       href: "/wortschatz",     target: 10, unit: "kart"   },
  { id: "lesen", title: "1 Lesetext oku + özetle",      href: "/skills/lesen",   target: 1,  unit: "metin"  },
  { id: "diktat",title: "5 dakika Diktat",              href: "/deutsch/diktat", target: 5,  unit: "dakika" },
];

export function getTagesZiel(): TagesZiel {
  if (!isBrowser()) return { date: todayISO(), tasks: DEFAULT_TASKS.map(t => ({...t, done: 0})), xp: 0 };
  try {
    const raw = window.localStorage.getItem(KEY_TODAY());
    if (raw) {
      const parsed = JSON.parse(raw) as TagesZiel;
      if (parsed.date === todayISO()) return parsed;
    }
  } catch {}
  // New day — reset
  const fresh: TagesZiel = { date: todayISO(), tasks: DEFAULT_TASKS.map(t => ({...t, done: 0})), xp: 0 };
  saveTagesZiel(fresh);
  return fresh;
}

export function saveTagesZiel(z: TagesZiel) {
  if (!isBrowser()) return;
  try { window.localStorage.setItem(KEY_TODAY(), JSON.stringify(z)); } catch {}
}

export function bumpTask(taskId: string, delta = 1): TagesZiel {
  const z = getTagesZiel();
  const t = z.tasks.find(x => x.id === taskId);
  if (t) {
    t.done = Math.min(t.target, t.done + delta);
    z.xp += delta * 5;
  }
  if (z.tasks.every(x => x.done >= x.target) && !z.completedAt) {
    z.completedAt = new Date().toISOString();
    bumpStreak();
  }
  saveTagesZiel(z);
  return z;
}

export function getStreak(): Streak {
  if (!isBrowser()) return { current: 0, longest: 0, lastDay: null };
  try {
    const raw = window.localStorage.getItem(KEY_STREAK());
    if (raw) return JSON.parse(raw) as Streak;
  } catch {}
  return { current: 0, longest: 0, lastDay: null };
}

export function bumpStreak(): Streak {
  const s = getStreak();
  const today = todayISO();
  if (s.lastDay === today) return s;
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  s.current = (s.lastDay === yest) ? s.current + 1 : 1;
  s.longest = Math.max(s.longest, s.current);
  s.lastDay = today;
  if (isBrowser()) {
    try { window.localStorage.setItem(KEY_STREAK(), JSON.stringify(s)); } catch {}
  }
  return s;
}

export function progressPercent(z: TagesZiel): number {
  const total = z.tasks.reduce((s, t) => s + t.target, 0);
  const done  = z.tasks.reduce((s, t) => s + Math.min(t.done, t.target), 0);
  return total > 0 ? Math.round((done / total) * 100) : 0;
}
