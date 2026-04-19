"use client";

import { useMemo, useState } from "react";
import { SENTENCE_DECK, type SentenceItem } from "@/lib/deutsch-data";

function shuffle<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const LEVELS = ["Tümü", "A1", "A2", "B1"] as const;
type LevelFilter = (typeof LEVELS)[number];

export default function SentenceBuilder() {
  const [level, setLevel] = useState<LevelFilter>("Tümü");
  const [index, setIndex] = useState(0);
  const filtered = useMemo<SentenceItem[]>(
    () => (level === "Tümü" ? SENTENCE_DECK : SENTENCE_DECK.filter((s) => s.level === level)),
    [level],
  );
  const current = filtered[index % filtered.length] ?? filtered[0];
  return (
    <SentenceInner
      key={`${level}-${current.sentence}`}
      current={current}
      level={level}
      onLevel={(l) => { setLevel(l); setIndex(0); }}
      onNext={() => setIndex((i) => (i + 1) % filtered.length)}
    />
  );
}

function SentenceInner({
  current,
  level,
  onLevel,
  onNext,
}: {
  current: SentenceItem;
  level: LevelFilter;
  onLevel: (l: LevelFilter) => void;
  onNext: () => void;
}) {
  const [pool, setPool] = useState<string[]>(() => shuffle(current.parts));
  const [picked, setPicked] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);

  function pickPart(p: string, i: number) {
    setPool((arr) => arr.filter((_, idx) => idx !== i));
    setPicked((arr) => [...arr, p]);
  }

  function unpick(i: number) {
    if (revealed) return;
    setPicked((arr) => {
      const removed = arr[i];
      setPool((p) => [...p, removed]);
      return arr.filter((_, idx) => idx !== i);
    });
  }

  function check() {
    setRevealed(true);
  }

  const built = picked.join(" ");
  const isCorrect = revealed && built.replace(/\s+/g, " ").trim() === current.sentence;

  return (
    <section className="surface p-5 md:p-7 animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="eyebrow">Sätze bauen — Cümle kur</span>
        <div className="tabs-strip" role="tablist">
          {LEVELS.map((l) => (
            <button
              key={l}
              role="tab"
              aria-selected={level === l}
              className={`tab${level === l ? " active" : ""}`}
              onClick={() => onLevel(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-5 text-sm text-[color:var(--fg-muted)]">Anlam: <span className="text-[color:var(--fg)] font-medium">{current.translation}</span></p>

      <div className="mt-4 surface-muted p-4 min-h-[4rem] flex flex-wrap gap-2">
        {picked.length === 0 ? (
          <span className="text-sm text-[color:var(--fg-subtle)]">Kelimeleri seçerek cümleyi sırala…</span>
        ) : (
          picked.map((p, i) => (
            <button key={`${p}-${i}`} type="button" className="chip chip-primary" onClick={() => unpick(i)}>
              {p}
            </button>
          ))
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {pool.map((p, i) => (
          <button key={`${p}-${i}`} type="button" className="chip" onClick={() => pickPart(p, i)} disabled={revealed}>
            + {p}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setPool(shuffle(current.parts)); setPicked([]); setRevealed(false); }}>
          Sıfırla
        </button>
        {!revealed ? (
          <button type="button" className="btn btn-primary" onClick={check} disabled={pool.length > 0}>
            Kontrol et
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onNext}>Sonraki →</button>
        )}
      </div>

      {revealed ? (
        <div
          className={`mt-5 rounded-[var(--radius-md)] border p-4 text-sm animate-pop ${
            isCorrect
              ? "border-[color:var(--success)] bg-[color:color-mix(in_oklab,var(--success)_10%,transparent)]"
              : "border-[color:var(--warning)] bg-[color:color-mix(in_oklab,var(--warning)_10%,transparent)]"
          }`}
        >
          <p className="font-semibold">{isCorrect ? "Bravo!" : "Doğru sıra:"} <span className="underline">{current.sentence}</span></p>
        </div>
      ) : null}
    </section>
  );
}
