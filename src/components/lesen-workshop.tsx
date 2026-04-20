"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SkillFeedbackPanel from "@/components/skill-feedback-panel";
import {
  ALL_LEVELS,
  type Lesetext,
  type Level,
  type Wortschatz,
} from "@/lib/materials-data";

type Props = {
  lesetexte: Lesetext[];
  wortschatz: Wortschatz[];
};

export default function LesenWorkshop({ lesetexte, wortschatz }: Props) {
  const [level, setLevel] = useState<Level>("A1.1");
  const filtered = useMemo(
    () => lesetexte.filter((l) => l.level === level).sort((a, b) => a.lektion - b.lektion),
    [lesetexte, level],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = filtered.find((l) => l.id === activeId) ?? filtered[0] ?? null;
  const wsForLevel = wortschatz.filter((w) => w.level === level);

  return (
    <section className="grid gap-6">
      <header className="surface p-6 grid gap-3">
        <span className="eyebrow">LESEN · telc A1–A2</span>
        <h1 className="h-display text-3xl">Okuma atölyesi</h1>
        <p className="text-sm text-[color:var(--fg-muted)] max-w-2xl">
          Tüm telc Lesetexte&apos;leri parse edildi ve doğrudan burada okunabilir. Bir metin seç,
          oku, ardından AI&apos;dan sana metnin içeriğine göre geri bildirim al.
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {ALL_LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              className={`btn btn-sm ${level === lv ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setLevel(lv);
                setActiveId(null);
              }}
            >
              {lv}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="surface p-4 grid gap-2 self-start sticky top-4">
          <h2 className="font-semibold text-sm">Lektionen ({filtered.length})</h2>
          <ul className="grid gap-1 max-h-[60vh] overflow-auto pr-1">
            {filtered.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(l.id)}
                  className={`w-full text-left text-sm p-2 rounded-lg transition ${
                    active?.id === l.id ? "bg-[color:var(--accent-soft)] font-semibold" : "hover:bg-[color:var(--surface-soft)]"
                  }`}
                >
                  <span className="block font-mono text-xs opacity-60">L{l.lektion}</span>
                  <span className="block">{l.topic}</span>
                  <span className="block text-xs opacity-60">{l.wordCount} kelime</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="text-xs opacity-60">Bu seviyede Lesetext bulunamadı.</li>
            ) : null}
          </ul>
        </aside>

        <div className="grid gap-5">
          {active ? (
            <article className="surface p-6 grid gap-4">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="eyebrow">{active.level} · Lektion {active.lektion}</span>
                  <h2 className="h-display text-2xl mt-1">{active.topic}</h2>
                </div>
                <a
                  href={active.url}
                  target="_blank"
                  rel="noopener"
                  className="btn btn-ghost btn-sm"
                >
                  PDF aç
                </a>
              </header>
              <pre className="whitespace-pre-wrap text-base leading-relaxed font-sans text-[color:var(--fg)]">{active.text}</pre>
            </article>
          ) : (
            <p className="surface p-6 text-sm">Bu seviye için Lesetext bulunamadı.</p>
          )}

          {active ? (
            <SkillFeedbackPanel
              skill="lesen"
              level={active.level.startsWith("A1") ? "A1" : "A2"}
              defaultPrompt={`Lies den Text "${active.topic}" und schreibe eine Zusammenfassung auf Deutsch (4–6 Sätze).`}
              contextText={active.text}
              contextLabel={`Lesetext ${active.level} L${active.lektion} – ${active.topic}`}
            />
          ) : null}

          {wsForLevel.length > 0 ? (
            <section className="surface p-5 grid gap-3">
              <header className="flex items-baseline justify-between">
                <h2 className="h-display text-xl">Bu seviye için Wortschatz</h2>
                <Link href="/wortschatz" className="btn btn-ghost btn-sm">Kelime laboratuvarına git →</Link>
              </header>
              <ul className="grid gap-1 text-sm">
                {wsForLevel.map((w) => (
                  <li key={w.id}>
                    <span className="chip chip-soft mr-2">{w.language}</span>
                    {w.entryCount} kelime · <a className="link" href={w.url} target="_blank" rel="noopener">PDF</a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
