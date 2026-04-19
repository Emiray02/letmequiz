"use client";

import { useMemo, useState } from "react";
import type { StudySet } from "@/types/study";
import { trackAnalyticsEvent } from "@/lib/analytics-store";

type SetExportPanelProps = {
  set: StudySet;
};

function escapeCsv(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function SetExportPanel({ set }: SetExportPanelProps) {
  const [feedback, setFeedback] = useState("");

  const ankiCsv = useMemo(() => {
    const header = "term,definition";
    const rows = set.cards.map((card) => `${escapeCsv(card.term)},${escapeCsv(card.definition)}`);
    return [header, ...rows].join("\n");
  }, [set.cards]);

  const quizletTsv = useMemo(
    () => set.cards.map((card) => `${card.term}\t${card.definition}`).join("\n"),
    [set.cards]
  );

  function exportAnki() {
    downloadText(`${set.title.replace(/\s+/g, "-").toLowerCase()}-anki.csv`, ankiCsv);
    setFeedback("Anki CSV exported.");
    trackAnalyticsEvent({
      name: "set-exported",
      value: set.cards.length,
      metadata: { format: "anki-csv", setId: set.id },
    });
  }

  function exportQuizlet() {
    downloadText(`${set.title.replace(/\s+/g, "-").toLowerCase()}-quizlet.tsv`, quizletTsv);
    setFeedback("Quizlet TSV exported.");
    trackAnalyticsEvent({
      name: "set-exported",
      value: set.cards.length,
      metadata: { format: "quizlet-tsv", setId: set.id },
    });
  }

  async function copyQuizlet() {
    try {
      await navigator.clipboard.writeText(quizletTsv);
      setFeedback("Quizlet TSV copied to clipboard.");
      trackAnalyticsEvent({
        name: "set-exported",
        value: set.cards.length,
        metadata: { format: "quizlet-copy", setId: set.id },
      });
    } catch {
      setFeedback("Clipboard copy failed.");
    }
  }

  return (
    <section className="mt-4 rounded-[1.6rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
      <h3 className="font-display text-2xl text-slate-900">Anki / Quizlet Export</h3>
      <p className="mt-1 text-sm text-slate-600">Use CSV for Anki import and TSV for Quizlet import.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportAnki}
          className="rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-700 transition hover:bg-cyan-100"
        >
          Download Anki CSV
        </button>
        <button
          type="button"
          onClick={exportQuizlet}
          className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 transition hover:bg-emerald-100"
        >
          Download Quizlet TSV
        </button>
        <button
          type="button"
          onClick={copyQuizlet}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-100"
        >
          Copy Quizlet TSV
        </button>
      </div>

      {feedback ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{feedback}</p>
      ) : null}
    </section>
  );
}
