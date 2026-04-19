"use client";

import { useMemo, useState } from "react";
import type { StudySet } from "@/types/study";
import {
  addTask,
  generateWeeklyVocabularyPlan,
  getReviewSnapshotForSet,
  getStudentMetrics,
  getWeakCardDiagnostics,
} from "@/lib/student-store";
import { getTechniqueCoverage } from "@/lib/vocabulary-store";

type LearningCoachPanelProps = {
  set: StudySet;
  refreshTick: number;
};

export default function LearningCoachPanel({ set, refreshTick }: LearningCoachPanelProps) {
  const [feedback, setFeedback] = useState("");

  const cardIds = useMemo(() => {
    void refreshTick;
    return set.cards.map((card) => card.id);
  }, [set.cards, refreshTick]);
  const cardMap = useMemo(() => {
    void refreshTick;
    return new Map(set.cards.map((card) => [card.id, card]));
  }, [set.cards, refreshTick]);

  const metrics = useMemo(() => {
    void refreshTick;
    return getStudentMetrics();
  }, [refreshTick]);
  const snapshot = useMemo(() => {
    void refreshTick;
    return getReviewSnapshotForSet(set.id, cardIds);
  }, [set.id, cardIds, refreshTick]);
  const coverage = useMemo(() => {
    void refreshTick;
    return getTechniqueCoverage(set.id, cardIds);
  }, [set.id, cardIds, refreshTick]);

  const weakCards = useMemo(() => {
    return getWeakCardDiagnostics(set.id, cardIds)
      .slice(0, 8)
      .map((item) => ({
        ...item,
        term: cardMap.get(item.cardId)?.term ?? "Unknown",
        definition: cardMap.get(item.cardId)?.definition ?? "",
      }));
  }, [set.id, cardIds, cardMap]);

  const weeklyPlan = useMemo(
    () =>
      generateWeeklyVocabularyPlan({
        dailyGoalMinutes: metrics.dailyGoalMinutes,
        dueCount: snapshot.dueCount,
        weakCount: weakCards.length,
        masteredCount: snapshot.masteredCount,
      }),
    [metrics.dailyGoalMinutes, snapshot, weakCards.length]
  );

  function addWeakWordTask(term: string) {
    const dueDate = weeklyPlan[0]?.date ?? "";
    addTask({
      title: `Weak Word Focus: ${term}`,
      subject: set.title,
      dueDate,
      priority: "high",
    });
    setFeedback(`Task added for ${term}.`);
  }

  function addWeeklyPlanTasks() {
    for (const item of weeklyPlan) {
      addTask({
        title: `[${set.title}] ${item.title} (${item.minutes}m)`,
        subject: "Vocabulary Plan",
        dueDate: item.date,
        priority: item.dayOffset <= 2 ? "high" : "medium",
      });
    }
    setFeedback("7-day personalized vocabulary tasks were added to Planner.");
  }

  return (
    <section className="space-y-4 rounded-[1.6rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
      <div>
        <h3 className="font-display text-2xl text-slate-900">Learning Coach</h3>
        <p className="mt-1 text-sm text-slate-600">
          Adaptive recommendations based on due cards, weak words, and memory encoding coverage.
        </p>
      </div>

      <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs uppercase tracking-wide text-slate-600 sm:grid-cols-4">
        <p>Due {snapshot.dueCount}</p>
        <p>Weak {weakCards.length}</p>
        <p>Mnemonic {coverage.mnemonicCoverage}%</p>
        <p>Context {coverage.contextCoverage}%</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-800">Top Weak Words</h4>
          <span className="text-xs text-slate-500">Priority queue</span>
        </div>

        {weakCards.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
            No weak cards detected yet. Keep practicing to generate diagnostics.
          </p>
        ) : (
          <div className="space-y-2">
            {weakCards.map((item) => (
              <article
                key={item.cardId}
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.term}</p>
                    <p className="text-xs text-slate-600">{item.definition}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addWeakWordTask(item.term)}
                    className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                  >
                    Add Task
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
                  {item.dueNow ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">due</span> : null}
                  {item.lapseCount > 0 ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                      lapses {item.lapseCount}
                    </span>
                  ) : null}
                  {item.hardCount > item.easyCount ? (
                    <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-cyan-700">hard bias</span>
                  ) : null}
                  <span>score {item.weaknessScore.toFixed(1)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-800">7-Day Personalized Plan</h4>
          <button
            type="button"
            onClick={addWeeklyPlanTasks}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            Add All To Planner
          </button>
        </div>

        <div className="space-y-2">
          {weeklyPlan.map((item) => (
            <div key={`${item.mode}-${item.date}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Day {item.dayOffset + 1} - {item.date}
              </p>
              <p className="text-sm font-semibold text-slate-800">{item.title}</p>
              <p className="text-xs text-slate-600">
                {item.minutes} min - {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {feedback ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}
