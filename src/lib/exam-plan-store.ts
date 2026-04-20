"use client";

import { profileScopedKey } from "@/lib/profile-store";

export type ExamProvider =
  | "telc"
  | "goethe"
  | "oesd"
  | "testdaf"
  | "dsh"
  | "tuef-yds"
  | "diger";

export type ExamLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type Skill = "lesen" | "hoeren" | "schreiben" | "sprechen";

export type ExamSettings = {
  provider: ExamProvider;
  level: ExamLevel;
  examDate: string; // ISO date YYYY-MM-DD
  hoursPerDay: number;
  weakestSkill?: Skill | null;
  lastUpdated: string;
};

export type SkillScore = {
  skill: Skill;
  scorePct: number; // 0-100
  recordedAt: string;
};

export type ExamSimulationResult = {
  id: string;
  provider: ExamProvider;
  level: ExamLevel;
  scores: Record<Skill, number>; // 0-100 each
  overall: number;
  durationMinutes: number;
  recordedAt: string;
};

const SETTINGS_KEY = "letmequiz.examPlan.settings";
const RESULTS_KEY = "letmequiz.examPlan.results";

function isBrowser() {
  return typeof window !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(profileScopedKey(key));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(profileScopedKey(key), JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function getExamSettings(): ExamSettings | null {
  return read<ExamSettings | null>(SETTINGS_KEY, null);
}

export function saveExamSettings(settings: Omit<ExamSettings, "lastUpdated">) {
  const next: ExamSettings = { ...settings, lastUpdated: new Date().toISOString() };
  write(SETTINGS_KEY, next);
  return next;
}

export function clearExamSettings() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(profileScopedKey(SETTINGS_KEY));
  } catch {
    /* ignore */
  }
}

export function listExamResults(): ExamSimulationResult[] {
  return read<ExamSimulationResult[]>(RESULTS_KEY, []);
}

export function addExamResult(input: Omit<ExamSimulationResult, "id" | "recordedAt">) {
  const result: ExamSimulationResult = {
    ...input,
    id: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    recordedAt: new Date().toISOString(),
  };
  const all = listExamResults();
  all.unshift(result);
  write(RESULTS_KEY, all.slice(0, 25));
  return result;
}

export function daysUntilExam(settings: ExamSettings | null): number | null {
  if (!settings?.examDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(settings.examDate + "T00:00:00");
  const diff = Math.ceil((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  return diff;
}

/** Her sınav sağlayıcısının resmi süre/format bilgisi. */
export const EXAM_FORMATS: Record<
  ExamProvider,
  { label: string; sections: Record<Skill, { minutes: number; weight: number }> }
> = {
  telc: {
    label: "telc Deutsch",
    sections: {
      lesen: { minutes: 90, weight: 25 },
      hoeren: { minutes: 30, weight: 25 },
      schreiben: { minutes: 30, weight: 25 },
      sprechen: { minutes: 15, weight: 25 },
    },
  },
  goethe: {
    label: "Goethe-Zertifikat",
    sections: {
      lesen: { minutes: 65, weight: 25 },
      hoeren: { minutes: 40, weight: 25 },
      schreiben: { minutes: 75, weight: 25 },
      sprechen: { minutes: 15, weight: 25 },
    },
  },
  oesd: {
    label: "ÖSD Zertifikat",
    sections: {
      lesen: { minutes: 90, weight: 25 },
      hoeren: { minutes: 40, weight: 25 },
      schreiben: { minutes: 60, weight: 25 },
      sprechen: { minutes: 15, weight: 25 },
    },
  },
  testdaf: {
    label: "TestDaF",
    sections: {
      lesen: { minutes: 60, weight: 25 },
      hoeren: { minutes: 40, weight: 25 },
      schreiben: { minutes: 60, weight: 25 },
      sprechen: { minutes: 30, weight: 25 },
    },
  },
  dsh: {
    label: "DSH",
    sections: {
      lesen: { minutes: 90, weight: 30 },
      hoeren: { minutes: 60, weight: 20 },
      schreiben: { minutes: 70, weight: 30 },
      sprechen: { minutes: 20, weight: 20 },
    },
  },
  "tuef-yds": {
    label: "YDS / e-YDS (Almanca)",
    sections: {
      lesen: { minutes: 110, weight: 60 },
      hoeren: { minutes: 0, weight: 0 },
      schreiben: { minutes: 30, weight: 20 },
      sprechen: { minutes: 0, weight: 20 },
    },
  },
  diger: {
    label: "Genel Almanca sınavı",
    sections: {
      lesen: { minutes: 60, weight: 25 },
      hoeren: { minutes: 40, weight: 25 },
      schreiben: { minutes: 60, weight: 25 },
      sprechen: { minutes: 15, weight: 25 },
    },
  },
};

/** Kişiye özel günlük dinamik plan. */
export type DailyTask = {
  skill: Skill | "vocab" | "grammar" | "review";
  title: string;
  durationMin: number;
  reason: string;
  href?: string;
};

export type DynamicPlan = {
  todayTasks: DailyTask[];
  weeklyFocus: string;
  examReadinessPct: number;
  weakestSkill: Skill | null;
  daysLeft: number | null;
  dailyMinutes: number;
};

const SKILL_LABELS: Record<Skill, string> = {
  lesen: "Okuma (Lesen)",
  hoeren: "Dinleme (Hören)",
  schreiben: "Yazma (Schreiben)",
  sprechen: "Konuşma (Sprechen)",
};

const SKILL_HREFS: Record<Skill, string> = {
  lesen: "/skills/lesen",
  hoeren: "/skills/hoeren",
  schreiben: "/skills/schreiben",
  sprechen: "/skills/sprechen",
};

export function buildDynamicPlan(
  settings: ExamSettings | null,
  results: ExamSimulationResult[],
): DynamicPlan {
  const daysLeft = daysUntilExam(settings);
  const dailyMinutes = Math.max(20, Math.round((settings?.hoursPerDay ?? 1) * 60));

  // Find weakest skill from latest result, falling back to settings.
  const latest = results[0];
  const skillScores: Record<Skill, number> = latest?.scores ?? {
    lesen: 50,
    hoeren: 50,
    schreiben: 50,
    sprechen: 50,
  };
  const skillEntries = (Object.entries(skillScores) as [Skill, number][]).sort((a, b) => a[1] - b[1]);
  const weakest = settings?.weakestSkill ?? skillEntries[0]?.[0] ?? null;

  const overall = latest?.overall ?? 50;
  const readiness = Math.round(
    Math.min(100, Math.max(0, overall + Math.min(30, results.length * 3))),
  );

  // Allocate daily minutes by inverse skill score (weaker → more time).
  const totalSkillMin = Math.max(20, Math.round(dailyMinutes * 0.7));
  const inverseWeights = skillEntries.map(([s, score]) => ({
    skill: s,
    weight: Math.max(5, 100 - score),
  }));
  const sumW = inverseWeights.reduce((acc, x) => acc + x.weight, 0);

  const todayTasks: DailyTask[] = inverseWeights.map(({ skill, weight }, idx) => ({
    skill,
    title: `${SKILL_LABELS[skill]} ${idx === 0 ? "(zayıf nokta)" : "pratiği"}`,
    durationMin: Math.max(8, Math.round((totalSkillMin * weight) / sumW)),
    reason: `Son simülasyonda %${skillScores[skill]} — interleaving + deliberate practice ile kapatıyoruz.`,
    href: SKILL_HREFS[skill],
  }));

  // Vocab + grammar + review wedges
  const remaining = Math.max(15, dailyMinutes - totalSkillMin);
  todayTasks.push(
    {
      skill: "vocab",
      title: "Kelime Lab — SRS tekrarı",
      durationMin: Math.round(remaining * 0.4),
      reason: "Aralıklı tekrar (Cepeda 2006) bugünkü unutulmaya eğilimli kartları kapatır.",
      href: "/deutsch",
    },
    {
      skill: "grammar",
      title: "Artikel & Verben drill",
      durationMin: Math.round(remaining * 0.35),
      reason: "Bilinçli pratik: yaptığın hataya kişisel feedback.",
      href: "/deutsch/artikel",
    },
    {
      skill: "review",
      title: "Hata Defteri tekrarı",
      durationMin: Math.max(5, Math.round(remaining * 0.25)),
      reason: "Aktif geri çağırma — son 7 gün hatalarını görüp yeniden yap.",
      href: "/analytics",
    },
  );

  let weeklyFocus = "Bilinçli pratik + interleaving";
  if (daysLeft != null) {
    if (daysLeft <= 7) weeklyFocus = "Sınav simülasyonu + zayıf bölüme yoğunlaş";
    else if (daysLeft <= 21) weeklyFocus = "Mock sınavlar + Schreiben/Sprechen geri bildirim";
    else if (daysLeft <= 60) weeklyFocus = "Tüm beceriler dengeli + günlük SRS";
    else weeklyFocus = "Kelime tabanını genişlet + dinleme alışkanlığı kur";
  }

  return {
    todayTasks,
    weeklyFocus,
    examReadinessPct: readiness,
    weakestSkill: weakest,
    daysLeft,
    dailyMinutes,
  };
}
