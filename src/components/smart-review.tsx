"use client";

import { useState } from "react";
import type { StudySet } from "@/types/study";
import {
  getReviewSnapshotForSet,
  getReviewState,
  markCardReview,
  recordStudySession,
} from "@/lib/student-store";
import type { ReviewGrade } from "@/types/student";

type SmartReviewProps = {
  set: StudySet;
  onProgressUpdate?: () => void;
};

function computeDueCards(set: StudySet) {
  const reviewMap = getReviewState()[set.id] ?? {};
  const now = Date.now();

  return set.cards.filter((card) => {
    const state = reviewMap[card.id];
    if (!state) {
      return true;
    }

    return new Date(state.dueAt).getTime() <= now;
  });
}

function computeSnapshot(set: StudySet) {
  return getReviewSnapshotForSet(
    set.id,
    set.cards.map((card) => card.id)
  );
}

export default function SmartReview({ set, onProgressUpdate }: SmartReviewProps) {
  const [dueCards, setDueCards] = useState(() => computeDueCards(set));
  const [snapshot, setSnapshot] = useState(() => computeSnapshot(set));
  const [cursor, setCursor] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const current = dueCards[cursor];

  function refreshQueue() {
    setDueCards(computeDueCards(set));
    setSnapshot(computeSnapshot(set));
    setCursor(0);
    setRevealed(false);
  }

  function applyGrade(grade: ReviewGrade) {
    if (!current) {
      return;
    }

    markCardReview(set.id, current.id, grade);
    recordStudySession({
      seconds: 25,
      cardsReviewed: 1,
    });
    onProgressUpdate?.();

    if (cursor >= dueCards.length - 1) {
      refreshQueue();
      return;
    }

    const updatedDueCards = computeDueCards(set);
    const nextCursor = Math.min(cursor + 1, Math.max(updatedDueCards.length - 1, 0));

    setDueCards(updatedDueCards);
    setSnapshot(computeSnapshot(set));
    setCursor(nextCursor);
    setRevealed(false);
  }

  if (!current) {
    return (
      <section className="space-y-4 rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
        <h3 className="font-display text-3xl">Great progress</h3>
        <p>No due cards right now. You can continue with flashcard or writing mode.</p>
        <div className="grid gap-2 rounded-xl border border-emerald-200 bg-white/80 p-3 text-sm sm:grid-cols-3">
          <p>Mastered: {snapshot.masteredCount}</p>
          <p>Due: {snapshot.dueCount}</p>
          <p>Difficult: {snapshot.difficultCount}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] backdrop-blur md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Smart Review {cursor + 1} / {dueCards.length}
        </p>
        <button
          type="button"
          onClick={refreshQueue}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Refresh Due Queue
        </button>
      </div>

      <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 sm:grid-cols-3">
        <p>Mastered: {snapshot.masteredCount}</p>
        <p>Due now: {snapshot.dueCount}</p>
        <p>Difficult: {snapshot.difficultCount}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-white">
        <p className="text-xs uppercase tracking-wide text-white/70">Term</p>
        <h2 className="mt-2 font-display text-3xl">{current.term}</h2>
      </div>

      {revealed ? (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-cyan-900">
          <p className="text-xs font-semibold uppercase tracking-wide">Definition</p>
          <p className="mt-1">{current.definition}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Reveal Definition
        </button>
      )}

      <div className="grid gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => applyGrade("again")}
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
        >
          Again
        </button>
        <button
          type="button"
          onClick={() => applyGrade("hard")}
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
        >
          Hard
        </button>
        <button
          type="button"
          onClick={() => applyGrade("good")}
          className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
        >
          Good
        </button>
        <button
          type="button"
          onClick={() => applyGrade("easy")}
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          Easy
        </button>
      </div>
    </section>
  );
}
