"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  getQuizMistakes,
  markCardReview,
  recordQuizMistake,
  recordStudySession,
  recordWritingAttempt,
} from "@/lib/student-store";

type ExamArenaProps = {
  set: StudySet;
  onProgressUpdate?: () => void;
};

type ExamMode = "fill-blank" | "short-answer" | "matching" | "mini-quiz";

type MiniQuestion = {
  cardId: string;
  prompt: string;
  answer: string;
  options: string[];
};

const modeLabels: Array<{ id: ExamMode; label: string }> = [
  { id: "fill-blank", label: "Fill Blank" },
  { id: "short-answer", label: "Short Answer" },
  { id: "matching", label: "Matching" },
  { id: "mini-quiz", label: "Mistake Mini Quiz" },
];

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[.,!?;:()\[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function checkLooseMatch(input: string, expected: string): boolean {
  const a = normalizeText(input);
  const b = normalizeText(expected);
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }

  if (a.length > 4 && (a.includes(b) || b.includes(a))) {
    return true;
  }

  return false;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
  }
  return copy;
}

function buildBlankPrompt(card: Card): { prompt: string; answer: string } {
  const words = card.definition
    .split(/\s+/)
    .map((item) => item.replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ]/g, ""))
    .filter((item) => item.length >= 5);

  const answer = words[0];
  if (answer) {
    const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const prompt = card.definition.replace(new RegExp(escaped, "i"), "____");
    return {
      prompt,
      answer,
    };
  }

  return {
    prompt: `____ means: ${card.definition}`,
    answer: card.term,
  };
}

function buildMiniQuestions(cards: Card[], setId: string): MiniQuestion[] {
  const mistakes = getQuizMistakes(setId);
  const weakIds = new Set(mistakes.map((item) => item.cardId));

  const targets = cards.filter((card) => weakIds.has(card.id));
  const source = targets.length > 0 ? targets : cards.slice(0, Math.min(6, cards.length));

  return source.map((card) => {
    const distractors = shuffle(
      cards
        .filter((candidate) => candidate.id !== card.id)
        .map((candidate) => candidate.definition)
    ).slice(0, 3);

    while (distractors.length < 3) {
      distractors.push(`Not related to ${card.term}`);
    }

    const options = shuffle([card.definition, ...distractors]);
    return {
      cardId: card.id,
      prompt: card.term,
      answer: card.definition,
      options,
    };
  });
}

export default function ExamArena({ set, onProgressUpdate }: ExamArenaProps) {
  const [mode, setMode] = useState<ExamMode>("fill-blank");

  const [cursor, setCursor] = useState(0);
  const [responseText, setResponseText] = useState("");
  const [feedback, setFeedback] = useState("");

  const [matchingChoices, setMatchingChoices] = useState<Record<string, string>>({});
  const [matchingFeedback, setMatchingFeedback] = useState("");

  const [miniQuestions, setMiniQuestions] = useState<MiniQuestion[]>(() =>
    buildMiniQuestions(set.cards, set.id)
  );
  const [miniIndex, setMiniIndex] = useState(0);
  const [miniSelected, setMiniSelected] = useState<string | null>(null);
  const [miniRevealed, setMiniRevealed] = useState(false);
  const [miniScore, setMiniScore] = useState(0);
  const [miniExplanation, setMiniExplanation] = useState("");

  const integrityStartedRef = useRef(false);
  const integrityEventAtRef = useRef<Partial<Record<ExamIntegrityEventType, number>>>({});

  const card = set.cards[cursor] ?? null;
  const blankPrompt = useMemo(() => (card ? buildBlankPrompt(card) : null), [card]);
  const matchingCards = useMemo(() => set.cards.slice(0, Math.min(6, set.cards.length)), [set.cards]);
  const matchingOptions = useMemo(
    () => shuffle(matchingCards.map((item) => item.definition)),
    [matchingCards]
  );

  const miniQuestion = miniQuestions[miniIndex] ?? null;
  const integrity = getLatestExamIntegritySummary(set.id);

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
          source: "exam-arena",
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

  if (!card) {
    return (
      <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Add cards to use Exam Arena.
      </section>
    );
  }

  function nextCard() {
    setCursor((value) => (value + 1) % Math.max(set.cards.length, 1));
    setResponseText("");
    setFeedback("");
  }

  function submitFillBlank() {
    if (!blankPrompt || !responseText.trim()) {
      return;
    }

    const correct = checkLooseMatch(responseText, blankPrompt.answer);
    const explanation = correct
      ? ""
      : buildWrongAnswerExplanation({
          prompt: blankPrompt.prompt,
          correctAnswer: blankPrompt.answer,
          selectedAnswer: responseText.trim(),
        });

    setFeedback(
      correct ? "Correct blank completion." : `Expected: ${blankPrompt.answer}. ${explanation}`
    );
    markCardReview(set.id, card.id, correct ? "good" : "hard");
    if (!correct) {
      recordQuizMistake({
        setId: set.id,
        cardId: card.id,
        prompt: blankPrompt.prompt,
        answer: blankPrompt.answer,
        selectedAnswer: responseText.trim(),
        explanation,
        timedOut: false,
      });
    }
    recordWritingAttempt(correct);
    recordStudySession({ seconds: 35, cardsReviewed: 1 });
    onProgressUpdate?.();
  }

  function submitShortAnswer() {
    if (!responseText.trim()) {
      return;
    }

    const correct = checkLooseMatch(responseText, card.definition);
    const explanation = correct
      ? ""
      : buildWrongAnswerExplanation({
          prompt: card.term,
          correctAnswer: card.definition,
          selectedAnswer: responseText.trim(),
        });

    setFeedback(
      correct ? "Strong short answer." : `Expected meaning: ${card.definition}. ${explanation}`
    );
    markCardReview(set.id, card.id, correct ? "good" : "hard");
    if (!correct) {
      recordQuizMistake({
        setId: set.id,
        cardId: card.id,
        prompt: card.term,
        answer: card.definition,
        selectedAnswer: responseText.trim(),
        explanation,
        timedOut: false,
      });
    }
    recordWritingAttempt(correct);
    recordStudySession({ seconds: 40, cardsReviewed: 1 });
    onProgressUpdate?.();
  }

  function submitMatching() {
    if (matchingCards.length === 0) {
      return;
    }

    let correctCount = 0;
    for (const item of matchingCards) {
      if (matchingChoices[item.id] === item.definition) {
        correctCount += 1;
        markCardReview(set.id, item.id, "good");
      } else {
        markCardReview(set.id, item.id, "hard");
      }
    }

    recordStudySession({ seconds: 70, cardsReviewed: matchingCards.length });
    onProgressUpdate?.();
    setMatchingFeedback(`Matched ${correctCount}/${matchingCards.length} correctly.`);
  }

  function submitMiniOption(option: string) {
    if (!miniQuestion || miniRevealed) {
      return;
    }

    setMiniSelected(option);
    setMiniRevealed(true);

    const correct = option === miniQuestion.answer;
    if (correct) {
      setMiniScore((value) => value + 1);
      markCardReview(set.id, miniQuestion.cardId, "good");
      setMiniExplanation("Great correction. Keep this pattern in long-term memory.");
    } else {
      markCardReview(set.id, miniQuestion.cardId, "hard");

      const explanation = buildWrongAnswerExplanation({
        prompt: miniQuestion.prompt,
        correctAnswer: miniQuestion.answer,
        selectedAnswer: option,
      });

      setMiniExplanation(explanation);
      recordQuizMistake({
        setId: set.id,
        cardId: miniQuestion.cardId,
        prompt: miniQuestion.prompt,
        answer: miniQuestion.answer,
        selectedAnswer: option,
        explanation,
        timedOut: false,
      });
    }

    recordStudySession({ seconds: 20, cardsReviewed: 1 });
    onProgressUpdate?.();
  }

  function nextMiniQuestion() {
    if (!miniRevealed) {
      return;
    }

    if (miniIndex >= miniQuestions.length - 1) {
      setMiniQuestions(buildMiniQuestions(set.cards, set.id));
      setMiniIndex(0);
      setMiniSelected(null);
      setMiniRevealed(false);
      setMiniScore(0);
      setMiniExplanation("");
      return;
    }

    setMiniIndex((value) => value + 1);
    setMiniSelected(null);
    setMiniRevealed(false);
    setMiniExplanation("");
  }

  return (
    <section className="space-y-5 rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] backdrop-blur md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Exam Arena</p>
        <p className="text-sm text-slate-600">Mode: {modeLabels.find((item) => item.id === mode)?.label}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        {modeLabels.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setMode(item.id);
              setFeedback("");
              setMatchingFeedback("");
              setMiniExplanation("");
            }}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              mode === item.id
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {mode === "fill-blank" && blankPrompt ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Fill In The Blank</p>
          <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">{blankPrompt.prompt}</p>
          <input
            value={responseText}
            onChange={(event) => setResponseText(event.target.value)}
            placeholder="Type missing word"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submitFillBlank}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Check Blank
            </button>
            <button
              type="button"
              onClick={nextCard}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Next Card
            </button>
          </div>
          {feedback ? <p className="text-sm text-slate-600">{feedback}</p> : null}
        </div>
      ) : null}

      {mode === "short-answer" ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Short Answer</p>
          <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">Explain: {card.term}</p>
          <textarea
            value={responseText}
            onChange={(event) => setResponseText(event.target.value)}
            placeholder="Write a short meaning in your own words"
            className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submitShortAnswer}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Check Answer
            </button>
            <button
              type="button"
              onClick={nextCard}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Next Card
            </button>
          </div>
          {feedback ? <p className="text-sm text-slate-600">{feedback}</p> : null}
        </div>
      ) : null}

      {mode === "matching" ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Matching</p>
          <div className="space-y-2">
            {matchingCards.map((item) => (
              <div key={item.id} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_1.4fr]">
                <p className="text-sm font-semibold text-slate-800">{item.term}</p>
                <select
                  value={matchingChoices[item.id] ?? ""}
                  onChange={(event) =>
                    setMatchingChoices((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                >
                  <option value="">Choose definition</option>
                  {matchingOptions.map((option) => (
                    <option key={`${item.id}-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={submitMatching}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Check Matching
          </button>
          {matchingFeedback ? <p className="text-sm text-slate-600">{matchingFeedback}</p> : null}
        </div>
      ) : null}

      {mode === "mini-quiz" ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Mistake Mini Quiz ({miniIndex + 1}/{Math.max(miniQuestions.length, 1)})
          </p>
          {miniQuestion ? (
            <>
              <h3 className="text-lg font-semibold text-slate-900">{miniQuestion.prompt}</h3>
              <div className="space-y-2">
                {miniQuestion.options.map((option) => {
                  const correct = option === miniQuestion.answer;
                  const selected = miniSelected === option;
                  let className = "border-slate-200 bg-white text-slate-700 hover:border-slate-300";
                  if (miniRevealed && correct) {
                    className = "border-emerald-300 bg-emerald-50 text-emerald-800";
                  } else if (miniRevealed && selected && !correct) {
                    className = "border-rose-300 bg-rose-50 text-rose-700";
                  }

                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={miniRevealed}
                      onClick={() => submitMiniOption(option)}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed ${className}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!miniRevealed}
                  onClick={nextMiniQuestion}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {miniIndex >= miniQuestions.length - 1 ? "Restart Mini Quiz" : "Next Mini Question"}
                </button>
                <p className="text-sm text-slate-600">Score: {miniScore}</p>
              </div>

              {miniExplanation ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {miniExplanation}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-600">Not enough cards to build mini quiz.</p>
          )}
        </div>
      ) : null}

      {integrity.warningCount > 0 ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Integrity alerts in this arena: {integrity.warningCount} | Risk %{integrity.riskScore}
        </p>
      ) : (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Integrity check: stable focus signal so far.
        </p>
      )}
    </section>
  );
}
