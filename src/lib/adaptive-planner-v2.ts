import {
  addTask,
  getPerformanceTimeline,
  getQuizMistakes,
  getStudentMetrics,
  getTasks,
  setDailyGoalMinutes,
} from "@/lib/student-store";
import type { StudyTaskPriority } from "@/types/student";

export type AdaptivePlannerV2Preview = {
  recommendedDailyMinutes: number;
  reasons: string[];
  targetAccuracy: number;
  targetMistakeReductionPercent: number;
};

export type AdaptivePlannerV2ApplyResult = AdaptivePlannerV2Preview & {
  addedTasks: number;
  skippedTasks: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function nextDateByOffset(offset: number): string {
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
}

function computeSignals() {
  const metrics = getStudentMetrics();
  const timeline = getPerformanceTimeline(7);
  const mistakes = getQuizMistakes();
  const pendingTasks = getTasks().filter((item) => !item.completed).length;

  const weekMinutes = timeline.reduce((sum, day) => sum + day.studyMinutes, 0);
  const avgMinutes = Math.round(weekMinutes / Math.max(timeline.length, 1));
  const avgAccuracy = Math.round(
    timeline.reduce((sum, day) => sum + day.accuracy, 0) / Math.max(timeline.length, 1)
  );

  const answers = metrics.totalCorrectAnswers + metrics.totalWrongAnswers;
  const globalAccuracy = answers > 0
    ? Math.round((metrics.totalCorrectAnswers / Math.max(answers, 1)) * 100)
    : avgAccuracy;

  return {
    avgMinutes,
    avgAccuracy,
    globalAccuracy,
    mistakes,
    pendingTasks,
    currentGoal: metrics.dailyGoalMinutes,
  };
}

export function getAdaptivePlannerV2Preview(): AdaptivePlannerV2Preview {
  const signals = computeSignals();
  const reasons: string[] = [];

  let minutes = signals.currentGoal;

  if (signals.avgAccuracy < 70 || signals.globalAccuracy < 72) {
    minutes += 15;
    reasons.push("Accuracy trend is below target; increasing retrieval practice volume.");
  }
  if (signals.mistakes.length > 25) {
    minutes += 10;
    reasons.push("High mistake volume detected; adding dedicated correction blocks.");
  }
  if (signals.pendingTasks > 6) {
    minutes += 5;
    reasons.push("Planner backlog is high; increasing structure and review cadence.");
  }
  if (signals.avgMinutes > signals.currentGoal + 20) {
    minutes -= 5;
    reasons.push("Current weekly pace is sustainable; preventing overload.");
  }

  const recommendedDailyMinutes = clamp(Math.round(minutes), 35, 190);

  if (reasons.length === 0) {
    reasons.push("Performance is stable; keeping moderate progressive load.");
  }

  return {
    recommendedDailyMinutes,
    reasons,
    targetAccuracy: clamp(Math.max(signals.globalAccuracy + 6, 75), 75, 92),
    targetMistakeReductionPercent: clamp(20 + Math.round(signals.mistakes.length / 5), 20, 50),
  };
}

function priorityFromDay(dayOffset: number): StudyTaskPriority {
  if (dayOffset <= 1) {
    return "high";
  }
  if (dayOffset <= 4) {
    return "medium";
  }
  return "low";
}

export function applyAdaptivePlannerV2(): AdaptivePlannerV2ApplyResult {
  const preview = getAdaptivePlannerV2Preview();
  setDailyGoalMinutes(preview.recommendedDailyMinutes);

  const existingTitles = new Set(getTasks().map((task) => task.title));
  let addedTasks = 0;
  let skippedTasks = 0;

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const focusMinutes = clamp(Math.round(preview.recommendedDailyMinutes * 0.6), 25, 120);
    const correctionMinutes = clamp(Math.round(preview.recommendedDailyMinutes * 0.25), 15, 60);
    const consolidationMinutes = clamp(
      preview.recommendedDailyMinutes - focusMinutes - correctionMinutes,
      10,
      40
    );

    const items = [
      {
        title: `[AUTO-V2] Day ${dayOffset + 1} Focus Retrieval (${focusMinutes}m)`,
        subject: "Adaptive Planner V2",
      },
      {
        title: `[AUTO-V2] Day ${dayOffset + 1} Error Correction (${correctionMinutes}m)`,
        subject: "Adaptive Planner V2",
      },
      {
        title: `[AUTO-V2] Day ${dayOffset + 1} Consolidation (${consolidationMinutes}m)`,
        subject: "Adaptive Planner V2",
      },
    ];

    for (const item of items) {
      if (existingTitles.has(item.title)) {
        skippedTasks += 1;
        continue;
      }

      addTask({
        title: item.title,
        subject: item.subject,
        dueDate: nextDateByOffset(dayOffset),
        priority: priorityFromDay(dayOffset),
      });
      existingTitles.add(item.title);
      addedTasks += 1;
    }
  }

  return {
    ...preview,
    addedTasks,
    skippedTasks,
  };
}
