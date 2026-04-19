"use client";

import { useMemo, useState } from "react";
import { ARTIKEL_DECK, ARTIKEL_RULES, type Article, type ArtikelItem } from "@/lib/deutsch-data";

const ARTICLES: Article[] = ["der", "die", "das"];

function shuffle<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function ArtikelTrainer() {
  const [deck, setDeck] = useState<ArtikelItem[]>(() => shuffle(ARTIKEL_DECK));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Article | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [streak, setStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const current = deck[index];
  const isCorrect = picked !== null && picked === current.article;
  const progress = useMemo(() => Math.round(((index + (picked ? 1 : 0)) / deck.length) * 100), [index, picked, deck.length]);

  function pick(a: Article) {
    if (picked) return;
    setPicked(a);
    setScore((s) => ({ correct: s.correct + (a === current.article ? 1 : 0), total: s.total + 1 }));
    setStreak((s) => (a === current.article ? s + 1 : 0));
  }

  function next() {
    if (index + 1 >= deck.length) {
      setDeck(shuffle(ARTIKEL_DECK));
      setIndex(0);
    } else {
      setIndex((i) => i + 1);
    }
    setPicked(null);
    setShowHint(false);
  }

  function reset() {
    setDeck(shuffle(ARTIKEL_DECK));
    setIndex(0);
    setPicked(null);
    setScore({ correct: 0, total: 0 });
    setStreak(0);
    setShowHint(false);
  }

  return (
    <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
      <section className="surface p-5 md:p-7 animate-slide-up">
        <div className="flex items-center justify-between gap-3">
          <span className="eyebrow">der · die · das</span>
          <span className="chip">{index + 1} / {deck.length}</span>
        </div>

        <div className="mt-3 progress" aria-hidden>
          <span style={{ width: `${progress}%` }} />
        </div>

        <h2 className="h-display mt-6 text-4xl md:text-5xl">
          ____ <span style={{ color: "var(--primary)" }}>{current.noun}</span>
        </h2>
        <p className="mt-2 text-sm text-[color:var(--fg-muted)]">{current.meaning}{current.plural ? ` · çoğul: ${current.plural}` : ""}</p>

        <div className="mt-7 grid grid-cols-3 gap-3">
          {ARTICLES.map((a) => {
            const isAnswer = a === current.article;
            const isPicked = picked === a;
            let cls = "btn btn-secondary btn-lg";
            if (picked) {
              if (isAnswer) cls = "btn btn-lg" ;
              else if (isPicked) cls = "btn btn-danger btn-lg";
              else cls = "btn btn-secondary btn-lg opacity-60";
            }
            return (
              <button
                key={a}
                type="button"
                onClick={() => pick(a)}
                className={cls}
                style={picked && isAnswer ? { background: "var(--success)", color: "white", borderColor: "transparent" } : undefined}
                aria-pressed={isPicked}
              >
                {a}
              </button>
            );
          })}
        </div>

        {picked ? (
          <div
            className={`mt-5 rounded-[var(--radius-md)] border p-4 text-sm animate-pop ${
              isCorrect
                ? "border-[color:var(--success)] bg-[color:color-mix(in_oklab,var(--success)_10%,transparent)]"
                : "border-[color:var(--danger)] bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)]"
            }`}
            role="status"
          >
            <p className="font-semibold">
              {isCorrect ? "Doğru!" : "Olmadı."} → <span className="underline">{current.article}</span> {current.noun}
            </p>
            {current.hint ? (
              <p className="mt-1 text-[color:var(--fg-muted)]">İpucu: {current.hint}</p>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-sm mt-5"
            onClick={() => setShowHint((v) => !v)}
          >
            {showHint ? "İpucunu gizle" : "İpucu göster"}
          </button>
        )}

        {!picked && showHint && current.hint ? (
          <p className="mt-2 text-sm text-[color:var(--fg-muted)]">{current.hint}</p>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>Yeniden karıştır</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={next}
            disabled={!picked}
          >
            Sonraki →
          </button>
        </div>
      </section>

      <aside className="grid content-start gap-4">
        <div className="surface p-5">
          <p className="eyebrow">Skor</p>
          <p className="mt-2 text-3xl font-bold">
            {score.correct}<span className="text-[color:var(--fg-subtle)] text-base"> / {score.total}</span>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="stat">
              <span className="stat-label">Seri</span>
              <span className="stat-value">{streak}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Doğruluk</span>
              <span className="stat-value">
                {score.total === 0 ? "—" : `${Math.round((score.correct / score.total) * 100)}%`}
              </span>
            </div>
          </div>
        </div>

        <div className="surface p-5">
          <p className="eyebrow">Faustregeln</p>
          <div className="mt-3 grid gap-3">
            {ARTIKEL_RULES.map((rule) => (
              <div key={rule.article} className="surface-muted p-3">
                <p className="text-sm font-semibold">
                  <span className={`cefr cefr-${rule.article === "der" ? "a1" : rule.article === "die" ? "a2" : "b1"}`}>{rule.article}</span>
                  {" "}için ipuçları
                </p>
                <ul className="mt-2 grid gap-1 text-sm text-[color:var(--fg-muted)]">
                  {rule.items.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
