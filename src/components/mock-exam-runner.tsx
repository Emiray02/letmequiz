"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  EXAM_FORMATS,
  addExamResult,
  getExamSettings,
  type ExamProvider,
  type ExamLevel,
  type ExamSettings,
  type Skill,
} from "@/lib/exam-plan-store";

type MCQ = { id: string; prompt: string; options: string[]; answer: number; explanation: string };

const QUESTIONS: Record<Skill, MCQ[]> = {
  lesen: [
    {
      id: "l1",
      prompt: "Schild: 'Nur mit Termin'. Was bedeutet das?",
      options: ["Anmeldung erforderlich", "Kostenlos", "Geschlossen", "Nur Kinder"],
      answer: 0,
      explanation: "'Nur mit Termin' = randevu olmadan girilemez.",
    },
    {
      id: "l2",
      prompt: "'Ich interessiere mich für Deutsch.' Bedeutung?",
      options: ["Almanca'ya ilgim var", "Almanca'dan nefret ederim", "Almanca öğretirim", "Almanca konuşmam"],
      answer: 0,
      explanation: "sich interessieren für = ile ilgilenmek.",
    },
    {
      id: "l3",
      prompt: "Welcher Satz passt zu einer formellen E-Mail?",
      options: [
        "Sehr geehrte Damen und Herren,",
        "Hi du!",
        "Yo Alter!",
        "Was geht?",
      ],
      answer: 0,
      explanation: "Resmi e-posta selamlaması.",
    },
    {
      id: "l4",
      prompt: "'Heute geschlossen wegen Krankheit.' Was passt?",
      options: ["Bugün kapalı", "Bugün indirimli", "Bugün açılış", "Bugün ücretsiz"],
      answer: 0,
      explanation: "geschlossen = kapalı.",
    },
  ],
  hoeren: [
    {
      id: "h1",
      prompt: "Ein Sprecher sagt: 'Der Zug nach Berlin fährt um 8:15.' Wann fährt der Zug?",
      options: ["08:15", "08:50", "18:15", "07:15"],
      answer: 0,
      explanation: "acht Uhr fünfzehn = 8:15.",
    },
    {
      id: "h2",
      prompt: "'Können Sie das bitte wiederholen?' Wann benutzt man diesen Satz?",
      options: [
        "Wenn man etwas nicht verstanden hat",
        "Beim Bezahlen",
        "Beim Abschied",
        "Beim Bestellen",
      ],
      answer: 0,
      explanation: "Tekrar etmesini istemek.",
    },
    {
      id: "h3",
      prompt: "Wettervorhersage: 'morgen regnet es stark'. Bedeutung?",
      options: ["Yarın çok yağmurlu", "Yarın güneşli", "Yarın karlı", "Yarın sıcak"],
      answer: 0,
      explanation: "es regnet = yağmur yağıyor.",
    },
  ],
  schreiben: [
    {
      id: "s1",
      prompt: "Welcher Satz ist grammatikalisch korrekt?",
      options: [
        "Ich gehe morgen zur Arbeit.",
        "Ich morgen zur Arbeit gehen.",
        "Morgen gehen ich zur Arbeit.",
        "Ich gehen morgen zur Arbeit.",
      ],
      answer: 0,
      explanation: "Aussagesatz: SVO ile fiil 2. pozisyonda.",
    },
    {
      id: "s2",
      prompt: "Wähle die korrekte Form: 'Ich __ einen Kaffee.'",
      options: ["möchte", "möchten", "möchtest", "mögen"],
      answer: 0,
      explanation: "ich möchte (Konjunktiv II) tekil 1. şahıs.",
    },
    {
      id: "s3",
      prompt: "Welche Zeitform passt für eine Vergangenheit beim Sprechen?",
      options: ["Perfekt", "Plusquamperfekt", "Präsens", "Futur II"],
      answer: 0,
      explanation: "Konuşma dilinde Perfekt yaygındır.",
    },
  ],
  sprechen: [
    {
      id: "sp1",
      prompt: "Wie reagierst du auf 'Wie geht es dir?'",
      options: [
        "Danke, gut. Und dir?",
        "Auf Wiedersehen.",
        "Bitte schön.",
        "Ich heiße Emir.",
      ],
      answer: 0,
      explanation: "Standart cevap.",
    },
    {
      id: "sp2",
      prompt: "Wenn du etwas nicht verstanden hast, sagst du:",
      options: [
        "Entschuldigung, könnten Sie das wiederholen?",
        "Auf Wiedersehen.",
        "Guten Appetit.",
        "Frohes Neues!",
      ],
      answer: 0,
      explanation: "Anlamadığında nazikçe tekrar isteme.",
    },
    {
      id: "sp3",
      prompt: "Pizza sipariş ederken doğru cümle?",
      options: [
        "Ich hätte gern eine Pizza Margherita.",
        "Ich pizza will eine.",
        "Pizza geben ich.",
        "Mir Pizza.",
      ],
      answer: 0,
      explanation: "höfliche Bestellung mit Konjunktiv II.",
    },
  ],
};

const SKILL_LABELS: Record<Skill, string> = {
  lesen: "Okuma (Lesen)",
  hoeren: "Dinleme (Hören)",
  schreiben: "Yazma (Schreiben)",
  sprechen: "Konuşma (Sprechen)",
};

const SKILL_ORDER: Skill[] = ["lesen", "hoeren", "schreiben", "sprechen"];

export default function MockExamRunner() {
  const [settings, setSettings] = useState<ExamSettings | null>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [skillIdx, setSkillIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [startedAt, setStartedAt] = useState<number>(0);
  const [results, setResults] = useState<{
    overall: number;
    scores: Record<Skill, number>;
    durationMinutes: number;
  } | null>(null);

  // Section timer
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydration after mount
    setSettings(getExamSettings());
  }, []);

  const provider: ExamProvider = settings?.provider ?? "telc";
  const level: ExamLevel = settings?.level ?? "A2";
  const fmt = EXAM_FORMATS[provider];
  const currentSkill = SKILL_ORDER[skillIdx];
  const questions = QUESTIONS[currentSkill];
  const currentQ = questions[qIdx];

  const sectionMinutes = useMemo(() => {
    // Quick mock: scale official minutes to 1/3 (we have far fewer questions).
    return Math.max(2, Math.round((fmt.sections[currentSkill]?.minutes ?? 10) / 3));
  }, [fmt, currentSkill]);

  useEffect(() => {
    if (phase !== "running") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starting a new section timer
    setSecondsLeft(sectionMinutes * 60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // Skip to next section.
          jumpNextSection();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, skillIdx, sectionMinutes]);

  function start() {
    setPhase("running");
    setSkillIdx(0);
    setQIdx(0);
    setAnswers({});
    setStartedAt(Date.now());
    setResults(null);
  }

  function selectAnswer(idx: number) {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: idx }));
  }

  function next() {
    if (qIdx + 1 < questions.length) {
      setQIdx((x) => x + 1);
    } else {
      jumpNextSection();
    }
  }

  function jumpNextSection() {
    if (skillIdx + 1 < SKILL_ORDER.length) {
      setSkillIdx((x) => x + 1);
      setQIdx(0);
    } else {
      finish();
    }
  }

  function finish() {
    if (timerRef.current) clearInterval(timerRef.current);
    const scores = {} as Record<Skill, number>;
    for (const s of SKILL_ORDER) {
      const qs = QUESTIONS[s];
      const correct = qs.filter((q) => answers[q.id] === q.answer).length;
      scores[s] = Math.round((correct / qs.length) * 100);
    }
    const weights = SKILL_ORDER.map((s) => fmt.sections[s]?.weight ?? 25);
    const totalW = weights.reduce((a, b) => a + b, 0);
    const overall = Math.round(
      SKILL_ORDER.reduce((acc, s, i) => acc + scores[s] * weights[i], 0) / totalW,
    );
    const durationMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    addExamResult({ provider, level, scores, overall, durationMinutes });
    setResults({ overall, scores, durationMinutes });
    setPhase("done");
  }

  if (phase === "idle") {
    return (
      <section className="surface p-5 md:p-7 grid gap-3 animate-slide-up">
        <span className="eyebrow">Mock sınav</span>
        <h2 className="h-display text-2xl">Hızlı sınav simülasyonu</h2>
        <p className="text-sm text-[color:var(--fg-muted)]">
          {fmt.label} · {level} formatına göre 4 bölümlük kısa simülasyon. Her bölüm orijinal süresinin 1/3&apos;ü
          ile çalışır. Sonuçlar dinamik planına işlenir.
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary" onClick={start}>Sınavı başlat</button>
        </div>
      </section>
    );
  }

  if (phase === "running") {
    return (
      <section className="surface p-5 md:p-7 grid gap-4 animate-slide-up">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="eyebrow">Bölüm {skillIdx + 1} / 4</span>
            <h2 className="h-display text-xl">{SKILL_LABELS[currentSkill]}</h2>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl">
              {Math.floor(secondsLeft / 60).toString().padStart(2, "0")}:
              {(secondsLeft % 60).toString().padStart(2, "0")}
            </div>
            <p className="text-xs text-[color:var(--fg-muted)]">bölüm süresi</p>
          </div>
        </header>
        <div className="surface-muted p-4">
          <p className="text-sm text-[color:var(--fg-muted)] mb-2">
            Soru {qIdx + 1} / {questions.length}
          </p>
          <p className="font-medium">{currentQ.prompt}</p>
          <ul className="grid gap-2 mt-3">
            {currentQ.options.map((opt, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => selectAnswer(i)}
                  className={`w-full text-left btn ${answers[currentQ.id] === i ? "btn-primary" : "btn-secondary"}`}
                >
                  {String.fromCharCode(65 + i)}. {opt}
                </button>
              </li>
            ))}
          </ul>
          <div className="flex justify-between mt-4">
            <button type="button" className="btn btn-ghost" onClick={jumpNextSection}>
              Bölümü atla
            </button>
            <button type="button" className="btn btn-primary" onClick={next}>
              {qIdx + 1 < questions.length ? "Sonraki soru →" : "Bölümü bitir →"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // done
  if (!results) return null;
  return (
    <section className="surface p-5 md:p-7 grid gap-4 animate-slide-up">
      <span className="eyebrow">Sonuç</span>
      <h2 className="h-display text-2xl">Sınav simülasyonu tamamlandı</h2>
      <div className="grid gap-3 md:grid-cols-5">
        <div className="stat stat-primary">
          <span className="stat-label">Genel</span>
          <span className="stat-value">%{results.overall}</span>
        </div>
        {SKILL_ORDER.map((s) => (
          <div key={s} className="stat">
            <span className="stat-label">{SKILL_LABELS[s]}</span>
            <span className="stat-value">%{results.scores[s]}</span>
          </div>
        ))}
      </div>
      <p className="text-sm text-[color:var(--fg-muted)]">
        Süre: {results.durationMinutes} dk · {new Date().toLocaleString("tr-TR")}
      </p>
      <div className="flex gap-2">
        <button type="button" className="btn btn-primary" onClick={start}>Tekrar dene</button>
        <button type="button" className="btn btn-ghost" onClick={() => setPhase("idle")}>Kapat</button>
      </div>
    </section>
  );
}
