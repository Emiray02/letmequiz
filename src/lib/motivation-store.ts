import type { StudentMetrics } from "@/types/student";
import { emitRealtimeSync } from "@/lib/realtime-sync";

export type MotivationBadgeDefinition = {
  id: string;
  title: string;
  description: string;
};

export type MotivationChallengeProgress = {
  id: string;
  title: string;
  progress: number;
  target: number;
  unit: string;
  completed: boolean;
};

export type MotivationState = {
  freezeTokens: number;
  freezeArmed: boolean;
  freezeArmedAt: string;
  unlockedBadgeIds: string[];
  updatedAt: string;
};

const MOTIVATION_KEY = "letmequiz.motivation.state";

const BADGES: MotivationBadgeDefinition[] = [
  {
    id: "first-session",
    title: "First Session",
    description: "Complete at least 10 minutes of study.",
  },
  {
    id: "streak-7",
    title: "7 Day Streak",
    description: "Keep your streak alive for 7 days.",
  },
  {
    id: "accuracy-80",
    title: "Accuracy Master",
    description: "Reach 80% overall accuracy.",
  },
  {
    id: "cards-250",
    title: "Card Sprinter",
    description: "Review 250 cards in total.",
  },
  {
    id: "task-20",
    title: "Planner Hero",
    description: "Complete 20 tasks from planner.",
  },
];

function isBrowser(): boolean {
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
    // Ignore localStorage write errors.
  }

  emitRealtimeSync("motivation");
}

function nowIso(): string {
  return new Date().toISOString();
}

function defaultState(): MotivationState {
  return {
    freezeTokens: 2,
    freezeArmed: false,
    freezeArmedAt: "",
    unlockedBadgeIds: [],
    updatedAt: nowIso(),
  };
}

function countCompletedTasks(metrics: StudentMetrics): number {
  return Object.values(metrics.activityByDate).reduce((sum, item) => sum + item.completedTasks, 0);
}

function currentWeekId(): string {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const day = Math.floor((now.getTime() - yearStart.getTime()) / 86_400_000) + 1;
  const week = Math.ceil(day / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function getMotivationState(): MotivationState {
  const state = safeRead<MotivationState>(MOTIVATION_KEY, defaultState());
  return {
    ...defaultState(),
    ...state,
    freezeTokens: Math.max(0, Math.round(state.freezeTokens ?? 0)),
    unlockedBadgeIds: Array.isArray(state.unlockedBadgeIds) ? state.unlockedBadgeIds : [],
  };
}

function saveMotivationState(state: MotivationState): MotivationState {
  const next = {
    ...state,
    updatedAt: nowIso(),
  };
  safeWrite(MOTIVATION_KEY, next);
  return next;
}

export function armStreakFreeze(): MotivationState {
  const current = getMotivationState();
  if (current.freezeArmed || current.freezeTokens <= 0) {
    return current;
  }

  return saveMotivationState({
    ...current,
    freezeArmed: true,
    freezeArmedAt: nowIso(),
  });
}

export function consumeArmedStreakFreeze(): boolean {
  const current = getMotivationState();
  if (!current.freezeArmed || current.freezeTokens <= 0) {
    return false;
  }

  saveMotivationState({
    ...current,
    freezeArmed: false,
    freezeArmedAt: "",
    freezeTokens: Math.max(0, current.freezeTokens - 1),
  });
  return true;
}

export function evaluateMotivationProgress(metrics: StudentMetrics) {
  const totalAnswers = metrics.totalCorrectAnswers + metrics.totalWrongAnswers;
  const accuracy = totalAnswers > 0 ? (metrics.totalCorrectAnswers / totalAnswers) * 100 : 0;
  const completedTasks = countCompletedTasks(metrics);

  const unlockedCandidates = [
    metrics.totalStudySeconds >= 600 ? "first-session" : "",
    metrics.streakDays >= 7 ? "streak-7" : "",
    accuracy >= 80 && totalAnswers >= 20 ? "accuracy-80" : "",
    metrics.totalCardsReviewed >= 250 ? "cards-250" : "",
    completedTasks >= 20 ? "task-20" : "",
  ].filter(Boolean);

  const state = getMotivationState();
  const nextUnlocked = Array.from(new Set([...state.unlockedBadgeIds, ...unlockedCandidates]));
  const newlyUnlocked = nextUnlocked.filter((id) => !state.unlockedBadgeIds.includes(id));

  let nextState = state;
  if (nextUnlocked.length !== state.unlockedBadgeIds.length) {
    nextState = saveMotivationState({
      ...state,
      unlockedBadgeIds: nextUnlocked,
    });
  }

  const recentDays = Object.values(metrics.activityByDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  const weekMinutes = recentDays.reduce((sum, day) => sum + Math.round(day.studySeconds / 60), 0);
  const weekCards = recentDays.reduce((sum, day) => sum + day.cardsReviewed, 0);
  const weekSessions = recentDays.filter((day) => day.studySeconds > 0).length;

  const challenges: MotivationChallengeProgress[] = [
    {
      id: `${currentWeekId()}-minutes`,
      title: "Weekly Study Minutes",
      progress: weekMinutes,
      target: 240,
      unit: "min",
      completed: weekMinutes >= 240,
    },
    {
      id: `${currentWeekId()}-cards`,
      title: "Weekly Card Reviews",
      progress: weekCards,
      target: 120,
      unit: "cards",
      completed: weekCards >= 120,
    },
    {
      id: `${currentWeekId()}-sessions`,
      title: "Active Study Days",
      progress: weekSessions,
      target: 5,
      unit: "days",
      completed: weekSessions >= 5,
    },
  ];

  return {
    state: nextState,
    badges: BADGES,
    challenges,
    newlyUnlocked,
  };
}
