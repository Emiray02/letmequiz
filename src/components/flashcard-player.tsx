"use client";

import { useMemo, useState } from "react";
import type { StudySet } from "@/types/study";
import {
  getReviewSnapshotForSet,
  markCardReview,
  recordStudySession,
} from "@/lib/student-store";
import type { ReviewGrade } from "@/types/student";

type FlashcardPlayerProps = {
  set: StudySet;
  onProgressUpdate?: () => void;
};

function shuffledIndexes(length: number): number[] {
  const indexes = Array.from({ length }, (_, index) => index);
  for (let i = indexes.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [indexes[i], indexes[randomIndex]] = [indexes[randomIndex], indexes[i]];
  }
  return indexes;
}

function gradeLabel(grade: ReviewGrade): string {
  if (grade === "again") {
    return "Again";
  }
  if (grade === "hard") {
    return "Hard";
  }
  if (grade === "good") {
    return "Good";
  }
  return "Easy";
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

export default function FlashcardPlayer({ set, onProgressUpdate }: FlashcardPlayerProps) {
  const [order, setOrder] = useState<number[]>(() =>
    Array.from({ length: set.cards.length }, (_, index) => index)
  );
  const [cursor, setCursor] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [lastGrade, setLastGrade] = useState<ReviewGrade | null>(null);
  const [snapshotVersion, setSnapshotVersion] = useState(0);

  const snapshot = useMemo(
    () => {
      void snapshotVersion;
      return getReviewSnapshotForSet(
        set.id,
        set.cards.map((card) => card.id)
      );
    },
    [set, snapshotVersion]
  );

  const totalCards = order.length;
  const currentCard = set.cards[order[cursor]];
  const progress = useMemo(() => {
    if (totalCards === 0) {
      return 0;
    }
    return Math.round(((cursor + 1) / totalCards) * 100);
  }, [cursor, totalCards]);

  if (totalCards === 0 || !currentCard) {
    return (
      <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900">
        This set has no cards yet.
      </section>
    );
  }

  function goNext() {
    setCursor((value) => (value + 1) % totalCards);
    setFlipped(false);
  }

  function goPrevious() {
    setCursor((value) => (value - 1 + totalCards) % totalCards);
    setFlipped(false);
  }

  function shuffleDeck() {
    setOrder(shuffledIndexes(totalCards));
    setCursor(0);
    setFlipped(false);
  }

  function gradeCurrentCard(grade: ReviewGrade) {
    markCardReview(set.id, currentCard.id, grade);
    recordStudySession({
      seconds: 20,
      cardsReviewed: 1,
    });
    setLastGrade(grade);
    setSnapshotVersion((value) => value + 1);
    onProgressUpdate?.();
  }

  return (
    <section className="space-y-5 rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] backdrop-blur md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Card {cursor + 1} of {totalCards}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={shuffleDeck}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Shuffle
          </button>
          <button
            type="button"
            onClick={() => speak(currentCard.term)}
            className="rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-700 transition hover:bg-cyan-100"
          >
            Speak Term
          </button>
          <button
            type="button"
            onClick={() => speak(currentCard.definition)}
            className="rounded-xl border border-teal-300 bg-teal-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-teal-700 transition hover:bg-teal-100"
          >
            Speak Def
          </button>
        </div>
      </div>

      <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700 sm:grid-cols-3">
        <p>Due now: {snapshot.dueCount}</p>
        <p>Mastered: {snapshot.masteredCount}</p>
        <p>Difficult: {snapshot.difficultCount}</p>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-teal-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="relative h-80 w-full [perspective:1400px]">
        <button
          type="button"
          onClick={() => setFlipped((value) => !value)}
          className={`relative h-full w-full rounded-[1.6rem] border border-slate-200 [transform-style:preserve-3d] transition-transform duration-500 ${
            flipped ? "[transform:rotateY(180deg)]" : ""
          }`}
          aria-label="Flip flashcard"
        >
          <span className="absolute inset-0 flex items-center justify-center rounded-[1.6rem] bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-center text-2xl font-semibold text-white [backface-visibility:hidden]">
            {currentCard.term}
          </span>
          <span className="absolute inset-0 flex items-center justify-center rounded-[1.6rem] bg-gradient-to-br from-teal-500 to-cyan-500 p-6 text-center text-xl font-medium text-slate-950 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            {currentCard.definition}
          </span>
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={goPrevious}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={goNext}
          className="flex-1 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Next
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          How well did you remember this card?
        </p>
        <div className="grid gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => gradeCurrentCard("again")}
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            Again
          </button>
          <button
            type="button"
            onClick={() => gradeCurrentCard("hard")}
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
          >
            Hard
          </button>
          <button
            type="button"
            onClick={() => gradeCurrentCard("good")}
            className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
          >
            Good
          </button>
          <button
            type="button"
            onClick={() => gradeCurrentCard("easy")}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Easy
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Tip: click the card to toggle between term and definition.
      </p>

      {lastGrade ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Last rating: {gradeLabel(lastGrade)}
        </p>
      ) : null}
    </section>
  );
}
