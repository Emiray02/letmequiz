"use client";

import { useMemo, useState } from "react";
import type { StudySet } from "@/types/study";
import {
  getInterleavedCardOrder,
  markCardReview,
  recordStudySession,
  recordWritingAttempt,
} from "@/lib/student-store";
import {
  getTechniqueCoverage,
  getTechniqueMapForSet,
  upsertTechniqueProfile,
} from "@/lib/vocabulary-store";
import type { VocabularyTechniqueMap, VocabularyTechniqueProfile } from "@/types/vocabulary";

type VocabularyLabProps = {
  set: StudySet;
  onProgressUpdate?: () => void;
};

type RecallDirection = "term-to-definition" | "definition-to-term";

type SitcomClip = {
  id: string;
  title: string;
  usage: string;
  line: string;
  url: string;
  keywords: string[];
};

const SITCOM_CLIPS: SitcomClip[] = [
  {
    id: "extra-a1-greeting",
    title: "Extra auf Deutsch - Greeting Scene",
    usage: "Self-introduction and daily conversation openers",
    line: "Hallo, ich heisse ...",
    url: "https://www.youtube.com/results?search_query=extra+auf+deutsch+hallo+ich+heisse",
    keywords: ["heisse", "vorstellen", "hobby", "wohne"],
  },
  {
    id: "extra-appointment",
    title: "Extra auf Deutsch - Appointment Dialogue",
    usage: "Asking, accepting, and changing appointments",
    line: "Koennen wir den Termin verschieben?",
    url: "https://www.youtube.com/results?search_query=extra+auf+deutsch+termin+verschieben",
    keywords: ["termin", "uhr", "verschieben", "arbeit"],
  },
  {
    id: "easy-german-direction",
    title: "Easy German - Asking for Directions",
    usage: "Street direction and city interaction patterns",
    line: "Entschuldigung, wie komme ich ...?",
    url: "https://www.youtube.com/results?search_query=easy+german+wie+komme+ich",
    keywords: ["bahnhof", "weg", "adresse", "apotheke"],
  },
  {
    id: "easy-german-doctor",
    title: "Easy German - Doctor and Health Phrases",
    usage: "Health complaints and doctor communication",
    line: "Ich habe Kopfschmerzen.",
    url: "https://www.youtube.com/results?search_query=easy+german+arzt+kopfschmerzen",
    keywords: ["arzt", "kopfschmerzen", "gesundheit"],
  },
];

function emptyProfile(): VocabularyTechniqueProfile {
  return {
    keyword: "",
    mnemonicStory: "",
    memoryPalaceCue: "",
    contextSentence: "",
    sentencePatternOne: "",
    sentencePatternTwo: "",
    sentencePatternThree: "",
    sitcomClipNote: "",
    contrastWord: "",
    morphologyNote: "",
    pronunciationTip: "",
    updatedAt: "",
  };
}

function buildSentencePatternDrafts(word: string): [string, string, string] {
  return [
    `Heute benutze ich ${word}, weil ich es in einem echten Dialog brauche.`,
    `Kannst du mir mit ${word} helfen, bitte?`,
    `Ich lerne ${word}, damit ich im Alltag sicher sprechen kann.`,
  ];
}

function matchesTargetWord(sentence: string, targetWord: string): boolean {
  const normalizedSentence = normalizeText(sentence);
  const normalizedTarget = normalizeText(targetWord);
  if (!normalizedSentence || !normalizedTarget) {
    return false;
  }

  return normalizedSentence.includes(normalizedTarget);
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

  const distance = levenshteinDistance(normalizedInput, normalizedExpected);
  const tolerance = Math.max(1, Math.floor(normalizedExpected.length * 0.2));
  return distance <= tolerance;
}

function createMnemonicDraft(term: string, definition: string): string {
  const anchor = term.slice(0, Math.min(3, term.length)).toUpperCase();
  return `Picture ${anchor} as a striking object that reminds you of "${term}", then attach it to this idea: ${definition}.`;
}

function speak(text: string, rate = 0.95) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createClozeSentence(sentence: string, targetWord: string): string {
  const trimmedSentence = sentence.trim();
  const trimmedTarget = targetWord.trim();
  if (!trimmedSentence || !trimmedTarget) {
    return "";
  }

  const pattern = new RegExp(`\\b${escapeRegex(trimmedTarget)}\\b`, "i");
  if (!pattern.test(trimmedSentence)) {
    return "";
  }

  return trimmedSentence.replace(pattern, "____");
}

function sentenceUsesWord(sentence: string, targetWord: string): boolean {
  const normalizedSentence = normalizeText(sentence);
  const normalizedWord = normalizeText(targetWord);
  if (!normalizedSentence || !normalizedWord) {
    return false;
  }

  return normalizedSentence.includes(normalizedWord);
}

export default function VocabularyLab({ set, onProgressUpdate }: VocabularyLabProps) {
  const [order, setOrder] = useState<string[]>(() =>
    getInterleavedCardOrder(
      set.id,
      set.cards.map((card) => card.id)
    )
  );
  const [cursor, setCursor] = useState(0);
  const [direction, setDirection] = useState<RecallDirection>("term-to-definition");
  const [recallInput, setRecallInput] = useState("");
  const [recallFeedback, setRecallFeedback] = useState<null | { correct: boolean; expected: string }>(
    null
  );
  const [clozeInput, setClozeInput] = useState("");
  const [clozeFeedback, setClozeFeedback] = useState<null | { correct: boolean; message: string }>(
    null
  );
  const [contextFeedback, setContextFeedback] = useState("");
  const [patternFeedback, setPatternFeedback] = useState<{
    one: string;
    two: string;
    three: string;
  }>({
    one: "",
    two: "",
    three: "",
  });
  const [skillScore, setSkillScore] = useState({ attempts: 0, correct: 0 });
  const [techniques, setTechniques] = useState<VocabularyTechniqueMap>(() =>
    getTechniqueMapForSet(set.id)
  );

  const cardMap = useMemo(() => {
    return new Map(set.cards.map((card) => [card.id, card]));
  }, [set.cards]);

  const currentCardId = order[cursor];
  const currentCard = currentCardId ? cardMap.get(currentCardId) ?? null : null;

  const coverage = useMemo(() => {
    void techniques;
    return getTechniqueCoverage(
      set.id,
      set.cards.map((card) => card.id)
    );
  }, [set.id, set.cards, techniques]);

  const currentProfile = currentCard ? techniques[currentCard.id] ?? emptyProfile() : emptyProfile();
  const recallPrompt = currentCard
    ? direction === "term-to-definition"
      ? currentCard.term
      : currentCard.definition
    : "";
  const recallExpected = currentCard
    ? direction === "term-to-definition"
      ? currentCard.definition
      : currentCard.term
    : "";
  const clozeText = currentCard
    ? createClozeSentence(currentProfile.contextSentence, currentCard.term)
    : "";
  const clipSuggestions = currentCard
    ? SITCOM_CLIPS.filter((clip) => {
        const termText = normalizeText(`${currentCard.term} ${currentCard.definition}`);
        return clip.keywords.some((keyword) => termText.includes(normalizeText(keyword)));
      }).slice(0, 3)
    : [];

  function updateTechniqueField(field: keyof VocabularyTechniqueProfile, value: string) {
    if (!currentCard) {
      return;
    }

    setTechniques((previous) => {
      const current = previous[currentCard.id] ?? emptyProfile();
      const nextProfile: VocabularyTechniqueProfile = {
        ...current,
        [field]: value,
        updatedAt: new Date().toISOString(),
      };

      const nextMap = {
        ...previous,
        [currentCard.id]: nextProfile,
      };

      upsertTechniqueProfile(set.id, currentCard.id, {
        [field]: value,
      });

      return nextMap;
    });
  }

  function goNextCard() {
    setRecallInput("");
    setRecallFeedback(null);
    setClozeInput("");
    setClozeFeedback(null);
    setContextFeedback("");
    setPatternFeedback({
      one: "",
      two: "",
      three: "",
    });

    if (cursor >= order.length - 1) {
      setOrder(
        getInterleavedCardOrder(
          set.id,
          set.cards.map((card) => card.id)
        )
      );
      setCursor(0);
      return;
    }

    setCursor((value) => value + 1);
  }

  function submitRecall() {
    if (!currentCard || !recallInput.trim()) {
      return;
    }

    const correct = checkAnswer(recallInput, recallExpected);
    const hasStrongEncoding =
      currentProfile.keyword.trim().length > 0 &&
      currentProfile.mnemonicStory.trim().length > 0 &&
      currentProfile.contextSentence.trim().length > 0;

    const reviewGrade = correct ? (hasStrongEncoding ? "easy" : "good") : "hard";
    markCardReview(set.id, currentCard.id, reviewGrade);
    recordWritingAttempt(correct);
    recordStudySession({
      seconds: 35,
      cardsReviewed: 1,
    });

    setSkillScore((previous) => ({
      attempts: previous.attempts + 1,
      correct: previous.correct + (correct ? 1 : 0),
    }));

    setRecallFeedback({
      correct,
      expected: recallExpected,
    });
    onProgressUpdate?.();
  }

  function validateContextSentence() {
    if (!currentCard) {
      return;
    }

    const sentence = currentProfile.contextSentence;
    if (sentence.trim().length < 12) {
      setContextFeedback("Context sentence should be at least 12 characters.");
      return;
    }

    if (!sentenceUsesWord(sentence, currentCard.term)) {
      setContextFeedback("Sentence should include the target word for transfer learning.");
      return;
    }

    markCardReview(set.id, currentCard.id, "good");
    recordStudySession({
      seconds: 20,
      cardsReviewed: 1,
    });
    setContextFeedback("Great. Context transfer saved and counted in memory training.");
    onProgressUpdate?.();
  }

  function applyMnemonicDraft() {
    if (!currentCard) {
      return;
    }

    if (currentProfile.mnemonicStory.trim().length > 0) {
      return;
    }

    updateTechniqueField(
      "mnemonicStory",
      createMnemonicDraft(currentCard.term, currentCard.definition)
    );
  }

  function submitCloze() {
    if (!currentCard || !clozeText) {
      return;
    }

    const correct = checkAnswer(clozeInput, currentCard.term);
    markCardReview(set.id, currentCard.id, correct ? "easy" : "hard");
    recordStudySession({
      seconds: 20,
      cardsReviewed: 1,
    });
    setClozeFeedback({
      correct,
      message: correct ? "Perfect cloze recall." : `Expected: ${currentCard.term}`,
    });
    onProgressUpdate?.();
  }

  function applyPatternDrafts() {
    if (!currentCard) {
      return;
    }

    const [one, two, three] = buildSentencePatternDrafts(currentCard.term);
    if (!currentProfile.sentencePatternOne.trim()) {
      updateTechniqueField("sentencePatternOne", one);
    }
    if (!currentProfile.sentencePatternTwo.trim()) {
      updateTechniqueField("sentencePatternTwo", two);
    }
    if (!currentProfile.sentencePatternThree.trim()) {
      updateTechniqueField("sentencePatternThree", three);
    }
  }

  function validatePatternField(field: "one" | "two" | "three") {
    if (!currentCard) {
      return;
    }

    const value =
      field === "one"
        ? currentProfile.sentencePatternOne
        : field === "two"
          ? currentProfile.sentencePatternTwo
          : currentProfile.sentencePatternThree;

    if (value.trim().length < 12) {
      setPatternFeedback((prev) => ({
        ...prev,
        [field]: "Cumle en az 12 karakter olmali.",
      }));
      return;
    }

    if (!matchesTargetWord(value, currentCard.term)) {
      setPatternFeedback((prev) => ({
        ...prev,
        [field]: "Cumle hedef kelimeyi icermeli.",
      }));
      return;
    }

    markCardReview(set.id, currentCard.id, "good");
    recordStudySession({
      seconds: 18,
      cardsReviewed: 1,
    });
    setPatternFeedback((prev) => ({
      ...prev,
      [field]: "Pattern dogru. Gercek kullanim transferi basarili.",
    }));
    onProgressUpdate?.();
  }

  if (!currentCard) {
    return (
      <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Add cards to enable vocabulary lab.
      </section>
    );
  }

  const accuracy =
    skillScore.attempts === 0
      ? 0
      : Math.round((skillScore.correct / Math.max(skillScore.attempts, 1)) * 100);

  return (
    <section className="space-y-5 rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] backdrop-blur md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Vocabulary Lab {cursor + 1} / {order.length}
        </p>
        <div className="text-right text-sm text-slate-700">
          <p>Recall accuracy: %{accuracy}</p>
          <p>Strong cards: {coverage.strongCards}</p>
        </div>
      </div>

      <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-xs uppercase tracking-wide text-slate-600 sm:grid-cols-4">
        <p>Keyword {coverage.keywordCoverage}%</p>
        <p>Mnemonic {coverage.mnemonicCoverage}%</p>
        <p>Context {coverage.contextCoverage}%</p>
        <p>Palace {coverage.memoryPalaceCoverage}%</p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
        <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Method 1</p>
          <h3 className="mt-1 text-sm font-semibold text-emerald-900">Spaced repetition plus interleaving</h3>
          <p className="mt-1 text-xs text-emerald-800">Difficult and due cards are prioritized first.</p>
        </article>
        <article className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Method 2</p>
          <h3 className="mt-1 text-sm font-semibold text-cyan-900">Keyword mnemonic encoding</h3>
          <p className="mt-1 text-xs text-cyan-800">Attach each term to a vivid keyword and short story.</p>
        </article>
        <article className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Method 3</p>
          <h3 className="mt-1 text-sm font-semibold text-amber-900">Context transfer plus cloze</h3>
          <p className="mt-1 text-xs text-amber-800">Use words in sentence context, then recall via blanks.</p>
        </article>
        <article className="rounded-xl border border-violet-200 bg-violet-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Method 4</p>
          <h3 className="mt-1 text-sm font-semibold text-violet-900">Bidirectional active recall</h3>
          <p className="mt-1 text-xs text-violet-800">Alternate definition to term and term to definition retrieval.</p>
        </article>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Target card</p>
        <h2 className="mt-1 font-display text-3xl text-slate-900">{currentCard.term}</h2>
        <p className="mt-1 text-sm text-slate-600">{currentCard.definition}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => speak(currentCard.term, 0.9)}
            className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
          >
            Speak Term
          </button>
          <button
            type="button"
            onClick={() => speak(currentCard.definition, 0.8)}
            className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100"
          >
            Speak Meaning
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Keyword</label>
          <input
            value={currentProfile.keyword}
            onChange={(event) => updateTechniqueField("keyword", event.target.value)}
            placeholder="Short anchor keyword"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Memory Palace Cue</label>
          <input
            value={currentProfile.memoryPalaceCue}
            onChange={(event) => updateTechniqueField("memoryPalaceCue", event.target.value)}
            placeholder="Where in your palace this word lives"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mnemonic Story</label>
          <textarea
            value={currentProfile.mnemonicStory}
            onChange={(event) => updateTechniqueField("mnemonicStory", event.target.value)}
            placeholder="Create a vivid and absurd story to remember the word"
            className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring"
          />
          <button
            type="button"
            onClick={applyMnemonicDraft}
            className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
          >
            Auto Mnemonic Draft
          </button>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contrast Word</label>
          <input
            value={currentProfile.contrastWord}
            onChange={(event) => updateTechniqueField("contrastWord", event.target.value)}
            placeholder="Confusable word"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Morphology Note</label>
          <input
            value={currentProfile.morphologyNote}
            onChange={(event) => updateTechniqueField("morphologyNote", event.target.value)}
            placeholder="Root / prefix / suffix notes"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pronunciation Tip</label>
          <input
            value={currentProfile.pronunciationTip}
            onChange={(event) => updateTechniqueField("pronunciationTip", event.target.value)}
            placeholder="Stress, syllable split, or difficult sound note"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sitcom Clip Note</label>
          <input
            value={currentProfile.sitcomClipNote}
            onChange={(event) => updateTechniqueField("sitcomClipNote", event.target.value)}
            placeholder="Bu kelimeyi hangi sahnede duydun, kisa not"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring"
          />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">Sentence Pattern Drill</p>
          <button
            type="button"
            onClick={applyPatternDrafts}
            className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
          >
            Auto Pattern Draft
          </button>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pattern 1</label>
          <input
            value={currentProfile.sentencePatternOne}
            onChange={(event) => updateTechniqueField("sentencePatternOne", event.target.value)}
            placeholder="Hedef kelimeyle bir gercek hayat cumlesi yaz"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => validatePatternField("one")}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Validate
            </button>
            {patternFeedback.one ? <p className="text-xs text-slate-600">{patternFeedback.one}</p> : null}
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pattern 2</label>
          <input
            value={currentProfile.sentencePatternTwo}
            onChange={(event) => updateTechniqueField("sentencePatternTwo", event.target.value)}
            placeholder="Soru kalibi veya rica kalibi ile kullan"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => validatePatternField("two")}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Validate
            </button>
            {patternFeedback.two ? <p className="text-xs text-slate-600">{patternFeedback.two}</p> : null}
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pattern 3</label>
          <input
            value={currentProfile.sentencePatternThree}
            onChange={(event) => updateTechniqueField("sentencePatternThree", event.target.value)}
            placeholder="Baglacli bir cumleyle daha ileri kullanim"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => validatePatternField("three")}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Validate
            </button>
            {patternFeedback.three ? <p className="text-xs text-slate-600">{patternFeedback.three}</p> : null}
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-800">Sitcom and Real Usage Clips</p>
        <p className="text-xs text-slate-600">
          Kelimeyi sadece ezberleme; sahnede nasil kullanildigini izleyip kalibi tekrar et.
        </p>
        <div className="space-y-2">
          {(clipSuggestions.length > 0 ? clipSuggestions : SITCOM_CLIPS.slice(0, 2)).map((clip) => (
            <article key={clip.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">{clip.title}</p>
              <p className="mt-1 text-xs text-slate-600">{clip.usage}</p>
              <p className="mt-1 rounded-md bg-white px-2 py-1 text-xs text-slate-700">{clip.line}</p>
              <a
                href={clip.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
              >
                Clip Ac
              </a>
            </article>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">Active Recall Drill</p>
          <button
            type="button"
            onClick={() =>
              setDirection((value) =>
                value === "term-to-definition" ? "definition-to-term" : "term-to-definition"
              )
            }
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Switch Direction
          </button>
        </div>
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{recallPrompt}</p>
        <textarea
          value={recallInput}
          onChange={(event) => setRecallInput(event.target.value)}
          placeholder={
            direction === "term-to-definition" ? "Type the meaning" : "Type the target word"
          }
          className="min-h-16 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={submitRecall}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Check Recall
          </button>
          <button
            type="button"
            onClick={goNextCard}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Next Interleaved Card
          </button>
        </div>

        {recallFeedback ? (
          <div
            className={`rounded-xl border px-3 py-2 text-sm ${
              recallFeedback.correct
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            <p className="font-semibold">
              {recallFeedback.correct ? "Correct retrieval" : "Keep training this one"}
            </p>
            {!recallFeedback.correct ? <p>Expected: {recallFeedback.expected}</p> : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-800">Context Transfer and Cloze</p>
        <textarea
          value={currentProfile.contextSentence}
          onChange={(event) => updateTechniqueField("contextSentence", event.target.value)}
          placeholder={`Write a sentence that uses "${currentCard.term}" in realistic context`}
          className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring"
        />
        <button
          type="button"
          onClick={validateContextSentence}
          className="rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
        >
          Validate Sentence Usage
        </button>

        {contextFeedback ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {contextFeedback}
          </p>
        ) : null}

        {clozeText ? (
          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Cloze Drill</p>
            <p className="text-sm text-amber-900">{clozeText}</p>
            <input
              value={clozeInput}
              onChange={(event) => setClozeInput(event.target.value)}
              placeholder="Fill the blank"
              className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none ring-amber-400 focus:ring"
            />
            <button
              type="button"
              onClick={submitCloze}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
            >
              Check Cloze
            </button>

            {clozeFeedback ? (
              <p
                className={`rounded-lg border px-2 py-1.5 text-xs ${
                  clozeFeedback.correct
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {clozeFeedback.message}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
