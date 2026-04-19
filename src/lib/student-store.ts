import type {
  CardReviewState,
  DailyActivity,
  QuizMistake,
  ReviewGrade,
  ReviewState,
  StudentMetrics,
  StudyTask,
  StudyTaskPriority,
  WeakCardDiagnostic,
  WeeklyVocabularyPlanItem,
} from "@/types/student";
import { consumeArmedStreakFreeze } from "@/lib/motivation-store";
import { emitRealtimeSync } from "@/lib/realtime-sync";
import { trackAnalyticsEvent } from "@/lib/analytics-store";

const METRICS_KEY = "letmequiz.student.metrics";
const TASKS_KEY = "letmequiz.student.tasks";
const REVIEW_KEY = "letmequiz.student.review";
const MISTAKES_KEY = "letmequiz.student.quiz-mistakes";

type StudyRecordPayload = {
  seconds: number;
  cardsReviewed?: number;
};

type QuizRecordPayload = {
  correctAnswers: number;
  wrongAnswers: number;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function dateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function dayDifference(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T00:00:00.000Z`).getTime();
  const to = new Date(`${toDate}T00:00:00.000Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

function defaultDailyActivity(today = dateKey()): DailyActivity {
  return {
    date: today,
    studySeconds: 0,
    cardsReviewed: 0,
    quizAttempts: 0,
    writingAttempts: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    completedTasks: 0,
  };
}

function defaultMetrics(): StudentMetrics {
  return {
    dailyGoalMinutes: 45,
    streakDays: 0,
    lastActiveDate: "",
    totalStudySeconds: 0,
    totalCardsReviewed: 0,
    totalQuizAttempts: 0,
    totalCorrectAnswers: 0,
    totalWrongAnswers: 0,
    totalWritingAttempts: 0,
    totalWritingCorrect: 0,
    activityByDate: {},
  };
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
    // Ignore quota errors and malformed storage state.
  }

  emitRealtimeSync("student-store");
}

function touchActiveDate(metrics: StudentMetrics) {
  const today = dateKey();
  const previous = metrics.lastActiveDate;

  if (!previous) {
    metrics.streakDays = 1;
    metrics.lastActiveDate = today;
    return;
  }

  if (previous === today) {
    return;
  }

  const difference = dayDifference(previous, today);
  if (difference === 1) {
    metrics.streakDays += 1;
  } else if (difference === 2) {
    const consumed = consumeArmedStreakFreeze();
    metrics.streakDays = consumed ? metrics.streakDays + 1 : 1;
  } else {
    metrics.streakDays = 1;
  }

  metrics.lastActiveDate = today;
}

function getTodayActivity(metrics: StudentMetrics): DailyActivity {
  const today = dateKey();
  const existing = metrics.activityByDate[today];
  if (existing) {
    return existing;
  }

  const created = defaultDailyActivity(today);
  metrics.activityByDate[today] = created;
  return created;
}

function updateMetrics(mutator: (metrics: StudentMetrics) => void): StudentMetrics {
  const metrics = getStudentMetrics();
  touchActiveDate(metrics);
  mutator(metrics);
  safeWrite(METRICS_KEY, metrics);
  return metrics;
}

function cleanMetrics(metrics: StudentMetrics): StudentMetrics {
  const copy = {
    ...defaultMetrics(),
    ...metrics,
    activityByDate: {
      ...metrics.activityByDate,
    },
  };

  const activityDates = Object.keys(copy.activityByDate).sort();
  const keepDates = activityDates.slice(-35);
  const trimmed: Record<string, DailyActivity> = {};

  for (const itemDate of keepDates) {
    const day = copy.activityByDate[itemDate];
    trimmed[itemDate] = {
      ...defaultDailyActivity(itemDate),
      ...day,
      date: itemDate,
    };
  }

  copy.activityByDate = trimmed;
  copy.dailyGoalMinutes = clampNumber(copy.dailyGoalMinutes, 15, 240);
  return copy;
}

export function getStudentMetrics(): StudentMetrics {
  const raw = safeRead<StudentMetrics>(METRICS_KEY, defaultMetrics());
  const metrics = cleanMetrics(raw);
  return metrics;
}

export function setDailyGoalMinutes(minutes: number): StudentMetrics {
  return updateMetrics((metrics) => {
    metrics.dailyGoalMinutes = clampNumber(Math.round(minutes), 15, 240);
  });
}

export function recordStudySession(payload: StudyRecordPayload): StudentMetrics {
  const updated = updateMetrics((metrics) => {
    const safeSeconds = clampNumber(Math.round(payload.seconds), 0, 21_600);
    const safeCards = clampNumber(Math.round(payload.cardsReviewed ?? 0), 0, 1_000);
    metrics.totalStudySeconds += safeSeconds;
    metrics.totalCardsReviewed += safeCards;

    const today = getTodayActivity(metrics);
    today.studySeconds += safeSeconds;
    today.cardsReviewed += safeCards;
  });

  trackAnalyticsEvent({
    name: "study-session",
    value: Math.round(payload.seconds),
    metadata: {
      cards: Math.round(payload.cardsReviewed ?? 0),
    },
  });

  return updated;
}

export function recordQuizSession(payload: QuizRecordPayload): StudentMetrics {
  const updated = updateMetrics((metrics) => {
    const correct = clampNumber(Math.round(payload.correctAnswers), 0, 500);
    const wrong = clampNumber(Math.round(payload.wrongAnswers), 0, 500);

    metrics.totalQuizAttempts += 1;
    metrics.totalCorrectAnswers += correct;
    metrics.totalWrongAnswers += wrong;

    const today = getTodayActivity(metrics);
    today.quizAttempts += 1;
    today.correctAnswers += correct;
    today.wrongAnswers += wrong;
  });

  trackAnalyticsEvent({
    name: "quiz-finished",
    value: Math.round(payload.correctAnswers),
    metadata: {
      wrong: Math.round(payload.wrongAnswers),
    },
  });

  return updated;
}

export function recordWritingAttempt(correct: boolean): StudentMetrics {
  const updated = updateMetrics((metrics) => {
    metrics.totalWritingAttempts += 1;
    if (correct) {
      metrics.totalWritingCorrect += 1;
    }

    const today = getTodayActivity(metrics);
    today.writingAttempts += 1;
  });

  trackAnalyticsEvent({
    name: "writing-attempt",
    value: correct ? 1 : 0,
    metadata: {
      correct,
    },
  });

  return updated;
}

function getTasksInternal(): StudyTask[] {
  const raw = safeRead<StudyTask[]>(TASKS_KEY, []);
  return raw
    .map((task) => ({
      id: task.id,
      title: task.title,
      subject: task.subject,
      dueDate: task.dueDate,
      priority: task.priority,
      completed: Boolean(task.completed),
      completedAt: task.completedAt,
      createdAt: task.createdAt,
    }))
    .sort((a, b) => a.completed === b.completed ? a.dueDate.localeCompare(b.dueDate) : Number(a.completed) - Number(b.completed));
}

function saveTasks(tasks: StudyTask[]) {
  safeWrite(TASKS_KEY, tasks);
}

export function getTasks(): StudyTask[] {
  return getTasksInternal();
}

export function addTask(input: {
  title: string;
  subject?: string;
  dueDate?: string;
  priority?: StudyTaskPriority;
}): StudyTask[] {
  const title = input.title.trim();
  if (!title) {
    return getTasksInternal();
  }

  const next: StudyTask = {
    id: crypto.randomUUID(),
    title,
    subject: (input.subject ?? "General").trim() || "General",
    dueDate: input.dueDate ?? dateKey(new Date(Date.now() + 86_400_000)),
    priority: input.priority ?? "medium",
    completed: false,
    completedAt: undefined,
    createdAt: new Date().toISOString(),
  };

  const tasks = [next, ...getTasksInternal()];
  saveTasks(tasks);
  return getTasksInternal();
}

export function toggleTask(taskId: string): StudyTask[] {
  const completedAt = new Date().toISOString();
  const tasks = getTasksInternal().map((task) =>
    task.id === taskId
      ? {
          ...task,
          completed: !task.completed,
          completedAt: task.completed ? undefined : completedAt,
        }
      : task
  );

  const toggled = tasks.find((task) => task.id === taskId);
  if (toggled?.completed) {
    updateMetrics((metrics) => {
      const today = getTodayActivity(metrics);
      today.completedTasks += 1;
    });
  }

  saveTasks(tasks);
  return getTasksInternal();
}

export function completeTask(taskId: string): StudyTask[] {
  const completedAt = new Date().toISOString();
  let markedCompleted = false;

  const tasks = getTasksInternal().map((task) => {
    if (task.id !== taskId) {
      return task;
    }

    if (task.completed) {
      return task;
    }

    markedCompleted = true;
    return {
      ...task,
      completed: true,
      completedAt,
    };
  });

  if (markedCompleted) {
    updateMetrics((metrics) => {
      const today = getTodayActivity(metrics);
      today.completedTasks += 1;
    });
    trackAnalyticsEvent({
      name: "task-completed",
    });
  }

  saveTasks(tasks);
  return getTasksInternal();
}

export function deleteTask(taskId: string): StudyTask[] {
  const tasks = getTasksInternal().filter((task) => task.id !== taskId);
  saveTasks(tasks);
  return getTasksInternal();
}

function getQuizMistakesInternal(): QuizMistake[] {
  const raw = safeRead<QuizMistake[]>(MISTAKES_KEY, []);
  return raw
    .filter((item) => Boolean(item?.id && item?.setId && item?.cardId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 400);
}

function saveQuizMistakes(items: QuizMistake[]) {
  safeWrite(MISTAKES_KEY, items.slice(0, 400));
}

export function getQuizMistakes(setId?: string): QuizMistake[] {
  const items = getQuizMistakesInternal();
  if (!setId) {
    return items;
  }

  return items.filter((item) => item.setId === setId);
}

export function recordQuizMistake(input: {
  setId: string;
  cardId: string;
  prompt: string;
  answer: string;
  selectedAnswer?: string;
  explanation?: string;
  timedOut?: boolean;
}) {
  const next: QuizMistake = {
    id: crypto.randomUUID(),
    setId: input.setId,
    cardId: input.cardId,
    prompt: input.prompt,
    answer: input.answer,
    selectedAnswer: input.selectedAnswer,
    explanation: input.explanation,
    timedOut: Boolean(input.timedOut),
    createdAt: new Date().toISOString(),
  };

  const all = [next, ...getQuizMistakesInternal()];
  saveQuizMistakes(all);
}

function defaultReviewState(): ReviewState {
  return {};
}

export function getReviewState(): ReviewState {
  return safeRead<ReviewState>(REVIEW_KEY, defaultReviewState());
}

function saveReviewState(next: ReviewState) {
  safeWrite(REVIEW_KEY, next);
}

function defaultCardReviewState(now: Date): CardReviewState {
  const iso = now.toISOString();
  return {
    level: 0,
    dueAt: iso,
    hardCount: 0,
    easyCount: 0,
    repetitions: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    lapseCount: 0,
    consecutiveCorrect: 0,
    lastGrade: "again",
    lastReviewedAt: iso,
  };
}

function clampEaseFactor(value: number): number {
  return Math.min(3.0, Math.max(1.3, value));
}

function withReviewDefaults(
  reviewState: Partial<CardReviewState> | undefined,
  now: Date
): CardReviewState {
  const fallback = defaultCardReviewState(now);
  if (!reviewState) {
    return fallback;
  }

  return {
    ...fallback,
    ...reviewState,
    repetitions:
      typeof reviewState.repetitions === "number" ? reviewState.repetitions : fallback.repetitions,
    intervalDays:
      typeof reviewState.intervalDays === "number" ? reviewState.intervalDays : fallback.intervalDays,
    easeFactor:
      typeof reviewState.easeFactor === "number"
        ? clampEaseFactor(reviewState.easeFactor)
        : fallback.easeFactor,
    lapseCount:
      typeof reviewState.lapseCount === "number" ? reviewState.lapseCount : fallback.lapseCount,
    consecutiveCorrect:
      typeof reviewState.consecutiveCorrect === "number"
        ? reviewState.consecutiveCorrect
        : fallback.consecutiveCorrect,
  };
}

function computeReviewSchedule(current: CardReviewState, grade: ReviewGrade): {
  nextLevel: number;
  dueMsFromNow: number;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  lapseCount: number;
  consecutiveCorrect: number;
} {
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (grade === "again") {
    return {
      nextLevel: Math.max(current.level - 1, 0),
      dueMsFromNow: 10 * 60 * 1000,
      repetitions: 0,
      intervalDays: 0,
      easeFactor: clampEaseFactor(current.easeFactor - 0.2),
      lapseCount: current.lapseCount + 1,
      consecutiveCorrect: 0,
    };
  }

  if (grade === "hard") {
    const baseInterval = current.intervalDays > 0 ? current.intervalDays : 0.5;
    const intervalDays = Math.max(0.5, Math.min(365, baseInterval * 1.2));
    return {
      nextLevel: Math.max(current.level, 1),
      dueMsFromNow: intervalDays * oneDayMs,
      repetitions: current.repetitions + 1,
      intervalDays,
      easeFactor: clampEaseFactor(current.easeFactor - 0.12),
      lapseCount: current.lapseCount,
      consecutiveCorrect: current.consecutiveCorrect + 1,
    };
  }

  if (grade === "good") {
    const nextRepetitions = current.repetitions + 1;
    let intervalDays = 1;
    if (nextRepetitions === 2) {
      intervalDays = 3;
    } else if (nextRepetitions > 2) {
      const baseInterval = current.intervalDays > 0 ? current.intervalDays : 2;
      intervalDays = Math.max(2, Math.min(365, baseInterval * current.easeFactor));
    }

    return {
      nextLevel: clampNumber(current.level + 1, 1, 7),
      dueMsFromNow: intervalDays * oneDayMs,
      repetitions: nextRepetitions,
      intervalDays,
      easeFactor: clampEaseFactor(current.easeFactor + 0.03),
      lapseCount: current.lapseCount,
      consecutiveCorrect: current.consecutiveCorrect + 1,
    };
  }

  const nextRepetitions = current.repetitions + 1;
  let intervalDays = 2;
  if (nextRepetitions === 2) {
    intervalDays = 5;
  } else if (nextRepetitions > 2) {
    const baseInterval = current.intervalDays > 0 ? current.intervalDays : 3;
    intervalDays = Math.max(3, Math.min(365, baseInterval * (current.easeFactor + 0.25)));
  }

  return {
    nextLevel: clampNumber(current.level + 2, 1, 7),
    dueMsFromNow: intervalDays * oneDayMs,
    repetitions: nextRepetitions,
    intervalDays,
    easeFactor: clampEaseFactor(current.easeFactor + 0.12),
    lapseCount: current.lapseCount,
    consecutiveCorrect: current.consecutiveCorrect + 1,
  };
}

export function markCardReview(setId: string, cardId: string, grade: ReviewGrade): CardReviewState {
  const now = new Date();
  const state = getReviewState();
  const setState = state[setId] ?? {};
  const current = withReviewDefaults(setState[cardId], now);

  const schedule = computeReviewSchedule(current, grade);
  const next: CardReviewState = {
    level: schedule.nextLevel,
    dueAt: new Date(now.getTime() + schedule.dueMsFromNow).toISOString(),
    hardCount: grade === "hard" || grade === "again" ? current.hardCount + 1 : current.hardCount,
    easyCount: grade === "good" || grade === "easy" ? current.easyCount + 1 : current.easyCount,
    repetitions: schedule.repetitions,
    intervalDays: schedule.intervalDays,
    easeFactor: schedule.easeFactor,
    lapseCount: schedule.lapseCount,
    consecutiveCorrect: schedule.consecutiveCorrect,
    lastGrade: grade,
    lastReviewedAt: now.toISOString(),
  };

  const nextState: ReviewState = {
    ...state,
    [setId]: {
      ...setState,
      [cardId]: next,
    },
  };

  saveReviewState(nextState);
  return next;
}

export function getDueCardIds(setId: string): string[] {
  const nowMs = Date.now();
  const setState = getReviewState()[setId] ?? {};
  return Object.entries(setState)
    .filter(([, value]) => {
      const normalized = withReviewDefaults(value, new Date());
      return new Date(normalized.dueAt).getTime() <= nowMs;
    })
    .map(([cardId]) => cardId);
}

function cardInterleaveScore(cardId: string, reviewState: Partial<CardReviewState> | undefined): number {
  const normalized = withReviewDefaults(reviewState, new Date());
  const nowMs = Date.now();
  const dueBonus = new Date(normalized.dueAt).getTime() <= nowMs ? 7 : 0;
  const lapsePenalty = normalized.lapseCount * 2.5;
  const hardBias = normalized.hardCount * 1.3;
  const easyBias = normalized.easyCount * 0.4;
  const intervalPenalty = normalized.intervalDays * 0.15;
  const stabilityPenalty = normalized.consecutiveCorrect * 0.8;
  const seed = cardId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 5;

  return dueBonus + lapsePenalty + hardBias - easyBias - intervalPenalty - stabilityPenalty + seed * 0.01;
}

export function getInterleavedCardOrder(setId: string, cardIds: string[]): string[] {
  const setState = getReviewState()[setId] ?? {};

  return [...cardIds].sort((cardA, cardB) => {
    const scoreA = cardInterleaveScore(cardA, setState[cardA]);
    const scoreB = cardInterleaveScore(cardB, setState[cardB]);
    return scoreB - scoreA;
  });
}

export function getReviewSnapshotForSet(setId: string, allCardIds: string[]) {
  const setState = getReviewState()[setId] ?? {};
  const nowMs = Date.now();

  let dueCount = 0;
  let masteredCount = 0;
  let difficultCount = 0;

  for (const cardId of allCardIds) {
    const item = setState[cardId];
    if (!item) {
      dueCount += 1;
      continue;
    }

    const normalized = withReviewDefaults(item, new Date());

    if (new Date(normalized.dueAt).getTime() <= nowMs) {
      dueCount += 1;
    }
    if (normalized.level >= 5 || normalized.intervalDays >= 14) {
      masteredCount += 1;
    }
    if (normalized.hardCount > normalized.easyCount || normalized.lapseCount >= 2) {
      difficultCount += 1;
    }
  }

  return {
    dueCount,
    masteredCount,
    difficultCount,
  };
}

export function getWeakCardDiagnostics(setId: string, cardIds: string[]): WeakCardDiagnostic[] {
  const setState = getReviewState()[setId] ?? {};
  const nowMs = Date.now();

  return cardIds
    .map((cardId) => {
      const normalized = withReviewDefaults(setState[cardId], new Date());
      const dueNow = new Date(normalized.dueAt).getTime() <= nowMs;

      const weaknessScore =
        (dueNow ? 3.5 : 0) +
        normalized.lapseCount * 2.4 +
        Math.max(normalized.hardCount - normalized.easyCount, 0) * 1.6 +
        (normalized.consecutiveCorrect < 2 ? 1.2 : 0) +
        (normalized.easeFactor < 1.9 ? 1.4 : 0) +
        (normalized.intervalDays <= 1 ? 0.7 : 0);

      return {
        cardId,
        weaknessScore,
        dueNow,
        lapseCount: normalized.lapseCount,
        hardCount: normalized.hardCount,
        easyCount: normalized.easyCount,
        consecutiveCorrect: normalized.consecutiveCorrect,
        intervalDays: normalized.intervalDays,
        easeFactor: normalized.easeFactor,
      };
    })
    .sort((a, b) => b.weaknessScore - a.weaknessScore);
}

export function generateWeeklyVocabularyPlan(args: {
  dailyGoalMinutes: number;
  dueCount: number;
  weakCount: number;
  masteredCount: number;
}): WeeklyVocabularyPlanItem[] {
  const baseMinutes = clampNumber(Math.round(args.dailyGoalMinutes), 20, 150);
  const pressure = clampNumber(
    1 + args.dueCount * 0.03 + args.weakCount * 0.04 - args.masteredCount * 0.01,
    0.85,
    1.6
  );

  const templates: Array<{
    title: string;
    description: string;
    mode: WeeklyVocabularyPlanItem["mode"];
    weight: number;
  }> = [
    {
      title: "Interleaved Smart Review",
      description: "Start with due and weak cards to reduce forgetting risk.",
      mode: "smart-review",
      weight: 1.05,
    },
    {
      title: "Mnemonic Encoding Day",
      description: "Create keyword plus story plus memory-palace cues for new weak words.",
      mode: "vocab-lab",
      weight: 1.0,
    },
    {
      title: "Bidirectional Recall Sprint",
      description: "Run term to definition and definition to term drills.",
      mode: "writing",
      weight: 0.9,
    },
    {
      title: "Context and Cloze Transfer",
      description: "Write real usage sentences and complete cloze deletion exercises.",
      mode: "vocab-lab",
      weight: 1.0,
    },
    {
      title: "Pronunciation and Listening",
      description: "Practice hearing and producing weak vocabulary with audio repetition.",
      mode: "listening",
      weight: 0.85,
    },
    {
      title: "Timed Retrieval Check",
      description: "Take a timed quiz to stress-test retention speed.",
      mode: "quiz",
      weight: 0.8,
    },
    {
      title: "Recovery and Reinforcement",
      description: "Review incorrect and confused words from the week.",
      mode: "smart-review",
      weight: 0.95,
    },
  ];

  return templates.map((template, dayOffset) => {
    const dayDate = new Date(Date.now() + dayOffset * 86_400_000);
    const minutes = clampNumber(Math.round(baseMinutes * template.weight * pressure), 15, 180);

    return {
      dayOffset,
      date: dayDate.toISOString().slice(0, 10),
      title: template.title,
      description: template.description,
      minutes,
      mode: template.mode,
    };
  });
}

export function getWeeklyActivity(days = 7): Array<{
  date: string;
  studyMinutes: number;
  cardsReviewed: number;
}> {
  const metrics = getStudentMetrics();
  const points: Array<{ date: string; studyMinutes: number; cardsReviewed: number }> = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const current = new Date(Date.now() - offset * 86_400_000);
    const key = dateKey(current);
    const day = metrics.activityByDate[key] ?? defaultDailyActivity(key);

    points.push({
      date: key,
      studyMinutes: Math.round(day.studySeconds / 60),
      cardsReviewed: day.cardsReviewed,
    });
  }

  return points;
}

export function getPerformanceTimeline(days = 14): Array<{
  date: string;
  studyMinutes: number;
  cardsReviewed: number;
  accuracy: number;
  completedTasks: number;
}> {
  const metrics = getStudentMetrics();
  const points: Array<{
    date: string;
    studyMinutes: number;
    cardsReviewed: number;
    accuracy: number;
    completedTasks: number;
  }> = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const current = new Date(Date.now() - offset * 86_400_000);
    const key = dateKey(current);
    const day = metrics.activityByDate[key] ?? defaultDailyActivity(key);
    const totalAnswers = day.correctAnswers + day.wrongAnswers;
    const accuracy = totalAnswers > 0
      ? Math.round((day.correctAnswers / Math.max(totalAnswers, 1)) * 100)
      : 0;

    points.push({
      date: key,
      studyMinutes: Math.round(day.studySeconds / 60),
      cardsReviewed: day.cardsReviewed,
      accuracy,
      completedTasks: day.completedTasks,
    });
  }

  return points;
}

export function getTodayGoalStatus() {
  const metrics = getStudentMetrics();
  const today = metrics.activityByDate[dateKey()] ?? defaultDailyActivity();
  const currentMinutes = Math.round(today.studySeconds / 60);

  return {
    currentMinutes,
    goalMinutes: metrics.dailyGoalMinutes,
    percentage: clampNumber(
      Math.round((currentMinutes / Math.max(metrics.dailyGoalMinutes, 1)) * 100),
      0,
      100
    ),
  };
}
