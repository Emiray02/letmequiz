"use client";

import { useEffect, useState } from "react";

type SetNotesProps = {
  setId: string;
};

function keyForSet(setId: string): string {
  return `letmequiz.notes.${setId}`;
}

function initialNotesForSet(setId: string): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(keyForSet(setId)) ?? "";
}

export default function SetNotes({ setId }: SetNotesProps) {
  const [notes, setNotes] = useState(() => initialNotesForSet(setId));
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handle = window.setTimeout(() => {
      window.localStorage.setItem(keyForSet(setId), notes);
      setSavedAt(new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }));
    }, 250);

    return () => {
      window.clearTimeout(handle);
    };
  }, [notes, setId]);

  return (
    <section className="space-y-3 rounded-[1.6rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl text-slate-900">Study Notes</h3>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {savedAt ? `saved ${savedAt}` : "autosave"}
        </p>
      </div>
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Write class summary, tricky points, and exam reminders..."
        className="min-h-48 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-teal-500 transition focus:ring"
      />
    </section>
  );
}
