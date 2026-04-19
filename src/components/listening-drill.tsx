"use client";

import { useEffect, useState } from "react";
import type { StudySet } from "@/types/study";
import { markCardReview, recordStudySession } from "@/lib/student-store";
import type { ReviewGrade } from "@/types/student";

type ListeningDrillProps = {
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

function speak(text: string, rate: number) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

export default function ListeningDrill({ set, onProgressUpdate }: ListeningDrillProps) {
  const [order, setOrder] = useState<number[]>(() => shuffledIndexes(set.cards.length));
  const [cursor, setCursor] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [rate, setRate] = useState(0.9);
  const [lastGrade, setLastGrade] = useState<ReviewGrade | null>(null);

  const total = order.length;
  const currentCard = total > 0 ? set.cards[order[cursor]] : null;

  useEffect(() => {
    if (!currentCard || !autoPlay) {
      return;
    }

    speak(currentCard.term, rate);
  }, [currentCard, autoPlay, rate]);

  function goNext() {
    if (cursor >= total - 1) {
      setOrder(shuffledIndexes(total));
      setCursor(0);
      setRevealed(false);
      return;
    }

    setCursor((value) => value + 1);
    setRevealed(false);
  }

  function gradeCard(grade: ReviewGrade) {
    if (!currentCard) {
      return;
    }

    markCardReview(set.id, currentCard.id, grade);
    recordStudySession({
      seconds: 25,
      cardsReviewed: 1,
    });
    setLastGrade(grade);
    onProgressUpdate?.();
    goNext();
  }

  if (!currentCard) {
    return (
      <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Add cards to use listening drill.
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] backdrop-blur md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Listening Drill {cursor + 1} / {total}
        </p>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rate</label>
          <input
            type="range"
            min={0.6}
            max={1.3}
            step={0.05}
            value={rate}
            onChange={(event) => setRate(Number(event.target.value))}
            className="accent-slate-900"
          />
          <button
            type="button"
            onClick={() => setAutoPlay((value) => !value)}
            className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
              autoPlay
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            {autoPlay ? "Auto On" : "Auto Off"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">Listen and recall</p>
        <h2 className="mt-2 font-display text-3xl text-slate-900">{currentCard.term}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => speak(currentCard.term, rate)}
            className="rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
          >
            Play Term
          </button>
          <button
            type="button"
            onClick={() => speak(currentCard.definition, rate)}
            className="rounded-xl border border-teal-300 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
          >
            Play Definition
          </button>
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {revealed ? "Hide Answer" : "Reveal Answer"}
          </button>
        </div>

        {revealed ? (
          <p className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
            {currentCard.definition}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => gradeCard("again")}
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
        >
          Again
        </button>
        <button
          type="button"
          onClick={() => gradeCard("hard")}
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
        >
          Hard
        </button>
        <button
          type="button"
          onClick={() => gradeCard("good")}
          className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
        >
          Good
        </button>
        <button
          type="button"
          onClick={() => gradeCard("easy")}
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          Easy
        </button>
      </div>

      {lastGrade ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Last grade: {lastGrade}
        </p>
      ) : null}
    </section>
  );
}
