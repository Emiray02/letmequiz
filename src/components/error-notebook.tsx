"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { StudySet } from "@/types/study";
import { buildWrongAnswerExplanation } from "@/lib/answer-explainer";
import {
  addTask,
  getQuizMistakes,
  markCardReview,
  recordQuizMistake,
  recordStudySession,
} from "@/lib/student-store";
import { subscribeRealtimeSync } from "@/lib/realtime-sync";

type ErrorNotebookProps = {
  set: StudySet;
};

type MistakeGroup = {
  cardId: string;
  prompt: string;
  answer: string;
  sampleSelectedAnswer: string;
  sampleExplanation: string;
  timeoutCount: number;
  count: number;
  lastAt: string;
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
  }
  return copy;
}

export default function ErrorNotebook({ set }: ErrorNotebookProps) {
  const [mistakes, setMistakes] = useState(() => getQuizMistakes(set.id));
  const [createdSetId, setCreatedSetId] = useState("");
  const [feedback, setFeedback] = useState("");

  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [miniFeedback, setMiniFeedback] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeRealtimeSync((topic) => {
      if (topic.includes("student")) {
        setMistakes(getQuizMistakes(set.id));
      }
    });

    return unsubscribe;
  }, [set.id]);

  const grouped = useMemo(() => {
    const map = new Map<string, MistakeGroup>();

    for (const item of mistakes) {
      const key = `${item.cardId}::${item.answer}`;
      const current = map.get(key);
      if (!current) {
        const fallbackExplanation = buildWrongAnswerExplanation({
          prompt: item.prompt,
          correctAnswer: item.answer,
          selectedAnswer: item.selectedAnswer,
          timedOut: item.timedOut,
        });

        map.set(key, {
          cardId: item.cardId,
          prompt: item.prompt,
          answer: item.answer,
          sampleSelectedAnswer: item.selectedAnswer ?? "",
          sampleExplanation: item.explanation ?? fallbackExplanation,
          timeoutCount: item.timedOut ? 1 : 0,
          count: 1,
          lastAt: item.createdAt,
        });
      } else {
        current.count += 1;
        if (item.selectedAnswer) {
          current.sampleSelectedAnswer = item.selectedAnswer;
        }
        if (item.explanation) {
          current.sampleExplanation = item.explanation;
        }
        if (item.timedOut) {
          current.timeoutCount += 1;
        }
        if (item.createdAt > current.lastAt) {
          current.lastAt = item.createdAt;
        }
      }
    }

    return [...map.values()].sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt));
  }, [mistakes]);

  const activeGroup = grouped[quizIndex] ?? null;
  const quizOptions = useMemo(() => {
    if (!activeGroup) {
      return [];
    }

    const distractors = grouped
      .filter((item) => item.answer !== activeGroup.answer)
      .map((item) => item.answer)
      .slice(0, 3);

    while (distractors.length < 3) {
      distractors.push(`Not related to ${activeGroup.prompt}`);
    }

    return shuffle([activeGroup.answer, ...distractors]);
  }, [activeGroup, grouped]);

  async function createRecoverySet() {
    if (grouped.length < 2) {
      setFeedback("Need at least two mistake groups to create recovery set.");
      return;
    }

    const cards = grouped.slice(0, 20).map((item) => ({
      term: item.prompt,
      definition: item.answer,
    }));

    const response = await fetch("/api/sets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: `${set.title} Recovery Set`,
        description: "Generated from repeated mistakes.",
        cards,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setFeedback(typeof payload?.error === "string" ? payload.error : "Failed to create recovery set.");
      return;
    }

    const setId = payload?.data?.id;
    if (typeof setId === "string" && setId) {
      setCreatedSetId(setId);
      setFeedback("Recovery set created.");
    }
  }

  function addRecoveryTasks() {
    const top = grouped.slice(0, 4);
    if (top.length === 0) {
      setFeedback("No mistakes to convert into tasks.");
      return;
    }

    for (const item of top) {
      addTask({
        title: `Recovery Drill: ${item.prompt}`,
        subject: "Error Notebook",
        dueDate: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
        priority: item.count >= 3 ? "high" : "medium",
      });
    }

    setFeedback("Top mistakes were added to planner as recovery tasks.");
  }

  function submitMiniQuiz(option: string) {
    if (!activeGroup || revealed) {
      return;
    }

    setSelectedOption(option);
    setRevealed(true);

    const correct = option === activeGroup.answer;
    if (correct) {
      setQuizScore((value) => value + 1);
      markCardReview(set.id, activeGroup.cardId, "good");
      setMiniFeedback("Great recovery. This item moved in the right direction.");
    } else {
      markCardReview(set.id, activeGroup.cardId, "hard");

      const explanation = buildWrongAnswerExplanation({
        prompt: activeGroup.prompt,
        correctAnswer: activeGroup.answer,
        selectedAnswer: option,
      });

      setMiniFeedback(explanation);
      recordQuizMistake({
        setId: set.id,
        cardId: activeGroup.cardId,
        prompt: activeGroup.prompt,
        answer: activeGroup.answer,
        selectedAnswer: option,
        explanation,
        timedOut: false,
      });
    }

    recordStudySession({ seconds: 18, cardsReviewed: 1 });
  }

  function nextMiniQuiz() {
    if (!revealed) {
      return;
    }

    if (quizIndex >= grouped.length - 1) {
      setQuizIndex(0);
      setQuizScore(0);
    } else {
      setQuizIndex((value) => value + 1);
    }

    setSelectedOption(null);
    setRevealed(false);
    setMiniFeedback("");
  }

  return (
    <section className="space-y-4 rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] backdrop-blur md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-3xl text-slate-900">Error Notebook</h3>
        <p className="text-xs text-slate-500">{grouped.length} grouped mistake patterns</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addRecoveryTasks}
          className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-800 transition hover:bg-amber-100"
        >
          Add Recovery Tasks
        </button>
        <button
          type="button"
          onClick={createRecoverySet}
          className="rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-800 transition hover:bg-cyan-100"
        >
          Create Recovery Set
        </button>
        {createdSetId ? (
          <Link
            href={`/set/${createdSetId}`}
            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700"
          >
            Open Recovery Set
          </Link>
        ) : null}
      </div>

      {feedback ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{feedback}</p>
      ) : null}

      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Grouped Mistakes</p>
        {grouped.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
            No quiz mistakes recorded yet.
          </p>
        ) : (
          grouped.slice(0, 10).map((item) => (
            <article key={`${item.cardId}-${item.answer}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">{item.prompt}</p>
              <p className="mt-1 text-xs text-slate-600">Correct: {item.answer}</p>
              {item.sampleSelectedAnswer ? (
                <p className="mt-1 text-xs text-rose-700">Frequent wrong: {item.sampleSelectedAnswer}</p>
              ) : null}
              <p className="mt-1 text-xs text-amber-700">Hint: {item.sampleExplanation}</p>
              {item.timeoutCount > 0 ? (
                <p className="mt-1 text-xs text-slate-500">Timeout attempts: {item.timeoutCount}</p>
              ) : null}
              <p className="mt-1 text-xs text-slate-500">Count: {item.count}</p>
            </article>
          ))
        )}
      </div>

      {activeGroup ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Mini Recovery Quiz ({quizIndex + 1}/{Math.max(grouped.length, 1)}) | Score {quizScore}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{activeGroup.prompt}</p>
          <div className="mt-2 space-y-2">
            {quizOptions.map((option) => {
              const correct = option === activeGroup.answer;
              const selected = option === selectedOption;
              const className = revealed
                ? correct
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : selected
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-white text-slate-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100";

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => submitMiniQuiz(option)}
                  disabled={revealed}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${className}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={nextMiniQuiz}
            disabled={!revealed}
            className="mt-3 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
          {miniFeedback ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {miniFeedback}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
