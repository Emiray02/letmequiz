import { emitRealtimeSync } from "@/lib/realtime-sync";

export type SpeakingAttempt = {
  id: string;
  targetPhrase: string;
  transcript: string;
  pronunciationScore: number;
  grammarScore: number;
  fluencyScore: number;
  vocabularyScore: number;
  confidenceScore: number;
  totalScore: number;
  durationSeconds: number;
  wordCount: number;
  suggestions: string[];
  createdAt: string;
};

const SPEAKING_ATTEMPTS_KEY = "letmequiz.speaking.attempts";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countWords(text: string): number {
  const words = text
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.length;
}

function normalizeAttempt(raw: Partial<SpeakingAttempt>): SpeakingAttempt | null {
  if (!raw?.id || !raw?.targetPhrase || !raw?.createdAt) {
    return null;
  }

  const pronunciationScore = clampScore(raw.pronunciationScore ?? 0);
  const grammarScore = clampScore(raw.grammarScore ?? 0);
  const fluencyScore = clampScore(raw.fluencyScore ?? (pronunciationScore + grammarScore) / 2);
  const vocabularyScore = clampScore(raw.vocabularyScore ?? grammarScore);
  const confidenceScore = clampScore(raw.confidenceScore ?? pronunciationScore);
  const totalScore = clampScore(
    raw.totalScore ??
      (pronunciationScore + grammarScore + fluencyScore + vocabularyScore + confidenceScore) / 5
  );

  const wordCount = Math.max(0, Math.round(raw.wordCount ?? countWords(raw.transcript ?? "")));
  const durationSeconds = Math.max(5, Math.min(240, Math.round(raw.durationSeconds ?? Math.max(8, wordCount * 2))));

  return {
    id: raw.id,
    targetPhrase: raw.targetPhrase,
    transcript: raw.transcript ?? "",
    pronunciationScore,
    grammarScore,
    fluencyScore,
    vocabularyScore,
    confidenceScore,
    totalScore,
    wordCount,
    durationSeconds,
    suggestions: Array.isArray(raw.suggestions) ? raw.suggestions.slice(0, 6) : [],
    createdAt: raw.createdAt,
  };
}

function isBrowser() {
  return typeof window !== "undefined";
}

function safeRead<T>(key: string, fallback: T): T {
  if (!isBrowser()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore localStorage write errors.
  }

  emitRealtimeSync("speaking-coach");
}

export function getSpeakingAttempts(limit = 30): SpeakingAttempt[] {
  const items = safeRead<Partial<SpeakingAttempt>[]>(SPEAKING_ATTEMPTS_KEY, []);
  return items
    .map(normalizeAttempt)
    .filter((item): item is SpeakingAttempt => Boolean(item))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function addSpeakingAttempt(input: Omit<SpeakingAttempt, "id" | "createdAt">): SpeakingAttempt {
  const pronunciationScore = clampScore(input.pronunciationScore);
  const grammarScore = clampScore(input.grammarScore);
  const fluencyScore = clampScore(input.fluencyScore);
  const vocabularyScore = clampScore(input.vocabularyScore);
  const confidenceScore = clampScore(input.confidenceScore);
  const totalScore = clampScore(
    input.totalScore ??
      (pronunciationScore + grammarScore + fluencyScore + vocabularyScore + confidenceScore) / 5
  );

  const next: SpeakingAttempt = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
    pronunciationScore,
    grammarScore,
    fluencyScore,
    vocabularyScore,
    confidenceScore,
    totalScore,
    durationSeconds: Math.max(5, Math.min(240, Math.round(input.durationSeconds))),
    wordCount: Math.max(0, Math.round(input.wordCount)),
    suggestions: input.suggestions.slice(0, 6),
  };

  const all = [next, ...getSpeakingAttempts(200)].slice(0, 200);
  safeWrite(SPEAKING_ATTEMPTS_KEY, all);
  return next;
}

export function getSpeakingCoachStats() {
  const recent = getSpeakingAttempts(20);
  if (recent.length === 0) {
    return {
      attempts: 0,
      avgPronunciation: 0,
      avgGrammar: 0,
      avgFluency: 0,
      avgVocabulary: 0,
      avgConfidence: 0,
      latestScore: 0,
    };
  }

  const totalPronunciation = recent.reduce((sum, item) => sum + item.pronunciationScore, 0);
  const totalGrammar = recent.reduce((sum, item) => sum + item.grammarScore, 0);
  const totalFluency = recent.reduce((sum, item) => sum + item.fluencyScore, 0);
  const totalVocabulary = recent.reduce((sum, item) => sum + item.vocabularyScore, 0);
  const totalConfidence = recent.reduce((sum, item) => sum + item.confidenceScore, 0);

  return {
    attempts: recent.length,
    avgPronunciation: Math.round(totalPronunciation / recent.length),
    avgGrammar: Math.round(totalGrammar / recent.length),
    avgFluency: Math.round(totalFluency / recent.length),
    avgVocabulary: Math.round(totalVocabulary / recent.length),
    avgConfidence: Math.round(totalConfidence / recent.length),
    latestScore: recent[0].totalScore,
  };
}
