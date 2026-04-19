"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import type { StudySet } from "@/types/study";
import {
  markCardReview,
  recordStudySession,
  recordWritingAttempt,
} from "@/lib/student-store";

type WritePracticeProps = {
  set: StudySet;
  onProgressUpdate?: () => void;
};

type Direction = "term-to-definition" | "definition-to-term";

type RecognitionResult = {
  transcript: string;
};

type RecognitionEvent = {
  results: Array<Array<RecognitionResult>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type BrowserSpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function shuffleIndexes(length: number): number[] {
  const items = Array.from({ length }, (_, index) => index);
  for (let i = items.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [items[i], items[randomIndex]] = [items[randomIndex], items[i]];
  }
  return items;
}

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[.,!?;:()\[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (!a.length) {
    return b.length;
  }
  if (!b.length) {
    return a.length;
  }

  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array.from<number>({ length: b.length + 1 }).fill(0)
  );

  for (let row = 0; row <= a.length; row += 1) {
    matrix[row][0] = row;
  }
  for (let column = 0; column <= b.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function checkAnswer(input: string, expected: string): boolean {
  const normalizedInput = normalizeText(input);
  const normalizedExpected = normalizeText(expected);

  if (!normalizedInput || !normalizedExpected) {
    return false;
  }

  if (normalizedInput === normalizedExpected) {
    return true;
  }

  if (
    normalizedInput.length > 4 &&
    (normalizedInput.includes(normalizedExpected) || normalizedExpected.includes(normalizedInput))
  ) {
    return true;
  }

  const distance = levenshteinDistance(normalizedInput, normalizedExpected);
  const tolerance = Math.max(1, Math.floor(normalizedExpected.length * 0.2));
  return distance <= tolerance;
}

export default function WritePractice({ set, onProgressUpdate }: WritePracticeProps) {
  const [direction, setDirection] = useState<Direction>("term-to-definition");
  const [order, setOrder] = useState<number[]>(() => shuffleIndexes(set.cards.length));
  const [cursor, setCursor] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<null | { correct: boolean; expected: string }>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const totalCards = order.length;
  const currentCard = totalCards > 0 ? set.cards[order[cursor]] : null;

  const prompt = useMemo(() => {
    if (!currentCard) {
      return "";
    }
    return direction === "term-to-definition" ? currentCard.term : currentCard.definition;
  }, [currentCard, direction]);

  const expected = useMemo(() => {
    if (!currentCard) {
      return "";
    }
    return direction === "term-to-definition" ? currentCard.definition : currentCard.term;
  }, [currentCard, direction]);

  function moveNextQuestion() {
    setAnswer("");
    setFeedback(null);
    if (cursor >= totalCards - 1) {
      setOrder(shuffleIndexes(totalCards));
      setCursor(0);
      return;
    }

    setCursor((value) => value + 1);
  }

  function toggleDirection() {
    setDirection((value) =>
      value === "term-to-definition" ? "definition-to-term" : "term-to-definition"
    );
    setAnswer("");
    setFeedback(null);
  }

  function onSubmitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentCard || !answer.trim()) {
      return;
    }

    const correct = checkAnswer(answer, expected);
    setAttempts((value) => value + 1);
    if (correct) {
      setScore((value) => value + 1);
    }

    setFeedback({
      correct,
      expected,
    });

    recordWritingAttempt(correct);
    recordStudySession({
      seconds: 30,
      cardsReviewed: 1,
    });
    markCardReview(set.id, currentCard.id, correct ? "good" : "hard");
    onProgressUpdate?.();
  }

  function startVoiceInput() {
    if (typeof window === "undefined") {
      return;
    }

    const speechWindow = window as BrowserSpeechWindow;
    const SpeechRecognitionImpl =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionImpl) {
      setFeedback({
        correct: false,
        expected: "Browser speech recognition is not available.",
      });
      return;
    }

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = "tr-TR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: RecognitionEvent) => {
      const transcript = event?.results?.[0]?.[0]?.transcript;
      if (typeof transcript === "string") {
        setAnswer((current) => (current ? `${current} ${transcript}` : transcript));
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  function stopVoiceInput() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }

  if (!currentCard) {
    return (
      <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Add at least one card to use writing practice.
      </section>
    );
  }

  const accuracy = attempts === 0 ? 0 : Math.round((score / attempts) * 100);

  return (
    <section className="space-y-5 rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] backdrop-blur md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Write Mode {cursor + 1} / {totalCards}
        </p>
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <span>Score: {score}</span>
          <span>Accuracy: %{accuracy}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-white">
        <p className="text-xs uppercase tracking-wide text-white/70">
          {direction === "term-to-definition" ? "Term" : "Definition"}
        </p>
        <h2 className="mt-2 font-display text-3xl">{prompt}</h2>
      </div>

      <form onSubmit={onSubmitAnswer} className="space-y-3">
        <textarea
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder={
            direction === "term-to-definition"
              ? "Type the definition"
              : "Type the matching term"
          }
          className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none ring-teal-500 transition focus:ring"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Check Answer
          </button>
          <button
            type="button"
            onClick={feedback ? moveNextQuestion : toggleDirection}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {feedback ? "Next" : "Switch Direction"}
          </button>
          {!isListening ? (
            <button
              type="button"
              onClick={startVoiceInput}
              className="rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
            >
              Voice Input
            </button>
          ) : (
            <button
              type="button"
              onClick={stopVoiceInput}
              className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              Stop Listening
            </button>
          )}
        </div>
      </form>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.correct
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <p className="font-semibold">{feedback.correct ? "Correct" : "Not quite yet"}</p>
          {!feedback.correct ? <p className="mt-1">Expected answer: {feedback.expected}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
