"use client";

import { useEffect, useMemo, useState } from "react";
import type { StudentMetrics } from "@/types/student";
import { getStudentMetrics } from "@/lib/student-store";
import { getSpeakingCoachStats } from "@/lib/speaking-coach-store";
import { getTelcMockResults } from "@/lib/telc-a2-store";
import { subscribeRealtimeSync } from "@/lib/realtime-sync";

type SkillMapProps = {
  metrics?: StudentMetrics;
};

type SkillRow = {
  id: "lesen" | "hoeren" | "schreiben" | "sprechen";
  label: string;
  value: number;
  note: string;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function weighted(parts: Array<{ score: number; weight: number }>): number {
  const totalWeight = parts.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) {
    return 0;
  }

  const score = parts.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight;
  return clamp(score);
}

export default function SkillMap({ metrics }: SkillMapProps) {
  const [stateVersion, setStateVersion] = useState(0);

  useEffect(() => {
    if (metrics) {
      return;
    }

    const unsubscribe = subscribeRealtimeSync(() => {
      setStateVersion((value) => value + 1);
    });

    return unsubscribe;
  }, [metrics]);

  const internalMetrics = useMemo<StudentMetrics>(
    () => {
      void stateVersion;
      return metrics ?? getStudentMetrics();
    },
    [metrics, stateVersion]
  );

  const skillRows = useMemo(() => {
    const answers = internalMetrics.totalCorrectAnswers + internalMetrics.totalWrongAnswers;
    const quizAccuracy = answers > 0 ? (internalMetrics.totalCorrectAnswers / answers) * 100 : 0;
    const writingAccuracy =
      internalMetrics.totalWritingAttempts > 0
        ? (internalMetrics.totalWritingCorrect / internalMetrics.totalWritingAttempts) * 100
        : 0;

    const speaking = getSpeakingCoachStats();
    const latestTelc = getTelcMockResults(1)[0];

    const lesen = weighted([
      { score: quizAccuracy, weight: 0.6 },
      { score: latestTelc?.lesen ?? quizAccuracy, weight: 0.4 },
    ]);

    const hoeren = weighted([
      { score: latestTelc?.hoeren ?? 62, weight: 0.65 },
      { score: speaking.avgPronunciation || 60, weight: 0.35 },
    ]);

    const schreiben = weighted([
      { score: writingAccuracy || 58, weight: 0.6 },
      { score: latestTelc?.schreiben ?? 60, weight: 0.4 },
    ]);

    const sprechen = weighted([
      { score: speaking.avgPronunciation || 55, weight: 0.55 },
      { score: speaking.avgGrammar || 55, weight: 0.25 },
      { score: latestTelc?.sprechen ?? 58, weight: 0.2 },
    ]);

    return [
      {
        id: "lesen",
        label: "Lesen",
        value: lesen,
        note: "Reading comprehension and prompt decoding.",
      },
      {
        id: "hoeren",
        label: "Hoeren",
        value: hoeren,
        note: "Listening transfer and phrase recognition.",
      },
      {
        id: "schreiben",
        label: "Schreiben",
        value: schreiben,
        note: "Written output and structure quality.",
      },
      {
        id: "sprechen",
        label: "Sprechen",
        value: sprechen,
        note: "Pronunciation and spoken grammar control.",
      },
    ] as SkillRow[];
  }, [internalMetrics]);

  const overall = useMemo(() => {
    if (skillRows.length === 0) {
      return 0;
    }

    return clamp(skillRows.reduce((sum, item) => sum + item.value, 0) / skillRows.length);
  }, [skillRows]);

  return (
    <section className="rounded-[1.6rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-2xl text-slate-900">Skill Map</h3>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          Overall {overall}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {skillRows.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <p className="text-sm font-semibold text-slate-700">{item.value}</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-slate-900" style={{ width: `${item.value}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-600">{item.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
