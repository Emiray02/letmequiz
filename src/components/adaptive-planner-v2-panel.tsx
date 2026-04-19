"use client";

import { useMemo, useState } from "react";
import {
  applyAdaptivePlannerV2,
  getAdaptivePlannerV2Preview,
  type AdaptivePlannerV2ApplyResult,
} from "@/lib/adaptive-planner-v2";
import { subscribeRealtimeSync } from "@/lib/realtime-sync";
import { useEffect } from "react";

export default function AdaptivePlannerV2Panel() {
  const [version, setVersion] = useState(0);
  const [applyResult, setApplyResult] = useState<AdaptivePlannerV2ApplyResult | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeRealtimeSync((topic) => {
      if (topic.includes("student") || topic.includes("planner")) {
        setVersion((value) => value + 1);
      }
    });
    return unsubscribe;
  }, []);

  const preview = useMemo(() => {
    void version;
    return getAdaptivePlannerV2Preview();
  }, [version]);

  function applyPlan() {
    setApplyResult(applyAdaptivePlannerV2());
    setVersion((value) => value + 1);
  }

  return (
    <section className="rounded-[1.6rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-2xl text-slate-900">Adaptive Planner V2</h3>
        <button
          type="button"
          onClick={applyPlan}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700"
        >
          Apply Weekly Optimization
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Recommended Daily</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{preview.recommendedDailyMinutes} min</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Target Accuracy</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">%{preview.targetAccuracy}</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Mistake Reduction</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">%{preview.targetMistakeReductionPercent}</p>
        </article>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Why This Plan</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {preview.reasons.map((item, index) => (
            <li key={`${item}-${index}`}>- {item}</li>
          ))}
        </ul>
      </div>

      {applyResult ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Added {applyResult.addedTasks} tasks, skipped {applyResult.skippedTasks} duplicates, daily goal updated to {applyResult.recommendedDailyMinutes} minutes.
        </p>
      ) : null}
    </section>
  );
}
