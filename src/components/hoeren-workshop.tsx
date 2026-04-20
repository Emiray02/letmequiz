"use client";

import { useMemo, useState } from "react";
import SkillFeedbackPanel from "@/components/skill-feedback-panel";
import {
  ALL_LEVELS,
  type Hoertext,
  type Level,
} from "@/lib/materials-data";

type FlatTrack = { level: string; folder: string; folderUrl: string; trackName: string; url: string };

type Props = {
  hoertexte: Hoertext[];
  audio: FlatTrack[];
};

function trackNumberOf(h: Hoertext): number | null {
  const m = h.track.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function findAudioUrl(level: Level, trackNum: number | null, audio: FlatTrack[]): string | null {
  if (trackNum == null) return null;
  const padded = String(trackNum).padStart(3, "0");
  const lvlKey = level.replace(".", "_");
  const match = audio.find(
    (a) => a.folder.includes(lvlKey) && a.trackName.includes(`Track_${padded}`),
  );
  return match?.url ?? null;
}

export default function HoerenWorkshop({ hoertexte, audio }: Props) {
  const [level, setLevel] = useState<Level>("A1.1");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () =>
      hoertexte
        .filter((h) => h.level === level)
        .sort((a, b) => {
          if (a.lektion !== b.lektion) return a.lektion - b.lektion;
          return a.aufgabe.localeCompare(b.aufgabe);
        }),
    [hoertexte, level],
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = filtered.find((h) => h.id === activeId) ?? filtered[0] ?? null;
  const activeAudioUrl = active ? findAudioUrl(active.level, trackNumberOf(active), audio) : null;
  const isRevealed = active ? revealed.has(active.id) : false;

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="grid gap-6">
      <header className="surface p-6 grid gap-3">
        <span className="eyebrow">HÖREN · telc A1–A2</span>
        <h1 className="h-display text-3xl">Dinleme atölyesi</h1>
        <p className="text-sm text-[color:var(--fg-muted)] max-w-2xl">
          {hoertexte.length} Hörtext transkripti parsedu, mp3&apos;ler eşleştirildi. Önce dinle,
          sonra duyduğunu Almanca yeniden anlat ve AI&apos;dan kaynak metne göre geri bildirim al.
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
          <h2 className="font-semibold text-sm">Aufgaben ({filtered.length})</h2>
          <ul className="grid gap-1 max-h-[70vh] overflow-auto pr-1">
            {filtered.map((h) => {
              const tNum = trackNumberOf(h);
              const hasAudio = findAudioUrl(h.level, tNum, audio) != null;
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(h.id)}
                    className={`w-full text-left text-sm p-2 rounded-lg transition ${
                      active?.id === h.id ? "bg-[color:var(--accent-soft)] font-semibold" : "hover:bg-[color:var(--surface-soft)]"
                    }`}
                  >
                    <span className="block font-mono text-xs opacity-60">
                      L{h.lektion} · A{h.aufgabe} · {h.track} {hasAudio ? "🔊" : ""}
                    </span>
                    <span className="block text-xs opacity-70">{h.wordCount} kelime</span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className="text-xs opacity-60">Bu seviyede Hörtext yok.</li>
            ) : null}
          </ul>
        </aside>

        <div className="grid gap-5">
          {active ? (
            <article className="surface p-6 grid gap-4">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="eyebrow">
                    {active.level} · Lektion {active.lektion} · Aufgabe {active.aufgabe}
                  </span>
                  <h2 className="h-display text-2xl mt-1">{active.track}</h2>
                </div>
                <a
                  href={active.url}
                  target="_blank"
                  rel="noopener"
                  className="btn btn-ghost btn-sm"
                >
                  Transkript PDF
                </a>
              </header>

              {activeAudioUrl ? (
                <audio key={active.id} controls preload="none" className="w-full">
                  <source src={activeAudioUrl} type="audio/mpeg" />
                </audio>
              ) : (
                <p className="text-xs opacity-60">
                  Bu Aufgabe için mp3 eşleşmesi bulunamadı (sadece transkript var).
                </p>
              )}

              <div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => toggleReveal(active.id)}
                >
                  {isRevealed ? "Transkripti gizle" : "Transkripti göster"}
                </button>
                {isRevealed ? (
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans mt-3">{active.text}</pre>
                ) : null}
              </div>
            </article>
          ) : (
            <p className="surface p-6 text-sm">Bu seviye için Hörtext bulunamadı.</p>
          )}

          {active ? (
            <SkillFeedbackPanel
              skill="hoeren"
              level={active.level.startsWith("A1") ? "A1" : "A2"}
              defaultPrompt={`Höre den Track ${active.track} (${active.level} Lektion ${active.lektion}, Aufgabe ${active.aufgabe}) und fasse den Inhalt auf Deutsch zusammen.`}
              contextText={active.text}
              contextLabel={`Hörtext ${active.level} L${active.lektion} A${active.aufgabe} (${active.track})`}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
