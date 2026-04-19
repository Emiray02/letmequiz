import { emitRealtimeSync } from "@/lib/realtime-sync";

export type TelcSectionTimingMinutes = {
  lesen: number;
  hoeren: number;
  schreiben: number;
  sprechen: number;
};

export type TelcSectionScores = {
  lesen: number;
  hoeren: number;
  schreiben: number;
  sprechen: number;
  overall: number;
  mode?: "quick" | "full";
  timingTargetMinutes?: TelcSectionTimingMinutes;
  timingUsedMinutes?: TelcSectionTimingMinutes;
  timingCompliance?: number;
  createdAt: string;
};

import { profileScopedKey } from "@/lib/profile-store";

function telcExamDateKey() {
  return profileScopedKey("letmequiz.telcA2.examDate");
}
function telcResultsKey() {
  return profileScopedKey("letmequiz.telcA2.mockResults");
}

function isBrowser() {
  return typeof window !== "undefined";
}

function safeRead<T>(key: string, fallback: T): T {
  if (!isBrowser()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write errors.
  }

  emitRealtimeSync("telc-a2");
}

export function getTelcExamDate(): string {
  return safeRead<string>(telcExamDateKey(), "");
}

export function setTelcExamDate(value: string) {
  safeWrite(telcExamDateKey(), value);
}

export function getTelcMockResults(limit = 20): TelcSectionScores[] {
  const items = safeRead<TelcSectionScores[]>(telcResultsKey(), []);
  return items
    .filter((item) => typeof item?.overall === "number" && typeof item?.createdAt === "string")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function addTelcMockResult(item: TelcSectionScores) {
  const next = [item, ...getTelcMockResults(200)].slice(0, 200);
  safeWrite(telcResultsKey(), next);
}

export function getTelcResultTrend(limit = 12): Array<{
  createdAt: string;
  overall: number;
  lesen: number;
  hoeren: number;
  schreiben: number;
  sprechen: number;
}> {
  return getTelcMockResults(limit)
    .slice()
    .reverse()
    .map((item) => ({
      createdAt: item.createdAt,
      overall: item.overall,
      lesen: item.lesen,
      hoeren: item.hoeren,
      schreiben: item.schreiben,
      sprechen: item.sprechen,
    }));
}
