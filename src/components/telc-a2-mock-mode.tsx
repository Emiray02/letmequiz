"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addTelcMockResult,
  getTelcMockResults,
  getTelcResultTrend,
  type TelcSectionScores,
  type TelcSectionTimingMinutes,
} from "@/lib/telc-a2-store";

type MultipleChoiceQuestion = {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  answerIndex: number;
};

type ListeningQuestion = MultipleChoiceQuestion & {
  transcript: string;
};

type ExamSection = "lesen" | "hoeren" | "schreiben" | "sprechen" | "result";

type SpeedMode = "quick" | "full";

type TelcA2MockModeProps = {
  onResultSaved?: (result: TelcSectionScores) => void;
};

const LESEN_BANK: MultipleChoiceQuestion[] = [
  {
    id: "lesen-1",
    prompt: "Sie moechten einen Arzttermin absagen. Was passt am besten?",
    options: [
      "Ich komme heute leider nicht zum Termin.",
      "Ich esse heute einen Termin.",
      "Der Termin ist sehr lecker.",
      "Ich fahre den Termin nach Hause.",
    ],
    answerIndex: 0,
  },
  {
    id: "lesen-2",
    prompt: "Ein Schild sagt: Nur mit Termin. Was bedeutet das?",
    options: [
      "Man braucht vorher eine Anmeldung.",
      "Man muss bar bezahlen.",
      "Der Laden ist immer zu.",
      "Kinder duerfen nicht rein.",
    ],
    answerIndex: 0,
  },
  {
    id: "lesen-3",
    prompt: "Welche Antwort passt zu: Wann faehrt der naechste Zug?",
    options: ["In zehn Minuten.", "Sehr teuer.", "Im Supermarkt.", "Mit meiner Schwester."],
    answerIndex: 0,
  },
  {
    id: "lesen-4",
    prompt: "Sie lesen: Heute geschlossen wegen Krankheit. Was ist richtig?",
    options: ["Das Geschaeft ist heute nicht offen.", "Heute gibt es Rabatt.", "Heute ist laenger geoeffnet.", "Nur heute ist alles kostenlos."],
    answerIndex: 0,
  },
  {
    id: "lesen-5",
    prompt: "Welche E-Mail passt besser zu A2 Schreiben?",
    options: ["Kurzer, klarer Text mit Datum und Bitte.", "Ein wissenschaftlicher Aufsatz ueber Politik.", "Nur Emojis ohne Text.", "Ein Roman mit 10 Seiten."],
    answerIndex: 0,
  },
  {
    id: "lesen-6",
    prompt: "Was bedeutet: Ich interessiere mich fuer Deutschkurse?",
    options: ["Ich habe Interesse an Deutschkursen.", "Ich hasse Deutschkurse.", "Ich verkaufe Deutschkurse.", "Ich repariere Deutschkurse."],
    answerIndex: 0,
  },
];

const HOEREN_BANK: ListeningQuestion[] = [
  {
    id: "hoeren-1",
    transcript: "Guten Tag. Ihr Termin ist am Donnerstag um neun Uhr. Bitte kommen Sie zehn Minuten frueher.",
    prompt: "Wann ist der Termin?",
    options: ["Am Donnerstag um 9 Uhr.", "Am Freitag um 19 Uhr.", "Am Donnerstag um 12 Uhr.", "Am Montag um 9 Uhr."],
    answerIndex: 0,
  },
  {
    id: "hoeren-2",
    transcript: "Entschuldigung, wie komme ich zum Bahnhof? Gehen Sie geradeaus und dann links an der Apotheke.",
    prompt: "Was soll die Person machen?",
    options: ["Geradeaus gehen und dann links.", "Sofort rechts und dann zurueck.", "Mit dem Taxi fahren.", "Zu Hause bleiben."],
    answerIndex: 0,
  },
  {
    id: "hoeren-3",
    transcript: "Heute bleibt unsere Praxis geschlossen. In Notfaellen rufen Sie bitte diese Nummer an.",
    prompt: "Was ist heute richtig?",
    options: ["Die Praxis ist geschlossen.", "Die Praxis ist offen bis Mitternacht.", "Es gibt heute keine Telefonnummer.", "Nur Kinder duerfen hinein."],
    answerIndex: 0,
  },
  {
    id: "hoeren-4",
    transcript: "Ich kann morgen nicht kommen. Koennen wir den Termin auf naechste Woche verschieben?",
    prompt: "Was moechte die Person?",
    options: ["Den Termin verschieben.", "Den Termin verlaengern.", "Den Termin bezahlen.", "Den Termin drucken."],
    answerIndex: 0,
  },
];

const SCHREIBEN_PROMPTS = [
  "Schreiben Sie eine kurze E-Mail (60-80 Woerter): Sie koennen morgen nicht zum Sprachkurs kommen.",
  "Schreiben Sie eine E-Mail an eine Freundin: Laden Sie sie am Wochenende zu einem Treffen ein.",
  "Antworten Sie auf eine Anzeige: Fragen Sie nach Preis, Termin und Ort.",
];

const SPRECHEN_PROMPTS = [
  "Stellen Sie sich in 30-45 Sekunden vor: Name, Herkunft, Beruf, Hobbys.",
  "Vereinbaren Sie einen Termin mit einer Partnerperson (Datum, Uhrzeit, Ort).",
  "Planen Sie ein Wochenende: Aktivitaeten, Uhrzeit, Treffpunkt.",
];

const OFFICIAL_TIMING_MINUTES: TelcSectionTimingMinutes = {
  lesen: 30,
  hoeren: 20,
  schreiben: 30,
  sprechen: 15,
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
  }
  return copy;
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.lang = "de-DE";
  window.speechSynthesis.speak(utterance);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function TelcA2MockMode({ onResultSaved }: TelcA2MockModeProps) {
  const [started, setStarted] = useState(false);
  const [section, setSection] = useState<ExamSection>("lesen");
  const [speedMode, setSpeedMode] = useState<SpeedMode>("quick");
  const [sectionStartedAtMs, setSectionStartedAtMs] = useState(0);
  const [timeLeftSec, setTimeLeftSec] = useState(0);
  const [usedMinutes, setUsedMinutes] = useState<TelcSectionTimingMinutes>({
    lesen: 0,
    hoeren: 0,
    schreiben: 0,
    sprechen: 0,
  });

  const [lesenQuestions, setLesenQuestions] = useState<MultipleChoiceQuestion[]>([]);
  const [hoerenQuestions, setHoerenQuestions] = useState<ListeningQuestion[]>([]);

  const [lesenIndex, setLesenIndex] = useState(0);
  const [hoerenIndex, setHoerenIndex] = useState(0);
  const [lesenCorrect, setLesenCorrect] = useState(0);
  const [hoerenCorrect, setHoerenCorrect] = useState(0);

  const [schreibenPrompt, setSchreibenPrompt] = useState("");
  const [sprechenPrompt, setSprechenPrompt] = useState("");
  const [schreibenText, setSchreibenText] = useState("");
  const [schreibenScore, setSchreibenScore] = useState(60);
  const [sprechenScore, setSprechenScore] = useState(60);

  const [finalScore, setFinalScore] = useState<TelcSectionScores | null>(null);
  const [latest, setLatest] = useState<TelcSectionScores | null>(() => getTelcMockResults(1)[0] ?? null);
  const [trendVersion, setTrendVersion] = useState(0);

  const trend = useMemo(() => {
    void trendVersion;
    return getTelcResultTrend(8);
  }, [trendVersion]);

  const maxTrendOverall = useMemo(() => Math.max(1, ...trend.map((item) => item.overall)), [trend]);

  function scaleForMode(mode: SpeedMode): number {
    return mode === "quick" ? 0.12 : 1;
  }

  function getSectionSeconds(targetSection: Exclude<ExamSection, "result">, mode: SpeedMode): number {
    const minutes = OFFICIAL_TIMING_MINUTES[targetSection];
    return Math.max(30, Math.round(minutes * 60 * scaleForMode(mode)));
  }

  function commitUsedTime(currentSection: Exclude<ExamSection, "result">) {
    if (sectionStartedAtMs <= 0) {
      return;
    }

    const elapsedMinutes = Math.max(0, (Date.now() - sectionStartedAtMs) / 60_000);
    setUsedMinutes((previous) => ({
      ...previous,
      [currentSection]: Math.round((previous[currentSection] + elapsedMinutes) * 10) / 10,
    }));
  }

  function moveToSection(nextSection: Exclude<ExamSection, "result">) {
    if (section !== "result") {
      commitUsedTime(section as Exclude<ExamSection, "result">);
    }
    setSection(nextSection);
    setSectionStartedAtMs(Date.now());
    setTimeLeftSec(getSectionSeconds(nextSection, speedMode));
  }

  function handleSectionTimeout() {
    if (!started || section === "result") {
      return;
    }

    if (section === "lesen") {
      moveToSection("hoeren");
      return;
    }
    if (section === "hoeren") {
      moveToSection("schreiben");
      return;
    }
    if (section === "schreiben") {
      moveToSection("sprechen");
      return;
    }

    completeSpeaking();
  }

  useEffect(() => {
    if (!started || section === "result") {
      return;
    }

    const handle = window.setInterval(() => {
      setTimeLeftSec((value) => Math.max(0, value - 1));
    }, 1000);

    return () => {
      window.clearInterval(handle);
    };
  }, [started, section]);

  useEffect(() => {
    if (!started || section === "result") {
      return;
    }

    if (timeLeftSec <= 0) {
      const timeoutHandle = window.setTimeout(() => {
        handleSectionTimeout();
      }, 0);

      return () => {
        window.clearTimeout(timeoutHandle);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftSec, section, started]);

  const sectionLabel =
    section === "lesen"
      ? "Lesen"
      : section === "hoeren"
        ? "Hoeren"
        : section === "schreiben"
          ? "Schreiben"
          : section === "sprechen"
            ? "Sprechen"
            : "Result";

  const timeText = `${Math.floor(timeLeftSec / 60)
    .toString()
    .padStart(2, "0")}:${(timeLeftSec % 60).toString().padStart(2, "0")}`;

  function startMock() {
    setStarted(true);
    setSection("lesen");
    setSectionStartedAtMs(Date.now());
    setTimeLeftSec(getSectionSeconds("lesen", speedMode));
    setUsedMinutes({
      lesen: 0,
      hoeren: 0,
      schreiben: 0,
      sprechen: 0,
    });

    setLesenQuestions(shuffle(LESEN_BANK).slice(0, 5));
    setHoerenQuestions(shuffle(HOEREN_BANK).slice(0, 3));

    setLesenIndex(0);
    setHoerenIndex(0);
    setLesenCorrect(0);
    setHoerenCorrect(0);

    setSchreibenPrompt(shuffle(SCHREIBEN_PROMPTS)[0]);
    setSprechenPrompt(shuffle(SPRECHEN_PROMPTS)[0]);
    setSchreibenText("");
    setSchreibenScore(60);
    setSprechenScore(60);
    setFinalScore(null);
  }

  function answerLesen(optionIndex: number) {
    const current = lesenQuestions[lesenIndex];
    if (!current) {
      return;
    }

    if (optionIndex === current.answerIndex) {
      setLesenCorrect((value) => value + 1);
    }

    if (lesenIndex >= lesenQuestions.length - 1) {
      moveToSection("hoeren");
      return;
    }

    setLesenIndex((value) => value + 1);
  }

  function answerHoeren(optionIndex: number) {
    const current = hoerenQuestions[hoerenIndex];
    if (!current) {
      return;
    }

    if (optionIndex === current.answerIndex) {
      setHoerenCorrect((value) => value + 1);
    }

    if (hoerenIndex >= hoerenQuestions.length - 1) {
      moveToSection("schreiben");
      return;
    }

    setHoerenIndex((value) => value + 1);
  }

  function completeWriting() {
    moveToSection("sprechen");
  }

  function completeSpeaking() {
    const extraSpeakingMinutes =
      section === "sprechen" && sectionStartedAtMs > 0
        ? Math.max(0, (Date.now() - sectionStartedAtMs) / 60_000)
        : 0;

    const timingUsed: TelcSectionTimingMinutes = {
      lesen: usedMinutes.lesen,
      hoeren: usedMinutes.hoeren,
      schreiben: usedMinutes.schreiben,
      sprechen: Math.round((usedMinutes.sprechen + extraSpeakingMinutes) * 10) / 10,
    };
    setUsedMinutes(timingUsed);

    const timingCompliance = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 -
            (["lesen", "hoeren", "schreiben", "sprechen"] as const).reduce((sum, part) => {
              const target = OFFICIAL_TIMING_MINUTES[part];
              const used = timingUsed[part] || 0;
              const deviationRatio = Math.abs(used - target) / Math.max(target, 1);
              return sum + deviationRatio * 25;
            }, 0)
        )
      )
    );

    const lesen = clamp(Math.round((lesenCorrect / Math.max(lesenQuestions.length, 1)) * 100), 0, 100);
    const hoeren = clamp(Math.round((hoerenCorrect / Math.max(hoerenQuestions.length, 1)) * 100), 0, 100);
    const schreiben = clamp(schreibenScore, 0, 100);
    const sprechen = clamp(sprechenScore, 0, 100);

    const overall = Math.round(lesen * 0.35 + hoeren * 0.35 + schreiben * 0.15 + sprechen * 0.15);
    const result: TelcSectionScores = {
      lesen,
      hoeren,
      schreiben,
      sprechen,
      overall,
      mode: speedMode,
      timingTargetMinutes: OFFICIAL_TIMING_MINUTES,
      timingUsedMinutes: timingUsed,
      timingCompliance,
      createdAt: new Date().toISOString(),
    };

    addTelcMockResult(result);
    onResultSaved?.(result);
    setFinalScore(result);
    setLatest(result);
    setSection("result");
    setTrendVersion((value) => value + 1);
  }

  return (
    <section className="mt-5 rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Special Mode</p>
          <h3 className="text-xl font-semibold text-slate-900">TELC A2 Full Exam Simulator</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={speedMode}
            onChange={(event) => setSpeedMode(event.target.value as SpeedMode)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
          >
            <option value="quick">Quick Demo Timing</option>
            <option value="full">Official Timing</option>
          </select>
          <button
            type="button"
            onClick={startMock}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            {started ? "Yeni Deneme Baslat" : "Deneme Baslat"}
          </button>
        </div>
      </div>

      {!started ? (
        <p className="mt-3 text-sm text-slate-600">Sistem resmi bolum sirasi, timer ve section puanlamasiyla deneme olusturur.</p>
      ) : null}

      {started && section !== "result" ? (
        <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Section {sectionLabel}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Timer {timeText}</p>
          <p className="text-xs text-slate-500">Mode {speedMode}</p>
        </div>
      ) : null}

      {started && section === "lesen" ? (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lesen {lesenIndex + 1}/{Math.max(lesenQuestions.length, 1)}</p>
          <p className="text-sm font-semibold text-slate-900">{lesenQuestions[lesenIndex]?.prompt}</p>
          <div className="space-y-2">
            {lesenQuestions[lesenIndex]?.options.map((option, index) => (
              <button
                key={`${lesenQuestions[lesenIndex]?.id}-option-${index}`}
                type="button"
                onClick={() => answerLesen(index)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {started && section === "hoeren" ? (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hoeren {hoerenIndex + 1}/{Math.max(hoerenQuestions.length, 1)}</p>
          <p className="text-sm font-semibold text-slate-900">{hoerenQuestions[hoerenIndex]?.prompt}</p>
          <button
            type="button"
            onClick={() => speak(hoerenQuestions[hoerenIndex]?.transcript ?? "")}
            className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-700 transition hover:bg-cyan-100"
          >
            Dinleme Metnini Oynat
          </button>
          <div className="space-y-2">
            {hoerenQuestions[hoerenIndex]?.options.map((option, index) => (
              <button
                key={`${hoerenQuestions[hoerenIndex]?.id}-option-${index}`}
                type="button"
                onClick={() => answerHoeren(index)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {started && section === "schreiben" ? (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Schreiben</p>
          <p className="text-sm font-semibold text-slate-900">{schreibenPrompt}</p>
          <textarea
            value={schreibenText}
            onChange={(event) => setSchreibenText(event.target.value)}
            placeholder="Yanitini buraya yaz..."
            className="min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-teal-500 focus:ring"
          />
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Oz-degerlendirme
            <input
              type="range"
              min={30}
              max={100}
              step={5}
              value={schreibenScore}
              onChange={(event) => setSchreibenScore(Number(event.target.value))}
              className="accent-slate-900"
            />
            <span>{schreibenScore}</span>
          </label>
          <button
            type="button"
            onClick={completeWriting}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Schreiben Bolumunu Bitir
          </button>
        </div>
      ) : null}

      {started && section === "sprechen" ? (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sprechen</p>
          <p className="text-sm font-semibold text-slate-900">{sprechenPrompt}</p>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Oz-degerlendirme
            <input
              type="range"
              min={30}
              max={100}
              step={5}
              value={sprechenScore}
              onChange={(event) => setSprechenScore(Number(event.target.value))}
              className="accent-slate-900"
            />
            <span>{sprechenScore}</span>
          </label>
          <button
            type="button"
            onClick={completeSpeaking}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Denemeyi Bitir ve Kaydet
          </button>
        </div>
      ) : null}

      {started && section === "result" && finalScore ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 sm:grid-cols-5">
            <p>Lesen: {finalScore.lesen}</p>
            <p>Hoeren: {finalScore.hoeren}</p>
            <p>Schreiben: {finalScore.schreiben}</p>
            <p>Sprechen: {finalScore.sprechen}</p>
            <p className="font-semibold">Overall: {finalScore.overall}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-800">Timing Compliance: {finalScore.timingCompliance ?? 0}</p>
            <p className="mt-1">
              Target: L {finalScore.timingTargetMinutes?.lesen ?? OFFICIAL_TIMING_MINUTES.lesen} / H {finalScore.timingTargetMinutes?.hoeren ?? OFFICIAL_TIMING_MINUTES.hoeren} / S {finalScore.timingTargetMinutes?.schreiben ?? OFFICIAL_TIMING_MINUTES.schreiben} / Sp {finalScore.timingTargetMinutes?.sprechen ?? OFFICIAL_TIMING_MINUTES.sprechen} min
            </p>
            <p className="mt-1">
              Used: L {finalScore.timingUsedMinutes?.lesen ?? 0} / H {finalScore.timingUsedMinutes?.hoeren ?? 0} / S {finalScore.timingUsedMinutes?.schreiben ?? 0} / Sp {finalScore.timingUsedMinutes?.sprechen ?? 0} min
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mock Trend</p>
            <div className="mt-2 grid grid-cols-8 gap-1">
              {trend.map((item) => {
                const height = Math.max(8, Math.round((item.overall / Math.max(maxTrendOverall, 1)) * 80));
                return (
                  <div key={item.createdAt} className="text-center">
                    <div className="mx-auto flex h-20 items-end rounded-md bg-white px-[2px]">
                      <div className="w-full rounded-sm bg-slate-900" style={{ height: `${height}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">{item.overall}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {latest ? (
        <p className="mt-3 text-xs text-slate-500">Son deneme sonucu: {latest.overall} puan ({new Date(latest.createdAt).toLocaleDateString("tr-TR")})</p>
      ) : null}
    </section>
  );
}
