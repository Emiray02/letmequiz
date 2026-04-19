"use client";

import { useEffect, useMemo, useState } from "react";
import type { StudentMetrics } from "@/types/student";
import { getStudentMetrics } from "@/lib/student-store";
import {
  armStreakFreeze,
  evaluateMotivationProgress,
  getMotivationState,
} from "@/lib/motivation-store";
import { subscribeRealtimeSync } from "@/lib/realtime-sync";

type MotivationPanelProps = {
  metrics?: StudentMetrics;
};

export default function MotivationPanel({ metrics }: MotivationPanelProps) {
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

  const motivation = useMemo(() => evaluateMotivationProgress(internalMetrics), [internalMetrics]);

  const freezeState = getMotivationState();

  function onArmFreeze() {
    armStreakFreeze();
    setStateVersion((value) => value + 1);
  }

  return (
    <section className="rounded-[1.6rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-2xl text-slate-900">Motivation Hub</h3>
        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
          Freeze {freezeState.freezeTokens}
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Streak Freeze</p>
        <p className="mt-1 text-sm text-slate-700">
          {freezeState.freezeArmed
            ? "Freeze is armed. If you miss one day, streak will be protected once."
            : "Arm freeze before a busy day to protect streak once."}
        </p>
        <button
          type="button"
          onClick={onArmFreeze}
          disabled={freezeState.freezeArmed || freezeState.freezeTokens <= 0}
          className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {freezeState.freezeArmed ? "Freeze Armed" : "Arm Freeze"}
        </button>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Badges</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {motivation.badges.map((badge) => {
            const unlocked = motivation.state.unlockedBadgeIds.includes(badge.id);
            return (
              <article
                key={badge.id}
                className={`rounded-xl border p-3 ${
                  unlocked
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <p className={`text-sm font-semibold ${unlocked ? "text-emerald-800" : "text-slate-700"}`}>
                  {badge.title}
                </p>
                <p className="mt-1 text-xs text-slate-600">{badge.description}</p>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Weekly Challenges</p>
        <div className="mt-2 space-y-2">
          {motivation.challenges.map((challenge) => {
            const ratio = Math.min(100, Math.round((challenge.progress / Math.max(challenge.target, 1)) * 100));
            return (
              <article key={challenge.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{challenge.title}</p>
                  <p className="text-xs text-slate-600">
                    {challenge.progress}/{challenge.target} {challenge.unit}
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-slate-900" style={{ width: `${ratio}%` }} />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
