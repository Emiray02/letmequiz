"use client";

import { useMemo, useState } from "react";
import {
  getOrCreateCurrentWeeklyReport,
  regenerateCurrentWeeklyReport,
  type WeeklyReport,
} from "@/lib/weekly-report-store";

function buildMessage(report: WeeklyReport): string {
  const kpis = report.kpis.map((item) => `${item.label}: ${item.value}`).join(" | ");
  const actions = report.nextSteps.map((step, index) => `${index + 1}. ${step}`).join("\n");
  return `Weekly Parent Summary\n${report.summary}\n${kpis}\nNext Actions:\n${actions}`;
}

export default function ParentWeeklyNotificationCenter() {
  const [report, setReport] = useState(() => getOrCreateCurrentWeeklyReport("parent"));
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [feedback, setFeedback] = useState("");

  const message = useMemo(() => buildMessage(report), [report]);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setFeedback("Weekly summary copied.");
    } catch {
      setFeedback("Could not copy summary to clipboard.");
    }
  }

  function openEmail() {
    const subject = encodeURIComponent("LetMeQuiz Weekly Parent Summary");
    const body = encodeURIComponent(message);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank", "noopener,noreferrer");
  }

  function openWhatsApp() {
    const text = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  function scheduleBrowserNotification() {
    if (!("Notification" in window)) {
      setFeedback("Notification is not supported in this browser.");
      return;
    }

    const run = () => {
      window.setTimeout(() => {
        new Notification("LetMeQuiz Weekly Parent Summary", {
          body: report.summary,
        });
      }, Math.max(1, delayMinutes) * 60_000);
      setFeedback(`Browser reminder scheduled in ${delayMinutes} minutes.`);
    };

    if (Notification.permission === "granted") {
      run();
      return;
    }

    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        run();
      } else {
        setFeedback("Notification permission denied.");
      }
    });
  }

  function regenerate() {
    setReport(regenerateCurrentWeeklyReport("parent"));
    setFeedback("Weekly summary regenerated.");
  }

  return (
    <section className="rounded-[1.6rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-2xl text-slate-900">Parent Weekly Notification</h3>
        <button
          type="button"
          onClick={regenerate}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Regenerate
        </button>
      </div>

      <p className="mt-2 text-sm text-slate-700">{report.summary}</p>
      <textarea
        value={message}
        readOnly
        className="mt-3 min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyMessage}
          className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
        >
          Copy Summary
        </button>
        <button
          type="button"
          onClick={openEmail}
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          Share by Email
        </button>
        <button
          type="button"
          onClick={openWhatsApp}
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
        >
          Share by WhatsApp
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
        <span>Reminder delay</span>
        <input
          type="number"
          min={1}
          max={180}
          value={delayMinutes}
          onChange={(event) => setDelayMinutes(Number(event.target.value))}
          className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1"
        />
        <span>minutes</span>
        <button
          type="button"
          onClick={scheduleBrowserNotification}
          className="rounded-lg border border-slate-300 px-2 py-1 font-semibold transition hover:bg-slate-100"
        >
          Schedule Browser Reminder
        </button>
      </div>

      {feedback ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">{feedback}</p>
      ) : null}
    </section>
  );
}
