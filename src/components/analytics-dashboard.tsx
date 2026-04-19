"use client";

import { useEffect, useMemo, useState } from "react";
import { getAnalyticsSummary, getRecentAnalyticsEvents } from "@/lib/analytics-store";
import { subscribeRealtimeSync } from "@/lib/realtime-sync";

function shortDate(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function AnalyticsDashboard() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeRealtimeSync((topic) => {
      if (
        topic.includes("analytics") ||
        topic.includes("student") ||
        topic.includes("exam") ||
        topic.includes("class-live")
      ) {
        setVersion((value) => value + 1);
      }
    });
    return unsubscribe;
  }, []);

  const summary = useMemo(() => {
    void version;
    return getAnalyticsSummary(30);
  }, [version]);
  const recent = useMemo(() => {
    void version;
    return getRecentAnalyticsEvents(12);
  }, [version]);

  const maxDaily = Math.max(1, ...summary.last14Days.map((item) => item.events));

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Events (30d)</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalEvents}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Days</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.activeDays}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top Feature</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {summary.byName[0]?.name ?? "No data"}
          </p>
        </article>
      </div>

      <article className="rounded-[1.6rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
        <h3 className="font-display text-2xl text-slate-900">14-Day Event Activity</h3>
        <div className="mt-3 grid grid-cols-14 gap-1">
          {summary.last14Days.map((item) => {
            const height = Math.max(6, Math.round((item.events / maxDaily) * 90));
            return (
              <div key={item.date} className="text-center">
                <div className="mx-auto flex h-24 items-end rounded-md bg-slate-100 px-[2px]">
                  <div className="w-full rounded-sm bg-slate-900" style={{ height: `${height}%` }} />
                </div>
                <p className="mt-1 text-[10px] text-slate-500">{shortDate(item.date)}</p>
              </div>
            );
          })}
        </div>
      </article>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-[1.6rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
          <h3 className="font-display text-2xl text-slate-900">Feature Usage Mix</h3>
          <div className="mt-3 space-y-2">
            {summary.byName.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No analytics events yet.
              </p>
            ) : (
              summary.byName.slice(0, 10).map((item) => (
                <div key={item.name} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-600">{item.count}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-[1.6rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
          <h3 className="font-display text-2xl text-slate-900">Recent Events</h3>
          <div className="mt-3 space-y-2">
            {recent.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No recent events.
              </p>
            ) : (
              recent.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                  <p className="font-semibold text-slate-800">{item.name}</p>
                  <p>{new Date(item.at).toLocaleString("tr-TR")}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
