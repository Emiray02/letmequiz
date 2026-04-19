"use client";

import { useMemo, useState } from "react";
import type { StudySet } from "@/types/study";
import { getRecommendedCefrLevel } from "@/lib/cefr-placement-store";

type CefrLevel = "A1" | "A2" | "B1";

type ClipItem = {
  id: string;
  title: string;
  cefr: CefrLevel;
  topic: string;
  transcript: string;
  keyPhrase: string;
  url: string;
  keywords: string[];
};

type CefrClipLibraryProps = {
  set: StudySet;
};

const CLIPS: ClipItem[] = [
  {
    id: "a1-intro",
    title: "Cafe Self Introduction",
    cefr: "A1",
    topic: "Greeting",
    transcript: "Hallo, ich heisse Anna. Ich komme aus Izmir und lerne seit einem Jahr Deutsch.",
    keyPhrase: "ich heisse anna",
    url: "https://www.youtube.com/results?search_query=easy+german+ich+heisse",
    keywords: ["heisse", "vorstellen", "hobby"],
  },
  {
    id: "a1-direction",
    title: "Asking Directions in Street",
    cefr: "A1",
    topic: "Direction",
    transcript: "Entschuldigung, wie komme ich zum Bahnhof? Gehen Sie geradeaus und dann links.",
    keyPhrase: "wie komme ich zum bahnhof",
    url: "https://www.youtube.com/results?search_query=easy+german+bahnhof+wie+komme+ich",
    keywords: ["bahnhof", "weg", "adresse"],
  },
  {
    id: "a2-appointment",
    title: "Appointment Change Dialogue",
    cefr: "A2",
    topic: "Appointment",
    transcript: "Ich kann morgen nicht kommen. Koennen wir den Termin auf Freitag verschieben?",
    keyPhrase: "koennen wir den termin verschieben",
    url: "https://www.youtube.com/results?search_query=deutsch+termin+verschieben+dialog",
    keywords: ["termin", "uhr", "verschieben"],
  },
  {
    id: "a2-doctor",
    title: "Doctor Visit Expressions",
    cefr: "A2",
    topic: "Health",
    transcript: "Ich habe Kopfschmerzen seit gestern und brauche heute einen Termin beim Arzt.",
    keyPhrase: "ich habe kopfschmerzen",
    url: "https://www.youtube.com/results?search_query=deutsch+arzt+kopfschmerzen+dialog",
    keywords: ["arzt", "kopfschmerzen", "gesundheit"],
  },
  {
    id: "b1-work",
    title: "Workplace Meeting Short Scene",
    cefr: "B1",
    topic: "Work",
    transcript: "Wir sollten den Bericht heute abschliessen, damit das Team morgen puenktlich starten kann.",
    keyPhrase: "damit das team morgen puenktlich starten kann",
    url: "https://www.youtube.com/results?search_query=deutsch+b1+arbeitsplatz+dialog",
    keywords: ["arbeit", "bericht", "team"],
  },
  {
    id: "b1-opinion",
    title: "Giving Opinion in Discussion",
    cefr: "B1",
    topic: "Opinion",
    transcript: "Meiner Meinung nach ist regelmaessige Wiederholung wichtiger als lange aber seltene Lernphasen.",
    keyPhrase: "meiner meinung nach",
    url: "https://www.youtube.com/results?search_query=deutsch+b1+meiner+meinung+nach",
    keywords: ["meiner meinung nach", "lernen", "wiederholung"],
  },
];

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[.,!?;:()\[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createCloze(transcript: string, keyPhrase: string): string {
  const normalized = normalizeText(keyPhrase);
  const regex = new RegExp(keyPhrase, "i");
  if (!normalized || !regex.test(transcript)) {
    return transcript;
  }

  return transcript.replace(regex, "____");
}

function speak(text: string, rate = 0.9) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

export default function CefrClipLibrary({ set }: CefrClipLibraryProps) {
  const [level, setLevel] = useState<CefrLevel | "ALL">(() => getRecommendedCefrLevel());
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(CLIPS[0]?.id ?? "");
  const [clozeAnswer, setClozeAnswer] = useState("");
  const [clozeFeedback, setClozeFeedback] = useState("");

  const setTerms = useMemo(
    () => normalizeText(set.cards.map((card) => `${card.term} ${card.definition}`).join(" ")),
    [set.cards]
  );

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    return CLIPS.filter((clip) => {
      if (level !== "ALL" && clip.cefr !== level) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const blob = normalizeText(`${clip.title} ${clip.topic} ${clip.transcript}`);
      return blob.includes(normalizedQuery);
    });
  }, [level, query]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  function checkCloze() {
    if (!selected) {
      return;
    }

    const correct = normalizeText(clozeAnswer).includes(normalizeText(selected.keyPhrase));
    setClozeFeedback(correct ? "Correct phrase recovery." : `Expected phrase: ${selected.keyPhrase}`);
  }

  return (
    <section className="space-y-5 rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] backdrop-blur md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-3xl text-slate-900">CEFR Clip Library</h3>
        <p className="text-xs text-slate-500">Transcript + Cloze + Shadowing</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[auto_auto_1fr]">
        <select
          value={level}
          onChange={(event) => setLevel(event.target.value as CefrLevel | "ALL")}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="ALL">All Levels</option>
          <option value="A1">A1</option>
          <option value="A2">A2</option>
          <option value="B1">B1</option>
        </select>
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          {filtered.map((clip) => (
            <option key={clip.id} value={clip.id}>
              {clip.cefr} - {clip.title}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search clip topic"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring"
        />
      </div>

      {selected ? (
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-lg font-semibold text-slate-900">{selected.title}</h4>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {selected.cefr}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">Topic: {selected.topic}</p>
            <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {selected.transcript}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => speak(selected.transcript, 0.8)}
                className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
              >
                Shadow Slow
              </button>
              <button
                type="button"
                onClick={() => speak(selected.transcript, 1)}
                className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100"
              >
                Shadow Normal
              </button>
              <a
                href={selected.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
              >
                Open Video Search
              </a>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cloze Drill</p>
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {createCloze(selected.transcript, selected.keyPhrase)}
            </p>
            <input
              value={clozeAnswer}
              onChange={(event) => setClozeAnswer(event.target.value)}
              placeholder="Fill missing phrase"
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-amber-500 focus:ring"
            />
            <button
              type="button"
              onClick={checkCloze}
              className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700"
            >
              Check
            </button>
            {clozeFeedback ? (
              <p className="mt-2 text-xs text-slate-600">{clozeFeedback}</p>
            ) : null}

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p>
                Set relevance: {selected.keywords.some((item) => setTerms.includes(normalizeText(item))) ? "High" : "General"}
              </p>
            </div>
          </article>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
          No clips match the selected filters.
        </p>
      )}
    </section>
  );
}
