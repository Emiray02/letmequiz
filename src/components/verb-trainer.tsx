"use client";

import { useMemo, useState } from "react";
import {
  PRONOUN_LABEL,
  VERB_DECK,
  type Pronoun,
  type VerbEntry,
} from "@/lib/deutsch-data";

const PRONOUNS: Pronoun[] = ["ich", "du", "er", "wir", "ihr", "sie"];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function nextChallenge(filter: VerbEntry[]) {
  const verb = pickRandom(filter);
  const pronoun = pickRandom(PRONOUNS);
  return { verb, pronoun };
}

const TYPES = ["tümü", "yardımcı", "modal", "düzenli", "düzensiz"] as const;
type Filter = (typeof TYPES)[number];

export default function VerbTrainer() {
  const [filter, setFilter] = useState<Filter>("tümü");
  const filtered = useMemo(
    () => (filter === "tümü" ? VERB_DECK : VERB_DECK.filter((v) => v.type === filter)),
    [filter],
  );
  const [{ verb, pronoun }, setChallenge] = useState(() => nextChallenge(VERB_DECK));
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"" | "correct" | "wrong">("");
  const [score, setScore] = useState({ correct: 0, total: 0 });

  function check(e: React.FormEvent) {
    e.preventDefault();
    if (result) return;
    const expected = verb.forms[pronoun].toLowerCase();
    const got = answer.trim().toLowerCase();
    const ok = got === expected;
    setResult(ok ? "correct" : "wrong");
    setScore((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1 }));
  }

  function next() {
    const list = filter === "tümü" ? VERB_DECK : filtered;
    setChallenge(nextChallenge(list));
    setAnswer("");
    setResult("");
  }

  function changeFilter(f: Filter) {
    setFilter(f);
    const list = f === "tümü" ? VERB_DECK : VERB_DECK.filter((v) => v.type === f);
    setChallenge(nextChallenge(list));
    setAnswer("");
    setResult("");
  }

  const correctForm = verb.forms[pronoun];

  return (
    <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
      <section className="surface p-5 md:p-7 animate-slide-up">
        <div className="flex items-center justify-between gap-3">
          <span className="eyebrow">Präsens — Çekim alıştırması</span>
          <div className="tabs-strip" role="tablist">
            {TYPES.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={filter === t}
                className={`tab${filter === t ? " active" : ""}`}
                onClick={() => changeFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 surface-muted p-5 text-center">
          <p className="text-sm text-[color:var(--fg-muted)]">{verb.meaning} · <span className="chip">{verb.type}</span></p>
          <p className="mt-2 text-xl font-semibold">
            <span className="text-[color:var(--fg-muted)]">{PRONOUN_LABEL[pronoun]}</span>{" "}
            <span style={{ color: "var(--primary)" }}>____</span>{" "}
            <span className="text-[color:var(--fg-muted)]">({verb.infinitive})</span>
          </p>
        </div>

        <form onSubmit={check} className="mt-5 grid gap-3">
          <input
            className="input text-center text-lg"
            placeholder="çekimli formu yaz..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={result !== ""}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <div className="flex items-center justify-between gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={next}>Atla</button>
            {result === "" ? (
              <button type="submit" className="btn btn-primary">Kontrol et</button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={next}>Sonraki →</button>
            )}
          </div>
        </form>

        {result ? (
          <div
            className={`mt-5 rounded-[var(--radius-md)] border p-4 text-sm animate-pop ${
              result === "correct"
                ? "border-[color:var(--success)] bg-[color:color-mix(in_oklab,var(--success)_10%,transparent)]"
                : "border-[color:var(--danger)] bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)]"
            }`}
          >
            <p className="font-semibold">
              {result === "correct" ? "Bravo!" : "Doğru cevap:"} <span className="underline">{PRONOUN_LABEL[pronoun]} {correctForm}</span>
            </p>
          </div>
        ) : null}
      </section>

      <aside className="grid content-start gap-4">
        <div className="surface p-5">
          <p className="eyebrow">Skor</p>
          <p className="mt-2 text-3xl font-bold">
            {score.correct}<span className="text-[color:var(--fg-subtle)] text-base"> / {score.total}</span>
          </p>
        </div>

        <div className="surface p-5">
          <p className="eyebrow">Tüm formlar — {verb.infinitive}</p>
          <ul className="mt-3 grid gap-1 text-sm">
            {PRONOUNS.map((p) => {
              // Hide the form for the currently-asked pronoun until the user submits,
              // otherwise the sidebar spoils the answer.
              const isCurrent = p === pronoun;
              const reveal = !isCurrent || result !== "";
              return (
                <li key={p} className="flex items-center justify-between border-b border-[color:var(--border)] py-1 last:border-0">
                  <span className="text-[color:var(--fg-muted)]">{PRONOUN_LABEL[p]}</span>
                  <span className="font-semibold">
                    {reveal ? verb.forms[p] : <span className="text-[color:var(--fg-subtle)]">———</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          {result === "" ? (
            <p className="mt-2 text-xs text-[color:var(--fg-subtle)]">
              Sorulan zamirin cevabı kontrolden sonra açılır.
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
