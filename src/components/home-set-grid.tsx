"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { StudySetSummary } from "@/types/study";

type Props = {
  sets: StudySetSummary[];
};

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function HomeSetGrid({ sets }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    if (!q) return sets;
    return sets.filter(
      (s) =>
        s.title.toLocaleLowerCase("tr-TR").includes(q) ||
        s.description.toLocaleLowerCase("tr-TR").includes(q)
    );
  }, [query, sets]);

  if (sets.length === 0) {
    return (
      <div className="surface flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-base font-semibold">Henüz çalışma setin yok</p>
        <p className="text-sm text-[color:var(--fg-muted)]">
          AI ile bir dosya yükleyerek dakikalar içinde ilk setini üret.
        </p>
        <div className="mt-2 flex gap-2">
          <Link href="/ai-workbench" className="btn btn-primary">
            AI ile oluştur
          </Link>
          <Link href="/create" className="btn btn-secondary">
            Elle ekle
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <input
          type="search"
          placeholder="Set ara…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input"
          style={{ maxWidth: "24rem" }}
        />
        <span className="chip">{filtered.length} sonuç</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((set) => (
          <Link
            key={set.id}
            href={`/set/${set.id}`}
            className="card card-hover flex h-full flex-col"
          >
            <div className="flex items-center justify-between">
              <span className="chip chip-primary">{set.cardCount} kart</span>
              <span className="text-xs text-[color:var(--fg-subtle)]">
                {dateFormatter.format(new Date(set.createdAt))}
              </span>
            </div>
            <h3 className="mt-3 text-lg font-semibold">{set.title}</h3>
            <p className="mt-1 line-clamp-3 text-sm text-[color:var(--fg-muted)]">
              {set.description || "Açıklama eklenmemiş."}
            </p>
            <div className="mt-5 flex items-center gap-2">
              <span className="btn btn-secondary btn-sm">Aç</span>
              <Link
                href={`/quiz/${set.id}`}
                onClick={(e) => e.stopPropagation()}
                className="btn btn-ghost btn-sm"
              >
                Quiz başlat
              </Link>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
