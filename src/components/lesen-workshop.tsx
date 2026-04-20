"use client";

import { useMemo, useState } from "react";
import SkillFeedbackPanel from "@/components/skill-feedback-panel";

type Lesetext = { name: string; url: string; level: string; lektion: string; topic: string };
type Wortschatz = { name: string; url: string; level: string };

const LEVELS = ["A1.1", "A1.2", "A2.1", "A2.2"] as const;
type Level = (typeof LEVELS)[number];

export default function LesenWorkshop({
  lesetexte,
  wortschatz,
}: {
  lesetexte: Lesetext[];
  wortschatz: Wortschatz[];
}) {
  const [level, setLevel] = useState<Level>("A1.1");
  const filtered = useMemo(() => lesetexte.filter((l) => l.level === level), [lesetexte, level]);
  const [activeUrl, setActiveUrl] = useState<string>("");
  const active = filtered.find((l) => l.url === activeUrl) ?? filtered[0];
  const wsForLevel = wortschatz.filter((w) => w.level === level);

  return (
    <>
      <section className="surface p-5 grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="tabs-strip" role="tablist">
            {LEVELS.map((l) => (
              <button
                key={l}
                role="tab"
                aria-selected={level === l}
                className={`tab${level === l ? " active" : ""}`}
                onClick={() => { setLevel(l); setActiveUrl(""); }}
              >
                {l}
              </button>
            ))}
          </div>
          {wsForLevel.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {wsForLevel.map((w) => (
                <a key={w.name} className="btn btn-secondary btn-sm" href={w.url} target="_blank" rel="noreferrer">
                  📒 Wortschatz {level} ↗
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <ul className="grid gap-2 md:grid-cols-2">
          {filtered.map((l) => (
            <li key={l.url}>
              <button
                type="button"
                onClick={() => setActiveUrl(l.url)}
                className={`w-full text-left surface-muted p-3 card-hover ${active?.url === l.url ? "ring-2 ring-[color:var(--primary)]" : ""}`}
              >
                <p className="text-xs text-[color:var(--fg-muted)]">{l.lektion}</p>
                <p className="font-semibold mt-1">{l.topic}</p>
              </button>
            </li>
          ))}
        </ul>

        {active ? (
          <div className="grid gap-2">
            <p className="eyebrow">Aktif Lesetext</p>
            <p className="font-display text-lg">{active.lektion} — {active.topic}</p>
            <object data={active.url} type="application/pdf" className="w-full h-[70vh] surface-muted">
              <p className="p-4 text-sm">
                Tarayıcın PDF göstermiyor.{" "}
                <a className="text-[color:var(--primary)] font-semibold" href={active.url} target="_blank" rel="noreferrer">
                  PDF&apos;i ayrı sekmede aç ↗
                </a>
              </p>
            </object>
          </div>
        ) : null}
      </section>

      <SkillFeedbackPanel
        skill="lesen"
        defaultPrompt={
          active
            ? `'${active.topic}' (${active.lektion}) metnini oku ve Almanca özetle: kim, ne, nerede, ne zaman, neden?`
            : "Okuduğun metni Almanca özetle."
        }
        level={level.startsWith("A1") ? "A1" : "A2"}
      />
    </>
  );
}
