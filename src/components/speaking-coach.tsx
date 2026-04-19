"use client";

import { useMemo, useRef, useState } from "react";
import type { StudySet } from "@/types/study";
import { trackAnalyticsEvent } from "@/lib/analytics-store";
import { addSpeakingAttempt, getSpeakingAttempts } from "@/lib/speaking-coach-store";
import { recordStudySession, recordWritingAttempt } from "@/lib/student-store";

type SpeakingCoachProps = {
  set: StudySet;
  onProgressUpdate?: () => void;
};

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

function scoreSimilarity(target: string, transcript: string): number {
  const normalizedTarget = normalizeText(target);
  const normalizedTranscript = normalizeText(transcript);

  if (!normalizedTarget || !normalizedTranscript) {
    return 0;
  }

  const distance = levenshteinDistance(normalizedTarget, normalizedTranscript);
  const maxLength = Math.max(normalizedTarget.length, normalizedTranscript.length, 1);
  const ratio = 1 - distance / maxLength;
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
}

function evaluateGrammar(transcript: string): { score: number; suggestions: string[] } {
  const suggestions: string[] = [];
  let score = 100;

  const trimmed = transcript.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);

  if (words.length < 4) {
    score -= 25;
    suggestions.push("Use at least one full sentence with 4 or more words.");
  }
  if (trimmed && trimmed[0] === trimmed[0].toLowerCase()) {
    score -= 10;
    suggestions.push("Start sentence with a capital letter.");
  }
  if (!/[.!?]$/.test(trimmed)) {
    score -= 10;
    suggestions.push("End sentence with punctuation for exam writing transfer.");
  }

  const connectors = ["weil", "dass", "aber", "und", "denn"];
  const hasConnector = connectors.some((item) => normalizeText(trimmed).includes(item));
  if (!hasConnector && words.length >= 6) {
    score -= 8;
    suggestions.push("Try using one connector like 'weil' or 'aber'.");
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    suggestions: suggestions.slice(0, 4),
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function extractWords(text: string): string[] {
  return normalizeText(text).split(/\s+/).filter(Boolean);
}

function evaluateFluency(target: string, transcript: string): { score: number; suggestions: string[] } {
  const suggestions: string[] = [];
  const words = extractWords(transcript);
  const targetWords = extractWords(target);

  const fillerCount = (transcript.match(/\b(um|uh|hmm|eh)\b/gi) ?? []).length;
  const coverage = targetWords.length > 0 ? Math.min(words.length / targetWords.length, 1.3) : 1;

  const repeatMap = new Map<string, number>();
  for (const word of words) {
    repeatMap.set(word, (repeatMap.get(word) ?? 0) + 1);
  }

  const repeatedRuns = [...repeatMap.values()].filter((count) => count >= 3).length;
  let score = 48 + coverage * 34 - fillerCount * 7 - repeatedRuns * 6;

  if (words.length < 4) {
    score -= 14;
    suggestions.push("Use a longer response to build speaking flow.");
  }
  if (fillerCount > 0) {
    suggestions.push("Reduce fillers like 'um' and keep the pace steady.");
  }
  if (repeatedRuns > 0) {
    suggestions.push("Avoid repeating the same word multiple times in a row.");
  }

  return {
    score: clampScore(score),
    suggestions: suggestions.slice(0, 3),
  };
}

function evaluateVocabulary(transcript: string): { score: number; suggestions: string[] } {
  const suggestions: string[] = [];
  const words = extractWords(transcript);
  if (words.length === 0) {
    return {
      score: 0,
      suggestions: ["Add more content words to show vocabulary range."],
    };
  }

  const uniqueRatio = new Set(words).size / words.length;
  let score = 32 + uniqueRatio * 48 + Math.min(words.length, 14) * 1.5;

  if (words.length < 5) {
    score -= 15;
    suggestions.push("Try at least five words for clearer vocabulary evidence.");
  }
  if (uniqueRatio < 0.6) {
    score -= 10;
    suggestions.push("Use more varied words instead of repeating the same ones.");
  }

  return {
    score: clampScore(score),
    suggestions: suggestions.slice(0, 3),
  };
}

function evaluateConfidence(
  transcript: string,
  pronunciation: number,
  fluency: number
): { score: number; suggestions: string[] } {
  const suggestions: string[] = [];
  const words = extractWords(transcript);
  const trimmed = transcript.trim();
  const hesitationCount = (trimmed.match(/(\.\.\.|--)|\b(um|uh|hmm|eh)\b/gi) ?? []).length;

  let score = pronunciation * 0.58 + fluency * 0.42 - hesitationCount * 8;
  if (/[.!?]$/.test(trimmed)) {
    score += 5;
  }
  if (words.length < 4) {
    score -= 12;
    suggestions.push("Speak in a complete sentence to sound more confident.");
  }
  if (hesitationCount > 0) {
    suggestions.push("Pause less and keep your sentence endings decisive.");
  }

  return {
    score: clampScore(score),
    suggestions: suggestions.slice(0, 3),
  };
}

function speak(text: string, rate = 0.9) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.lang = "de-DE";
  window.speechSynthesis.speak(utterance);
}

export default function SpeakingCoach({ set, onProgressUpdate }: SpeakingCoachProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<{
    pronunciation: number;
    grammar: number;
    fluency: number;
    vocabulary: number;
    confidence: number;
    total: number;
    wordCount: number;
    durationSeconds: number;
    suggestions: string[];
  } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [history, setHistory] = useState(() => getSpeakingAttempts(6));

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const attemptStartedAtRef = useRef(0);

  const targetPhrases = useMemo(() => {
    const phrases = set.cards
      .slice(0, 14)
      .map((card) => {
        if (card.term.split(" ").length <= 7) {
          return card.term;
        }
        return card.definition;
      })
      .filter((item) => item.trim().length > 3);

    return phrases.length > 0 ? phrases : ["Ich lerne jeden Tag Deutsch."];
  }, [set.cards]);

  const target = targetPhrases[phraseIndex % targetPhrases.length] ?? "Ich lerne Deutsch.";

  function nextPhrase() {
    setPhraseIndex((value) => (value + 1) % Math.max(targetPhrases.length, 1));
    setTranscript("");
    setFeedback(null);
    attemptStartedAtRef.current = Date.now();
  }

  function startListening() {
    if (typeof window === "undefined") {
      return;
    }

    if (attemptStartedAtRef.current <= 0) {
      attemptStartedAtRef.current = Date.now();
    }

    const speechWindow = window as BrowserSpeechWindow;
    const RecognitionImpl = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!RecognitionImpl) {
      setFeedback({
        pronunciation: 0,
        grammar: 0,
        fluency: 0,
        vocabulary: 0,
        confidence: 0,
        total: 0,
        wordCount: 0,
        durationSeconds: 0,
        suggestions: ["Speech recognition is not supported in this browser."],
      });
      return;
    }

    const recognition = new RecognitionImpl();
    recognition.lang = "de-DE";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: RecognitionEvent) => {
      const phrase = event?.results?.[0]?.[0]?.transcript;
      if (typeof phrase === "string") {
        setTranscript(phrase);
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

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }

  function evaluateAttempt() {
    if (!transcript.trim()) {
      return;
    }

    const now = Date.now();
    if (attemptStartedAtRef.current <= 0) {
      attemptStartedAtRef.current = now;
    }

    const pronunciation = scoreSimilarity(target, transcript);
    const grammar = evaluateGrammar(transcript);
    const fluency = evaluateFluency(target, transcript);
    const vocabulary = evaluateVocabulary(transcript);
    const confidence = evaluateConfidence(transcript, pronunciation, fluency.score);
    const durationSeconds = Math.max(8, Math.round((now - attemptStartedAtRef.current) / 1000));
    const wordCount = extractWords(transcript).length;
    const total = clampScore(
      (pronunciation + grammar.score + fluency.score + vocabulary.score + confidence.score) / 5
    );

    const combinedSuggestions = Array.from(
      new Set([
        ...grammar.suggestions,
        ...fluency.suggestions,
        ...vocabulary.suggestions,
        ...confidence.suggestions,
        ...(wordCount < 6 ? ["Expand your answer with one extra supporting phrase."] : []),
      ...(pronunciation < 70
        ? ["Repeat phrase slowly and focus on stressed syllables."]
        : []),
      ])
    ).slice(0, 6);

    addSpeakingAttempt({
      targetPhrase: target,
      transcript,
      pronunciationScore: pronunciation,
      grammarScore: grammar.score,
      fluencyScore: fluency.score,
      vocabularyScore: vocabulary.score,
      confidenceScore: confidence.score,
      totalScore: total,
      durationSeconds,
      wordCount,
      suggestions: combinedSuggestions,
    });

    trackAnalyticsEvent({
      name: "speaking-attempt",
      value: total,
      metadata: {
        pronunciation,
        grammar: grammar.score,
        fluency: fluency.score,
        vocabulary: vocabulary.score,
        confidence: confidence.score,
        wordCount,
        durationSeconds,
      },
    });

    setFeedback({
      pronunciation,
      grammar: grammar.score,
      fluency: fluency.score,
      vocabulary: vocabulary.score,
      confidence: confidence.score,
      total,
      wordCount,
      durationSeconds,
      suggestions: combinedSuggestions,
    });
    setHistory(getSpeakingAttempts(6));

    recordStudySession({
      seconds: Math.max(30, Math.min(90, durationSeconds)),
      cardsReviewed: 1,
    });
    recordWritingAttempt(total >= 70 && grammar.score >= 65);
    onProgressUpdate?.();
    attemptStartedAtRef.current = now;
  }

  return (
    <section className="space-y-5 rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] backdrop-blur md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-3xl text-slate-900">Speaking Coach</h3>
        <button
          type="button"
          onClick={nextPhrase}
          className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-100"
        >
          Next Prompt
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Target Phrase</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{target}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => speak(target, 0.85)}
            className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
          >
            Play Slow
          </button>
          <button
            type="button"
            onClick={() => speak(target, 1)}
            className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100"
          >
            Play Normal
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Your Transcript</p>
        <textarea
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
          placeholder="Speak with microphone or type your spoken response..."
          className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {!isListening ? (
            <button
              type="button"
              onClick={startListening}
              className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
            >
              Start Mic
            </button>
          ) : (
            <button
              type="button"
              onClick={stopListening}
              className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              Stop Mic
            </button>
          )}

          <button
            type="button"
            onClick={evaluateAttempt}
            disabled={!transcript.trim()}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Evaluate
          </button>
        </div>
      </div>

      {feedback ? (
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <p className="text-sm font-semibold text-slate-800">Pronunciation: {feedback.pronunciation}</p>
            <p className="text-sm font-semibold text-slate-800">Grammar: {feedback.grammar}</p>
            <p className="text-sm font-semibold text-slate-800">Fluency: {feedback.fluency}</p>
            <p className="text-sm font-semibold text-slate-800">Vocabulary: {feedback.vocabulary}</p>
            <p className="text-sm font-semibold text-slate-800">Confidence: {feedback.confidence}</p>
            <p className="text-sm font-semibold text-slate-800">Total: {feedback.total}</p>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Duration {feedback.durationSeconds}s | Words {feedback.wordCount}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {feedback.suggestions.length === 0 ? (
              <li>- Strong attempt. Keep repeating with natural pace.</li>
            ) : (
              feedback.suggestions.map((item, index) => <li key={`${item}-${index}`}>- {item}</li>)
            )}
          </ul>
        </article>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Recent Attempts</p>
        <div className="mt-2 space-y-2">
          {history.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
              No speaking attempts yet.
            </p>
          ) : (
            history.map((item) => (
              <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-800">{item.targetPhrase}</p>
                <p className="mt-1 text-xs text-slate-600">{item.transcript}</p>
                <p className="mt-1 text-xs text-slate-600">
                  P {item.pronunciationScore} | G {item.grammarScore} | F {item.fluencyScore} | V {item.vocabularyScore} | C {item.confidenceScore}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Total {item.totalScore} | {item.wordCount} words | {item.durationSeconds}s
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
