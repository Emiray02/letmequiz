"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addTask, getQuizMistakes, getTasks, setDailyGoalMinutes } from "@/lib/student-store";
import type { StudyTaskPriority } from "@/types/student";
import TelcA2MockMode from "@/components/telc-a2-mock-mode";
import { getTelcExamDate, getTelcMockResults, getTelcResultTrend, setTelcExamDate } from "@/lib/telc-a2-store";

type TopicModule = "lesen" | "hoeren" | "schreiben" | "sprechen" | "grammatik" | "wortschatz";

type TopicDefinition = {
  id: string;
  name: string;
  module: TopicModule;
  keywords: string[];
  action: string;
};

type TopicReportItem = {
  topic: TopicDefinition;
  score: number;
  keywordHits: number;
  level: "kritik" | "yuksek" | "orta" | "stabil";
};

type PlanTaskTemplate = {
  title: string;
  subject: string;
  dayOffset: number;
  priority: StudyTaskPriority;
};

const TOPICS: TopicDefinition[] = [
  {
    id: "vorstellung-kontakt",
    name: "Kendini Tanitma ve Iletisim",
    module: "sprechen",
    keywords: ["heisse", "wohne", "interessiere", "vorstellen", "hobby"],
    action: "Gunluk 10 dakikalik self-intro + partner soru-cevap role-play.",
  },
  {
    id: "alltag-wohnen",
    name: "Gunluk Yasam ve Konut",
    module: "lesen",
    keywords: ["wohnung", "miete", "wochenende", "haushalt", "adresse"],
    action: "Ilan/form metinleri okuyup ana bilgiyi 60 saniyede cikarma alistirmasi.",
  },
  {
    id: "termine-arbeit",
    name: "Randevu ve Is Hayati",
    module: "hoeren",
    keywords: ["termin", "arbeit", "bewerben", "uhr", "verschieben"],
    action: "Randevu diyaloglari dinleme + not alma + yeniden ifade etme.",
  },
  {
    id: "gesundheit-reise",
    name: "Saglik ve Yol Tarifi",
    module: "wortschatz",
    keywords: ["kopfschmerzen", "arzt", "bahnhof", "apotheke", "weg"],
    action: "Saglik ve yol tarifi kelimelerini cloze + speaking drill ile tekrar et.",
  },
  {
    id: "grammatik-satzbau",
    name: "A2 Gramer ve Cumle Kurulumu",
    module: "grammatik",
    keywords: ["perfekt", "dativ", "praesens", "weil", "dass"],
    action: "Her gun 10 cumle: fiil yeri, baglac ve zaman donusumu odakli yazim.",
  },
  {
    id: "schreiben-email",
    name: "E-Posta Yazimi ve Uretim",
    module: "schreiben",
    keywords: ["email", "schreiben", "bitte", "gruessen", "antwort"],
    action: "Haftada 3 kez 60-80 kelimelik telc formatli kisa e-posta yazimi.",
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function daysLeftFromDate(dateValue: string): number {
  if (!dateValue) {
    return 0;
  }

  const targetMs = new Date(`${dateValue}T23:59:59`).getTime();
  const nowMs = Date.now();
  return Math.ceil((targetMs - nowMs) / 86_400_000);
}

function phaseLabel(daysLeft: number): string {
  if (daysLeft <= 0) {
    return "Sinav zamani veya gecti";
  }
  if (daysLeft > 56) {
    return "Faz 1: Temel kurulum";
  }
  if (daysLeft > 28) {
    return "Faz 2: Yogunlastirma";
  }
  if (daysLeft > 14) {
    return "Faz 3: Sinav transferi";
  }
  if (daysLeft > 7) {
    return "Faz 4: Konsolidasyon";
  }
  return "Faz 5: Final toparlama";
}

function baseMinutesByRemainingDays(daysLeft: number): number {
  if (daysLeft <= 0) {
    return 45;
  }
  if (daysLeft > 84) {
    return 55;
  }
  if (daysLeft > 56) {
    return 70;
  }
  if (daysLeft > 35) {
    return 85;
  }
  if (daysLeft > 21) {
    return 100;
  }
  if (daysLeft > 14) {
    return 115;
  }
  if (daysLeft > 7) {
    return 130;
  }
  return 150;
}

function scoreToLevel(score: number): TopicReportItem["level"] {
  if (score <= 50) {
    return "kritik";
  }
  if (score <= 65) {
    return "yuksek";
  }
  if (score <= 80) {
    return "orta";
  }
  return "stabil";
}

function sectionScoreForTopic(topic: TopicDefinition, latestMock?: { lesen: number; hoeren: number; schreiben: number; sprechen: number }) {
  if (!latestMock) {
    if (topic.module === "grammatik") {
      return 62;
    }
    if (topic.module === "wortschatz") {
      return 64;
    }
    return 66;
  }

  if (topic.module === "lesen") {
    return latestMock.lesen;
  }
  if (topic.module === "hoeren") {
    return latestMock.hoeren;
  }
  if (topic.module === "schreiben") {
    return latestMock.schreiben;
  }
  if (topic.module === "sprechen") {
    return latestMock.sprechen;
  }
  if (topic.module === "grammatik") {
    return Math.round(latestMock.lesen * 0.45 + latestMock.schreiben * 0.55);
  }

  return Math.round(latestMock.lesen * 0.35 + latestMock.hoeren * 0.35 + latestMock.sprechen * 0.3);
}

function buildAdaptiveTemplates(daysLeft: number, weakTopics: TopicReportItem[], dailyMinutes: number): PlanTaskTemplate[] {
  const horizonDays = daysLeft > 21 ? 14 : daysLeft > 7 ? 10 : 7;
  const templates: PlanTaskTemplate[] = [];

  const fallbackTopic = weakTopics[0] ?? {
    topic: TOPICS[0],
    score: 60,
    keywordHits: 0,
    level: "orta" as const,
  };

  for (let i = 0; i < horizonDays; i += 1) {
    const rotating = weakTopics[i % Math.max(weakTopics.length, 1)] ?? fallbackTopic;
    const intensity = clamp(Math.round(dailyMinutes * (i % 3 === 0 ? 1 : 0.85)), 40, 190);
    const priority: StudyTaskPriority = rotating.score <= 60 ? "high" : rotating.score <= 75 ? "medium" : "low";

    templates.push({
      title: `[TELC-A2] Gun ${i + 1} | ${rotating.topic.name} | Odak Calisma (${intensity}dk)`,
      subject: `TELC A2 - ${rotating.topic.module.toUpperCase()}`,
      dayOffset: i,
      priority,
    });

    if ((i + 1) % 3 === 0) {
      templates.push({
        title: `[TELC-A2] Gun ${i + 1} | Mini Mock + Hata Defteri (35dk)`,
        subject: "TELC A2 - Mock",
        dayOffset: i,
        priority: "high",
      });
    }
  }

  return templates;
}

export default function TelcA2Plan() {
  const [feedback, setFeedback] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [examDate, setExamDate] = useState(() => getTelcExamDate());
  const [, forceRefresh] = useState(0);

  const daysLeft = useMemo(() => daysLeftFromDate(examDate), [examDate]);

  const latestMock = getTelcMockResults(1)[0];
  const trend = getTelcResultTrend(8);
  const mistakes = getQuizMistakes();
  const mistakeTexts = mistakes.map((item) => `${item.prompt} ${item.answer}`.toLocaleLowerCase("tr-TR"));

  const topicReport = TOPICS.map((topic) => {
    const sectionScore = sectionScoreForTopic(topic, latestMock);
    const keywordHits = mistakeTexts.reduce((sum, text) => {
      const matched = topic.keywords.some((keyword) => text.includes(keyword.toLocaleLowerCase("tr-TR")));
      return sum + (matched ? 1 : 0);
    }, 0);

    const penalty = clamp(keywordHits * 6, 0, 30);
    const score = clamp(sectionScore - penalty, 25, 97);

    return {
      topic,
      score,
      keywordHits,
      level: scoreToLevel(score),
    } satisfies TopicReportItem;
  }).sort((a, b) => a.score - b.score);

  const topWeak = topicReport.slice(0, 3);
  const avgWeakScore = Math.round(topWeak.reduce((sum, item) => sum + item.score, 0) / Math.max(topWeak.length, 1));

  const base = baseMinutesByRemainingDays(daysLeft);
  const weaknessBoost = clamp(Math.round((70 - avgWeakScore) * 1.1), 0, 35);
  const recommendedDailyMinutes = clamp(base + weaknessBoost, 45, 180);

  const routine = {
    smartReview: Math.round(recommendedDailyMinutes * 0.25),
    vocabLab: Math.round(recommendedDailyMinutes * 0.3),
    inputDrill: Math.round(recommendedDailyMinutes * 0.2),
    outputDrill: Math.max(
      10,
      recommendedDailyMinutes -
        Math.round(recommendedDailyMinutes * 0.25) -
        Math.round(recommendedDailyMinutes * 0.3) -
        Math.round(recommendedDailyMinutes * 0.2)
    ),
  };

  function onExamDateChange(value: string) {
    setExamDate(value);
    setTelcExamDate(value);
  }

  function applyAdaptivePlan() {
    setIsApplying(true);

    if (!examDate) {
      setFeedback("Once telc sinav tarihini gir.");
      setIsApplying(false);
      return;
    }

    if (daysLeft <= 0) {
      setFeedback("Sinav tarihi bugun veya gecmis gorunuyor. Yeni tarih girip tekrar dene.");
      setIsApplying(false);
      return;
    }

    setDailyGoalMinutes(recommendedDailyMinutes);

    const templates = buildAdaptiveTemplates(daysLeft, topWeak.length ? topWeak : topicReport, recommendedDailyMinutes);
    const existingTitles = new Set(getTasks().map((task) => task.title));

    let added = 0;
    let skipped = 0;

    for (const template of templates) {
      if (existingTitles.has(template.title)) {
        skipped += 1;
        continue;
      }

      addTask({
        title: template.title,
        subject: template.subject,
        dueDate: new Date(Date.now() + template.dayOffset * 86_400_000).toISOString().slice(0, 10),
        priority: template.priority,
      });
      existingTitles.add(template.title);
      added += 1;
    }

    setFeedback(`${added} adaptif gorev eklendi, ${skipped} gorev zaten vardi. Gunluk hedef ${recommendedDailyMinutes} dk olarak guncellendi.`);
    setIsApplying(false);
  }

  return (
    <section className="mt-8 rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.9)] backdrop-blur md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">German Track</p>
          <h2 className="mt-2 font-display text-3xl text-slate-900 md:text-4xl">TELC A2 Adaptif Bilimsel Sistem</h2>
        </div>
        <button
          type="button"
          onClick={applyAdaptivePlan}
          disabled={isApplying}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isApplying ? "Plan Uygulaniyor..." : "Kalan Sureye Gore Plani Uygula"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor="telc-date" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            TELC Sinav Tarihi
          </label>
          <input
            id="telc-date"
            type="date"
            value={examDate}
            onChange={(event) => onExamDateChange(event.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-cyan-500 focus:ring"
          />
        </div>

        <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Kalan Sure</p>
          <p className="mt-1 text-2xl font-semibold text-cyan-900">{examDate ? daysLeft : "-"}</p>
          <p className="text-xs text-cyan-700">gun</p>
          <p className="mt-1 text-xs text-cyan-700">{phaseLabel(daysLeft)}</p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-700">
        Strateji, spacing + retrieval + interleaving + exam-transfer prensipleriyle uretilir.
        Kalan gun azaldikca gunluk sure ve deneme yogunlugu otomatik artar.
      </p>

      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Adaptif Gunluk Sure</p>
        <p className="mt-1 text-2xl font-semibold text-emerald-900">{recommendedDailyMinutes} dk</p>
        <ul className="mt-2 space-y-1 text-sm text-emerald-900">
          <li>{routine.smartReview} dk - Smart Review (due + weak)</li>
          <li>{routine.vocabLab} dk - Vocabulary Lab (mnemonic + cloze)</li>
          <li>{routine.inputDrill} dk - Lesen/Hoeren input calismasi</li>
          <li>{routine.outputDrill} dk - Schreiben/Sprechen output calismasi</li>
        </ul>
      </div>

      <section className="mt-5 rounded-2xl border border-black/10 bg-white p-4">
        <h3 className="text-lg font-semibold text-slate-900">Haftalik Otomatik Zayif Alan Raporu</h3>
        <p className="mt-1 text-sm text-slate-600">
          Rapor, son mock section puanlari ve hata kayitlarindaki konu sinyallerinden olusturulur.
        </p>
        <div className="mt-3 space-y-2">
          {topicReport.map((item) => (
            <article key={item.topic.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{item.topic.name}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Skor {item.score}</p>
              </div>
              <p className="mt-1 text-xs text-slate-600">Seviye: {item.level} | Hata sinyali: {item.keywordHits}</p>
              <p className="mt-1 text-sm text-slate-700">Aksiyon: {item.topic.action}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-black/10 bg-white p-4">
        <h3 className="text-lg font-semibold text-slate-900">TELC Mock Trend</h3>
        {trend.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Henuz trend olusmadi. Full simulator ile en az bir deneme tamamla.</p>
        ) : (
          <div className="mt-3 grid grid-cols-8 gap-1">
            {trend.map((item) => {
              const height = Math.max(8, Math.round((item.overall / 100) * 80));
              return (
                <div key={item.createdAt} className="text-center">
                  <div className="mx-auto flex h-24 items-end rounded-md bg-slate-100 px-[2px]">
                    <div className="w-full rounded-sm bg-slate-900" style={{ height: `${height}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">{item.overall}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <TelcA2MockMode onResultSaved={() => forceRefresh((value) => value + 1)} />

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/set/seed-de-a2-101"
          className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-800 transition hover:bg-emerald-100"
        >
          German A2 Starter Set
        </Link>
        <Link
          href="/ai-workbench"
          className="rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-800 transition hover:bg-cyan-100"
        >
          TELC materyalini AI ile isle
        </Link>
        <Link
          href="/create"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-100"
        >
          Yeni Almanca set olustur
        </Link>
      </div>

      {feedback ? (
        <p className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{feedback}</p>
      ) : null}
    </section>
  );
}
