"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { StudySetSummary } from "@/types/study";

type SetCatalogProps = {
  sets: StudySetSummary[];
};

type SortOption = "newest" | "oldest" | "cards-desc" | "cards-asc";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function SetCatalog({ sets }: SetCatalogProps) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [copiedSetId, setCopiedSetId] = useState("");

  async function copyShareLink(setId: string) {
    if (typeof window === "undefined") {
      return;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/set/${setId}`);
      setCopiedSetId(setId);
      window.setTimeout(() => {
        setCopiedSetId("");
      }, 1800);
    } catch {
      // Ignore clipboard permission errors.
    }
  }

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

    const queryMatched = normalizedQuery
      ? sets.filter(
          (set) =>
            set.title.toLocaleLowerCase("tr-TR").includes(normalizedQuery) ||
            set.description.toLocaleLowerCase("tr-TR").includes(normalizedQuery)
        )
      : sets;

    const sorted = [...queryMatched];
    sorted.sort((a, b) => {
      if (sortBy === "newest") {
        return b.createdAt.localeCompare(a.createdAt);
      }
      if (sortBy === "oldest") {
        return a.createdAt.localeCompare(b.createdAt);
      }
      if (sortBy === "cards-desc") {
        return b.cardCount - a.cardCount;
      }
      return a.cardCount - b.cardCount;
    });

    return sorted;
  }, [query, sets, sortBy]);

  return (
    <section className="mt-12">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl text-slate-900">Available Sets</h2>
          <p className="text-sm text-slate-600">{filtered.length} result</p>
        </div>
        <div className="grid w-full max-w-xl gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by set title or description"
            className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm outline-none ring-teal-500 focus:ring"
          />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortOption)}
            className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm outline-none ring-teal-500 focus:ring"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="cards-desc">Most cards</option>
            <option value="cards-asc">Fewest cards</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-slate-600">
          No set matched your search.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((set) => (
            <article
              key={set.id}
              className="flex h-full flex-col justify-between rounded-[1.8rem] border border-black/10 bg-white/80 p-6 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {dateFormatter.format(new Date(set.createdAt))}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">{set.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {set.description || "No description"}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  {set.cardCount} cards
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/set/${set.id}`}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Study
                  </Link>
                  <Link
                    href={`/quiz/${set.id}`}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    Quiz
                  </Link>
                  <button
                    type="button"
                    onClick={() => copyShareLink(set.id)}
                    className="rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
                  >
                    {copiedSetId === set.id ? "Copied" : "Share"}
                  </button>
                  <Link
                    href={`/classroom?setId=${set.id}`}
                    className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    Assign
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
