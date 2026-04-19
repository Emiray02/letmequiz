"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { StudySetSummary } from "@/types/study";

type Props = {
  sets: StudySetSummary[];
  emptyHint?: string;
};

function inferLevel(title: string): { code: string; cls: string } | null {
  const m = title.match(/\b(A1|A2|B1|B2|C1|C2)\b/i);
  if (!m) return null;
  const code = m[1].toUpperCase();
  return { code, cls: `cefr-${code.toLowerCase()}` };
}

export default function HomeSetGrid({ sets, emptyHint }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sets;
    return sets.filter(
      (s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    );
  }, [query, sets]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          className="input md:max-w-xs"
          placeholder="Setlerde ara: Artikel, A2, beruf..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="text-xs text-[color:var(--fg-subtle)]">
          {filtered.length} set görünüyor
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="surface-muted p-6 text-center text-sm text-[color:var(--fg-muted)]">
          {emptyHint ?? "Bu aramaya uyan set yok. Yeni bir set oluşturmayı dene."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const lvl = inferLevel(s.title);
            return (
              <Link key={s.id} href={`/set/${s.id}`} className="card card-hover flex h-full flex-col">
                <div className="flex items-center justify-between gap-2">
                  {lvl ? <span className={`cefr ${lvl.cls}`}>{lvl.code}</span> : <span className="chip">Set</span>}
                  <span className="text-xs text-[color:var(--fg-subtle)]">{s.cardCount} kart</span>
                </div>
                <h3 className="mt-3 text-base font-semibold leading-tight">{s.title}</h3>
                <p className="mt-1 text-sm text-[color:var(--fg-muted)] line-clamp-3">{s.description || "Açıklama yok."}</p>
                <span className="mt-auto pt-4 text-sm font-semibold text-[color:var(--primary)]">
                  Setı aç →
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
