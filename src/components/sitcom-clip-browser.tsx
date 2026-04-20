"use client";

import { useMemo, useState } from "react";
import { SITCOM_CLIPS, type SitcomClip } from "@/lib/sitcom-clips";

const LEVELS = ["Tümü", "A1", "A2", "B1", "B2"] as const;
type LevelFilter = (typeof LEVELS)[number];

export default function SitcomClipBrowser() {
  const [level, setLevel] = useState<LevelFilter>("Tümü");
  const [activeId, setActiveId] = useState<string>(SITCOM_CLIPS[0].id);

  const filtered = useMemo(
    () =>
      level === "Tümü" ? SITCOM_CLIPS : SITCOM_CLIPS.filter((c) => c.cefr === level),
    [level],
  );

  const active: SitcomClip = filtered.find((c) => c.id === activeId) ?? filtered[0];

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="surface p-3 grid gap-2 self-start">
        <div className="tabs-strip" role="tablist">
          {LEVELS.map((l) => (
            <button
              key={l}
              role="tab"
              aria-selected={level === l}
              className={`tab${level === l ? " active" : ""}`}
              onClick={() => setLevel(l)}
            >
              {l}
            </button>
          ))}
        </div>
        <ul className="grid gap-1.5 mt-1 max-h-[60vh] overflow-y-auto">
          {filtered.map((clip) => (
            <li key={clip.id}>
              <button
                type="button"
                onClick={() => setActiveId(clip.id)}
                className={`clip-row${active.id === clip.id ? " active" : ""}`}
              >
                <span className={`cefr cefr-${clip.cefr.toLowerCase()}`}>{clip.cefr}</span>
                <span className="grid text-left flex-1">
                  <span className="font-semibold text-sm">{clip.title}</span>
                  <span className="text-[11px] text-[color:var(--fg-muted)] capitalize">
                    {clip.category} · {clip.scenario}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {active ? (
        <article className="surface p-5 md:p-7 grid gap-4 animate-slide-up">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="eyebrow">{active.category} · {active.cefr}</span>
              <h3 className="h-display text-2xl mt-1">{active.title}</h3>
              <p className="text-sm text-[color:var(--fg-muted)] mt-1">{active.scenario}</p>
            </div>
            <a className="btn btn-primary btn-sm" href={active.watchUrl} target="_blank" rel="noreferrer">
              YouTube&apos;da izle ▸
            </a>
          </header>

          <div className="surface-muted p-3">
            <p className="eyebrow">Anahtar cümle</p>
            <p className="font-display text-lg mt-1">{active.highlightPhrase}</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm mt-2"
              onClick={() => speak(active.highlightPhrase)}
            >
              🔊 Dinle (de-DE)
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="eyebrow mb-1">Almanca diyalog</p>
              <pre className="surface-muted p-3 text-sm whitespace-pre-wrap font-sans">{active.transcript}</pre>
              <button
                type="button"
                className="btn btn-ghost btn-sm mt-2"
                onClick={() => speak(active.transcript)}
              >
                🔊 Tüm sahneyi oku
              </button>
            </div>
            <div>
              <p className="eyebrow mb-1">Türkçe çeviri</p>
              <pre className="surface-muted p-3 text-sm whitespace-pre-wrap font-sans">{active.translation}</pre>
            </div>
          </div>

          <div>
            <p className="eyebrow mb-2">Kelimeler</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {active.vocab.map((v) => (
                <li key={v.word} className="surface-muted p-2 text-sm flex items-center justify-between gap-2">
                  <span>
                    <strong>{v.word}</strong>
                    <span className="text-[color:var(--fg-muted)]"> — {v.meaning}</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => speak(v.word)}
                    aria-label={`${v.word} dinle`}
                  >
                    🔊
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface-muted p-3 text-sm">
            <p className="eyebrow">Dilbilgisi odağı</p>
            <p className="mt-1">{active.grammarFocus}</p>
          </div>
        </article>
      ) : null}
    </section>
  );
}
