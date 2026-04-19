"use client";

import Link from "next/link";
import { useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics-store";

type ParsedCard = {
  term: string;
  definition: string;
};

function parseRows(raw: string): ParsedCard[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const firstLine = lines[0].toLocaleLowerCase("tr-TR");
  const startIndex = firstLine.includes("term") && firstLine.includes("definition") ? 1 : 0;
  const cards: ParsedCard[] = [];

  for (const line of lines.slice(startIndex)) {
    const delimiter = line.includes("\t") ? "\t" : ",";
    const [left, ...rest] = line.split(delimiter);
    const right = rest.join(delimiter);
    const term = left?.trim() || "";
    const definition = right?.trim() || "";

    if (!term || !definition) {
      continue;
    }

    cards.push({ term, definition });
  }

  return cards.slice(0, 300);
}

export default function SetImportPanel() {
  const [title, setTitle] = useState("Imported Set");
  const [description, setDescription] = useState("Imported from CSV/TSV");
  const [cards, setCards] = useState<ParsedCard[]>([]);
  const [createdSetId, setCreatedSetId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseRows(raw);
      setCards(parsed);
      setFeedback(parsed.length > 0 ? `${parsed.length} cards parsed.` : "No valid rows found.");
      setCreatedSetId("");
    };
    reader.readAsText(file);
  }

  async function createSetFromImport() {
    if (cards.length < 2) {
      setFeedback("At least 2 valid cards are required.");
      return;
    }

    setBusy(true);
    setFeedback("");

    try {
      const response = await fetch("/api/sets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim() || "Imported Set",
          description: description.trim(),
          cards,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Import failed.");
      }

      const setId = payload?.data?.id;
      if (typeof setId === "string" && setId) {
        setCreatedSetId(setId);
        setFeedback("Imported set created successfully.");
        trackAnalyticsEvent({
          name: "set-imported",
          value: cards.length,
          metadata: { format: "csv-tsv" },
        });
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-[1.8rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
      <h3 className="font-display text-2xl text-slate-900">Import From Anki/Quizlet</h3>
      <p className="mt-1 text-sm text-slate-600">Upload TSV (term tab definition) or CSV (term,definition).</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Set title"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      </div>

      <input
        type="file"
        accept=".csv,.tsv,.txt"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            handleFile(file);
          }
        }}
        className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
      />

      {cards.length > 0 ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview ({cards.length})</p>
          <div className="mt-2 space-y-1 text-xs text-slate-700">
            {cards.slice(0, 5).map((card, index) => (
              <p key={`${card.term}-${index}`}>
                {card.term}
                {" -> "}
                {card.definition}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={createSetFromImport}
          disabled={busy}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Creating..." : "Create Set From Import"}
        </button>
        {createdSetId ? (
          <Link
            href={`/set/${createdSetId}`}
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Open Imported Set
          </Link>
        ) : null}
      </div>

      {feedback ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{feedback}</p>
      ) : null}
    </section>
  );
}
