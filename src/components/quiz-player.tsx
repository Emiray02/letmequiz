"use client";

import { useEffect, useRef, useState } from "react";
import type { Card, StudySet } from "@/types/study";
import { trackAnalyticsEvent } from "@/lib/analytics-store";
import { buildWrongAnswerExplanation } from "@/lib/answer-explainer";
import {
  endExamIntegritySession,
  getLatestExamIntegritySummary,
  recordExamIntegrityEvent,
  startExamIntegritySession,
  type ExamIntegrityEventType,
} from "@/lib/exam-integrity-store";
import {
  markCardReview,
  recordQuizMistake,
  recordQuizSession,
  recordStudySession,
} from "@/lib/student-store";

type QuizPlayerProps = {
  set: StudySet;
  onProgressUpdate?: () => void;
};

type Question = {
  cardId: string;
  prompt: string;
  answer: string;
  options: string[];
};

type MistakeEntry = {
  prompt: string;
  answer: string;
  selectedAnswer?: string;
  explanation: string;
  timedOut: boolean;
};

function shuffle<T>(values: T[]): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
  }
  return copy;
}

function buildQuestions(cards: Card[]): Question[] {
  return cards.map((card) => {
    const distractors = shuffle(
      cards
        .filter((candidate) => candidate.id !== card.id)
        .map((candidate) => candidate.definition)
    ).slice(0, 3);

    const options = shuffle([card.definition, ...distractors]);
    return {
      cardId: card.id,
      prompt: card.term,
      answer: card.definition,
      options,
    };
  });
}

export default function QuizPlayer({ set, onProgressUpdate }: QuizPlayerProps) {
  const [questions, setQuestions] = useState<Question[]>(() =>
    shuffle(buildQuestions(set.cards))
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [timedMode, setTimedMode] = useState(true);
  const [questionDuration, setQuestionDuration] = useState(20);
  const [timeLeft, setTimeLeft] = useState(20);
  const [timedOut, setTimedOut] = useState(false);
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([]);
  const [questionExplanation, setQuestionExplanation] = useState("");

  const startedAtRef = useRef(0);
  const integrityStartedRef = useRef(false);
  const integrityEventAtRef = useRef<Partial<Record<ExamIntegrityEventType, number>>>({});

  const question = questions[questionIndex];

  useEffect(() => {
    if (startedAtRef.current === 0) {
      startedAtRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    startExamIntegritySession(set.id);
    integrityStartedRef.current = true;

    function pushIntegrityEvent(type: ExamIntegrityEventType) {
      const now = Date.now();
      const lastAt = integrityEventAtRef.current[type] ?? 0;
      if (now - lastAt < 600) {
        return;
      }

      integrityEventAtRef.current[type] = now;
      recordExamIntegrityEvent(type);
      trackAnalyticsEvent({
        name: "exam-warning",
        metadata: {
          type,
          setId: set.id,
        },
      });
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        pushIntegrityEvent("tab-hidden");
      }
    };
    const onBlur = () => pushIntegrityEvent("window-blur");
    const onCopy = () => pushIntegrityEvent("copy-attempt");
    const onPaste = () => pushIntegrityEvent("paste-attempt");
    const onContextMenu = () => pushIntegrityEvent("context-menu");
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        pushIntegrityEvent("fullscreen-exit");
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (integrityStartedRef.current) {
        endExamIntegritySession();
        integrityStartedRef.current = false;
      }
    };
  }, [set.id]);

  useEffect(() => {
    if (!question || !timedMode || revealed || completed) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (timeLeft <= 1) {
        setTimeLeft(0);
        setTimedOut(true);
        setRevealed(true);

        const explanation = buildWrongAnswerExplanation({
          prompt: question.prompt,
          correctAnswer: question.answer,
          timedOut: true,
        });

        setQuestionExplanation(explanation);
        setMistakes((current) => [
          ...current,
          {
            prompt: question.prompt,
            answer: question.answer,
            explanation,
            timedOut: true,
          },
        ]);
        markCardReview(set.id, question.cardId, "hard");
        recordQuizMistake({
          setId: set.id,
          cardId: question.cardId,
          prompt: question.prompt,
          answer: question.answer,
          selectedAnswer: "",
          explanation,
          timedOut: true,
        });
        return;
      }

      setTimeLeft((value) => value - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [completed, question, revealed, set.id, timeLeft, timedMode, timedOut]);

  if (!question) {
    return (
      <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900">
        At least one card is required to run quiz mode.
      </section>
    );
  }

  function submitOption(option: string) {
    if (revealed || completed) {
      return;
    }

    setSelectedOption(option);
    setRevealed(true);
    setTimedOut(false);
    setQuestionExplanation("");

    if (option === question.answer) {
      setScore((value) => value + 1);
      markCardReview(set.id, question.cardId, "good");
      return;
    }

    const explanation = buildWrongAnswerExplanation({
      prompt: question.prompt,
      correctAnswer: question.answer,
      selectedAnswer: option,
    });

    setQuestionExplanation(explanation);
    setMistakes((current) => [
      ...current,
      {
        prompt: question.prompt,
        answer: question.answer,
        selectedAnswer: option,
        explanation,
        timedOut: false,
      },
    ]);
    markCardReview(set.id, question.cardId, "hard");
    recordQuizMistake({
      setId: set.id,
      cardId: question.cardId,
      prompt: question.prompt,
      answer: question.answer,
      selectedAnswer: option,
      explanation,
      timedOut: false,
    });
  }

  function goToNextQuestion() {
    if (!revealed) {
      return;
    }

    if (questionIndex >= questions.length - 1) {
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      const wrongAnswers = Math.max(0, questions.length - score);

      recordQuizSession({
        correctAnswers: score,
        wrongAnswers,
      });
      recordStudySession({
        seconds: elapsedSeconds,
        cardsReviewed: questions.length,
      });
      onProgressUpdate?.();
      setCompleted(true);
      return;
    }

    setQuestionIndex((value) => value + 1);
    setSelectedOption(null);
    setRevealed(false);
    setTimedOut(false);
    setQuestionExplanation("");
    setTimeLeft(questionDuration);
  }

  function restart() {
    setQuestions(shuffle(buildQuestions(set.cards)));
    startedAtRef.current = Date.now();
    setQuestionIndex(0);
    setSelectedOption(null);
    setRevealed(false);
    setScore(0);
    setCompleted(false);
    setTimedOut(false);
    setQuestionExplanation("");
    setTimeLeft(questionDuration);
    setMistakes([]);
  }

  if (completed) {
    const percentage = Math.round((score / questions.length) * 100);
    const integrity = getLatestExamIntegritySummary(set.id);
    return (
      <section className="space-y-5 rounded-[2rem] border border-black/10 bg-white/80 p-8 text-center shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quiz Result</p>
        <h2 className="font-display text-4xl text-slate-900">
          {score} / {questions.length}
        </h2>
        <p className="text-lg text-slate-700">Accuracy: %{percentage}</p>

        {mistakes.length > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Focus On These Terms
            </p>
            <ul className="mt-2 space-y-2 text-sm text-amber-900">
              {mistakes.slice(0, 6).map((item, index) => (
                <li key={`${item.prompt}-${index}`} className="rounded-lg border border-amber-200 bg-white/80 p-2">
                  <p>
                    {item.prompt} to {item.answer}
                  </p>
                  {item.selectedAnswer ? (
                    <p className="text-xs text-amber-700">You chose: {item.selectedAnswer}</p>
                  ) : item.timedOut ? (
                    <p className="text-xs text-amber-700">No answer selected (timeout).</p>
                  ) : null}
                  <p className="text-xs text-amber-800">{item.explanation}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {integrity.warningCount > 0 ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Integrity alerts: {integrity.warningCount} | Risk %{integrity.riskScore}
          </p>
        ) : (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Integrity check: no warning signals detected.
          </p>
        )}

        <button
          type="button"
          onClick={restart}
          className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Try Again
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] backdrop-blur md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Question {questionIndex + 1} / {questions.length}
        </p>
        <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <span>Score: {score}</span>
          {timedMode ? (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              timeLeft <= 5 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
            }`}>
              {timeLeft}s
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_auto]">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={timedMode}
            onChange={(event) => {
              const next = event.target.checked;
              setTimedMode(next);
              setTimeLeft(questionDuration);
            }}
            className="accent-slate-900"
          />
          Timed mode
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span>Seconds</span>
          <input
            type="range"
            min={10}
            max={45}
            step={5}
            value={questionDuration}
            onChange={(event) => {
              const next = Number(event.target.value);
              setQuestionDuration(next);
              setTimeLeft(next);
            }}
            className="accent-slate-900"
          />
          <span className="w-7 text-right text-xs font-semibold">{questionDuration}</span>
        </label>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-white">
        <p className="text-xs uppercase tracking-wide text-white/70">Term</p>
        <h2 className="mt-2 font-display text-3xl">{question.prompt}</h2>
      </div>

      <div className="space-y-3">
        {question.options.map((option) => {
          const isCorrect = option === question.answer;
          const isSelected = selectedOption === option;

          let buttonClassName = "border-slate-200 bg-white text-slate-800 hover:border-slate-400";

          if (revealed && isCorrect) {
            buttonClassName = "border-emerald-300 bg-emerald-50 text-emerald-900";
          } else if (revealed && isSelected && !isCorrect) {
            buttonClassName = "border-rose-300 bg-rose-50 text-rose-800";
          }

          return (
            <button
              key={option}
              type="button"
              onClick={() => submitOption(option)}
              disabled={revealed}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${buttonClassName} disabled:cursor-not-allowed`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {timedOut ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Time is up. Review the correct answer and continue.
        </p>
      ) : null}

      {questionExplanation ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {questionExplanation}
        </p>
      ) : null}

      <button
        type="button"
        onClick={goToNextQuestion}
        disabled={!revealed}
        className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {questionIndex >= questions.length - 1 ? "Finish Quiz" : "Next Question"}
      </button>
    </section>
  );
}
