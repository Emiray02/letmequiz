"use client";

import { useMemo, useState } from "react";
import {
  getCefrPlacementState,
  saveCefrPlacementAttempt,
  setManualCefrPlacementLevel,
  type CefrPlacementLevel,
} from "@/lib/cefr-placement-store";
import { trackAnalyticsEvent } from "@/lib/analytics-store";

type PlacementQuestion = {
  id: string;
  prompt: string;
  choices: Array<{ label: string; score: number }>;
};

const QUESTIONS: PlacementQuestion[] = [
  {
    id: "q1",
    prompt: "When introducing yourself, which sentence feels easiest?",
    choices: [
      { label: "Ich bin ...", score: 0 },
      { label: "Ich heisse ... und komme aus ...", score: 1 },
      { label: "Ich wohne seit drei Jahren in ...", score: 2 },
      { label: "Ich wuerde mich gerne kurz vorstellen ...", score: 3 },
    ],
  },
  {
    id: "q2",
    prompt: "How comfortable are you understanding appointment dialogs?",
    choices: [
      { label: "Only very basic words", score: 0 },
      { label: "I catch date and time sometimes", score: 1 },
      { label: "I usually understand change/cancel requests", score: 2 },
      { label: "I understand details and conditions", score: 3 },
    ],
  },
  {
    id: "q3",
    prompt: "Can you write a short 60-80 word email in German?",
    choices: [
      { label: "Not yet", score: 0 },
      { label: "With sentence templates only", score: 1 },
      { label: "Yes, with some grammar mistakes", score: 2 },
      { label: "Yes, and I can organize it clearly", score: 3 },
    ],
  },
  {
    id: "q4",
    prompt: "How often do you use connectors like weil, aber, dass?",
    choices: [
      { label: "Almost never", score: 0 },
      { label: "Occasionally", score: 1 },
      { label: "Often in writing", score: 2 },
      { label: "Naturally in speaking and writing", score: 3 },
    ],
  },
  {
    id: "q5",
    prompt: "How fast can you pick correct multiple-choice meaning?",
    choices: [
      { label: "I mostly guess", score: 0 },
      { label: "I need a lot of time", score: 1 },
      { label: "Moderate speed with fair accuracy", score: 2 },
      { label: "Fast and mostly accurate", score: 3 },
    ],
  },
  {
    id: "q6",
    prompt: "In speaking tasks, what describes you best?",
    choices: [
      { label: "Single words only", score: 0 },
      { label: "Short simple sentences", score: 1 },
      { label: "Connected sentences with pauses", score: 2 },
      { label: "Confident short explanations", score: 3 },
    ],
  },
  {
    id: "q7",
    prompt: "How often do you understand listening clips without transcript?",
    choices: [
      { label: "Rarely", score: 0 },
      { label: "Sometimes", score: 1 },
      { label: "Usually for A2 topics", score: 2 },
      { label: "Mostly even with new contexts", score: 3 },
    ],
  },
  {
    id: "q8",
    prompt: "How stable is your weekly German study routine?",
    choices: [
      { label: "1 day or less", score: 0 },
      { label: "2-3 days", score: 1 },
      { label: "4-5 days", score: 2 },
      { label: "6-7 days", score: 3 },
    ],
  },
];

function levelDescription(level: CefrPlacementLevel): string {
  if (level === "A1") {
    return "A1 baseline: focus on survival phrases, core grammar, and high-frequency vocabulary.";
  }
  if (level === "A2") {
    return "A2 baseline: focus on exam transfer, appointment dialogues, and short formal writing.";
  }
  return "B1 readiness: focus on fluency, argumentation patterns, and complex listening cues.";
}

export default function CefrPlacementTest() {
  const [stateVersion, setStateVersion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [finishedLevel, setFinishedLevel] = useState<CefrPlacementLevel | null>(null);

  const placement = useMemo(() => {
    void stateVersion;
    return getCefrPlacementState();
  }, [stateVersion]);

  const current = QUESTIONS[index] ?? null;

  function choose(score: number) {
    if (!current) {
      return;
    }

    const nextAnswers = [...answers, score];
    setAnswers(nextAnswers);

    if (index >= QUESTIONS.length - 1) {
      const attempt = saveCefrPlacementAttempt(nextAnswers);
      setFinishedLevel(attempt.level);
      setStateVersion((value) => value + 1);
      trackAnalyticsEvent({
        name: "placement-complete",
        value: attempt.score,
        metadata: { level: attempt.level },
      });
      return;
    }

    setIndex((value) => value + 1);
  }

  function restart() {
    setAnswers([]);
    setIndex(0);
    setFinishedLevel(null);
  }

  function applyManual(level: CefrPlacementLevel) {
    setManualCefrPlacementLevel(level);
    setStateVersion((value) => value + 1);
  }

  return (
    <section className="rounded-[1.6rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-2xl text-slate-900">CEFR Placement Test</h3>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          Current: {placement.currentLevel ?? "Not set"}
        </span>
      </div>

      {!finishedLevel && current ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Question {index + 1}/{QUESTIONS.length}
          </p>
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-900">
            {current.prompt}
          </p>
          <div className="space-y-2">
            {current.choices.map((choice, choiceIndex) => (
              <button
                key={`${current.id}-${choiceIndex}`}
                type="button"
                onClick={() => choose(choice.score)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {finishedLevel ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
            <p className="text-sm font-semibold">Recommended level: {finishedLevel}</p>
            <p className="mt-1 text-xs">{levelDescription(finishedLevel)}</p>
          </div>
          <button
            type="button"
            onClick={restart}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Retake Test
          </button>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Manual Override</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["A1", "A2", "B1"] as CefrPlacementLevel[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => applyManual(level)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Set {level}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
