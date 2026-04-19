import { emitRealtimeSync } from "@/lib/realtime-sync";

export type CefrPlacementLevel = "A1" | "A2" | "B1";

export type CefrPlacementAttempt = {
  id: string;
  answers: number[];
  score: number;
  level: CefrPlacementLevel;
  createdAt: string;
};

export type CefrPlacementState = {
  currentLevel: CefrPlacementLevel | null;
  lastScore: number;
  lastTakenAt: string;
  attempts: CefrPlacementAttempt[];
};

const CEFR_PLACEMENT_KEY = "letmequiz.cefr.placement";

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
    // Ignore localStorage write failures.
  }

  emitRealtimeSync("cefr-placement");
}

function defaultState(): CefrPlacementState {
  return {
    currentLevel: null,
    lastScore: 0,
    lastTakenAt: "",
    attempts: [],
  };
}

function scoreToLevel(score: number): CefrPlacementLevel {
  if (score <= 9) {
    return "A1";
  }
  if (score <= 17) {
    return "A2";
  }
  return "B1";
}

export function getCefrPlacementState(): CefrPlacementState {
  const state = safeRead<CefrPlacementState>(CEFR_PLACEMENT_KEY, defaultState());
  return {
    ...defaultState(),
    ...state,
    attempts: Array.isArray(state.attempts) ? state.attempts.slice(0, 24) : [],
  };
}

export function saveCefrPlacementAttempt(answers: number[]): CefrPlacementAttempt {
  const sanitized = answers.map((value) => Math.max(0, Math.min(3, Math.round(value))));
  const score = sanitized.reduce((sum, value) => sum + value, 0);
  const level = scoreToLevel(score);

  const attempt: CefrPlacementAttempt = {
    id: crypto.randomUUID(),
    answers: sanitized,
    score,
    level,
    createdAt: new Date().toISOString(),
  };

  const current = getCefrPlacementState();
  const next: CefrPlacementState = {
    currentLevel: level,
    lastScore: score,
    lastTakenAt: attempt.createdAt,
    attempts: [attempt, ...current.attempts].slice(0, 24),
  };

  safeWrite(CEFR_PLACEMENT_KEY, next);
  return attempt;
}

export function setManualCefrPlacementLevel(level: CefrPlacementLevel) {
  const current = getCefrPlacementState();
  const next: CefrPlacementState = {
    ...current,
    currentLevel: level,
    lastTakenAt: current.lastTakenAt || new Date().toISOString(),
  };
  safeWrite(CEFR_PLACEMENT_KEY, next);
}

export function getRecommendedCefrLevel(): CefrPlacementLevel {
  return getCefrPlacementState().currentLevel ?? "A1";
}
