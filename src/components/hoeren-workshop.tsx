"use client";

import { useMemo, useRef, useState } from "react";
import SkillFeedbackPanel from "@/components/skill-feedback-panel";
import type { AudioCollection } from "@/lib/materials-catalog";

type TranscriptLink = { name: string; url: string; level: string };

const LEVELS = ["A1.1", "A1.2", "A2.1", "A2.2"] as const;
type Level = (typeof LEVELS)[number];

export default function HoerenWorkshop({
  collections,
  transcripts,
}: {
  collections: AudioCollection[];
  transcripts: TranscriptLink[];
}) {
  const [level, setLevel] = useState<Level>("A1.1");
  const [trackUrl, setTrackUrl] = useState<string>("");
  const [trackName, setTrackName] = useState<string>("");
  const [rate, setRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  const tracksForLevel = useMemo(
    () =>
      collections
        .filter((c) => c.level === level)
        .flatMap((c) => c.files.map((f) => ({ folder: c.folder, ...f }))),
    [collections, level],
  );

  const transcriptForLevel = transcripts.find((t) => t.level === level);

  function pickTrack(url: string, name: string) {
    setTrackUrl(url);
    setTrackName(name);
    setRate(1);
    setTimeout(() => {
      const a = audioRef.current;
      if (a) {
        a.playbackRate = 1;
        a.play().catch(() => undefined);
      }
    }, 50);
  }

  function pickRandom() {
    if (tracksForLevel.length === 0) return;
    const t = tracksForLevel[Math.floor(Math.random() * tracksForLevel.length)];
    pickTrack(t.url, t.name);
  }

  function changeRate(next: number) {
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

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
                onClick={() => setLevel(l)}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={pickRandom}>
              🎲 Rastgele kayıt
            </button>
            {transcriptForLevel ? (
              <a
                className="btn btn-secondary btn-sm"
                href={transcriptForLevel.url}
                target="_blank"
                rel="noreferrer"
              >
                Hörtext transkriptini aç ↗
              </a>
            ) : null}
          </div>
        </div>

        {trackUrl ? (
          <div className="surface-muted p-3 grid gap-2">
            <p className="eyebrow">Şu an çalan</p>
            <p className="font-semibold text-sm">{trackName.replace(/^Auf_jeden_Fall_/, "").replace(/\.mp3$/, "")}</p>
            <audio ref={audioRef} src={trackUrl} controls preload="metadata" className="w-full" />
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-[color:var(--fg-muted)]">Hız:</span>
              {[0.7, 0.85, 1, 1.15].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`btn btn-sm ${rate === r ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => changeRate(r)}
                >
                  {r}×
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[color:var(--fg-muted)]">
            {tracksForLevel.length} kayıt bulundu. Aşağıdan birini seç ya da 🎲 ile rastgele başla.
          </p>
        )}

        <details>
          <summary className="cursor-pointer text-sm font-semibold">
            Tüm {level} kayıtlarını listele ({tracksForLevel.length})
          </summary>
          <ul className="grid gap-1 mt-2 max-h-72 overflow-y-auto">
            {tracksForLevel.map((t) => (
              <li key={t.url}>
                <button
                  type="button"
                  onClick={() => pickTrack(t.url, t.name)}
                  className={`w-full text-left btn btn-sm ${trackUrl === t.url ? "btn-primary" : "btn-ghost"}`}
                >
                  ▶ {t.name.replace(/^Auf_jeden_Fall_/, "").replace(/\.mp3$/, "")}
                </button>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <SkillFeedbackPanel
        skill="hoeren"
        defaultPrompt={
          trackName
            ? `Az önce dinlediğin telc kaydını (${trackName}) Almanca özetle: ana fikir, kim konuşuyor, hangi bilgiler verildi.`
            : "Dinlediğin parçayı Almanca özetle."
        }
        level={level.startsWith("A1") ? "A1" : "A2"}
      />
    </>
  );
}
