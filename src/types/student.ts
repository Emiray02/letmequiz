export type ReviewGrade = "again" | "hard" | "good" | "easy";

export type StudyTaskPriority = "low" | "medium" | "high";

export type StudyTask = {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  priority: StudyTaskPriority;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
};

export type DailyActivity = {
  date: string;
  studySeconds: number;
  cardsReviewed: number;
  quizAttempts: number;
  writingAttempts: number;
  correctAnswers: number;
  wrongAnswers: number;
  completedTasks: number;
};

export type StudentMetrics = {
  dailyGoalMinutes: number;
  streakDays: number;
  lastActiveDate: string;
  totalStudySeconds: number;
  totalCardsReviewed: number;
  totalQuizAttempts: number;
  totalCorrectAnswers: number;
  totalWrongAnswers: number;
  totalWritingAttempts: number;
  totalWritingCorrect: number;
  activityByDate: Record<string, DailyActivity>;
};

export type CardReviewState = {
  level: number;
  dueAt: string;
  hardCount: number;
  easyCount: number;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  lapseCount: number;
  consecutiveCorrect: number;
  lastGrade: ReviewGrade;
  lastReviewedAt: string;
};

export type SetReviewState = Record<string, CardReviewState>;

export type ReviewState = Record<string, SetReviewState>;

export type WeakCardDiagnostic = {
  cardId: string;
  weaknessScore: number;
  dueNow: boolean;
  lapseCount: number;
  hardCount: number;
  easyCount: number;
  consecutiveCorrect: number;
  intervalDays: number;
  easeFactor: number;
};

export type WeeklyVocabularyPlanItem = {
  dayOffset: number;
  date: string;
  title: string;
  description: string;
  minutes: number;
  mode: "vocab-lab" | "smart-review" | "writing" | "listening" | "quiz";
};

export type QuizMistake = {
  id: string;
  setId: string;
  cardId: string;
  prompt: string;
  answer: string;
  selectedAnswer?: string;
  explanation?: string;
  timedOut?: boolean;
  createdAt: string;
};
