"use client";

import { useEffect, useState } from "react";
import {
  getOrCreateCurrentWeeklyReport,
  regenerateCurrentWeeklyReport,
  type WeeklyReport,
  type WeeklyReportRole,
} from "@/lib/weekly-report-store";
import { subscribeRealtimeSync } from "@/lib/realtime-sync";

type WeeklyReportPanelProps = {
  role: WeeklyReportRole;
};

export default function WeeklyReportPanel({ role }: WeeklyReportPanelProps) {
  const [report, setReport] = useState<WeeklyReport>(() => getOrCreateCurrentWeeklyReport(role));

  useEffect(() => {
    const unsubscribe = subscribeRealtimeSync((topic) => {
      if (topic.includes("report") || topic.includes("student") || topic.includes("speaking")) {
        setReport(getOrCreateCurrentWeeklyReport(role));
      }
    });

    return unsubscribe;
  }, [role]);

  function regenerate() {
    setReport(regenerateCurrentWeeklyReport(role));
  }

  return (
    <section className="rounded-[1.6rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-2xl text-slate-900">Weekly Auto Report</h3>
        <button
          type="button"
          onClick={regenerate}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Regenerate
        </button>
      </div>

      <p className="mt-2 text-sm text-slate-700">{report.summary}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {report.kpis.map((item) => (
          <article key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{item.value}</p>
          </article>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next Actions</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {report.nextSteps.map((item, index) => (
            <li key={`${item}-${index}`}>- {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
