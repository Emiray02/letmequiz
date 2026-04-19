"use client";

import { useEffect, useMemo, useState } from "react";
import { DIKTAT_DECK, type DiktatItem } from "@/lib/deutsch-data";

function speak(text: string, rate = 0.9) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  u.rate = rate;
  const voices = window.speechSynthesis.getVoices();
  const de = voices.find((v) => v.lang.startsWith("de"));
  if (de) u.voice = de;
  window.speechSynthesis.speak(u);
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss")
    .replace(/[.,!?;:"'„“”()-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function diff(a: string, b: string): { ok: boolean; right: number; total: number } {
  const aw = normalize(a).split(" ");
  const bw = normalize(b).split(" ");
  const total = Math.max(aw.length, bw.length);
  let right = 0;
  for (let i = 0; i < total; i++) if (aw[i] && bw[i] && aw[i] === bw[i]) right++;
  return { ok: normalize(a) === normalize(b), right, total };
}

const LEVELS = ["Tümü", "A1", "A2", "B1"] as const;
type LevelFilter = (typeof LEVELS)[number];

export default function DiktatPlayer() {
  const [level, setLevel] = useState<LevelFilter>("Tümü");
  return <DiktatInner key={level} level={level} onLevelChange={setLevel} />;
}

function DiktatInner({ level, onLevelChange }: { level: LevelFilter; onLevelChange: (l: LevelFilter) => void }) {
  const filtered = useMemo<DiktatItem[]>(
    () => (level === "Tümü" ? DIKTAT_DECK : DIKTAT_DECK.filter((d) => d.level === level)),
    [level],
  );
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);

  const current = filtered[index] ?? filtered[0];

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    function onVoices() { setVoicesReady(window.speechSynthesis.getVoices().length > 0); }
    onVoices();
    window.speechSynthesis.addEventListener("voiceschanged", onVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
  }, []);

  if (!current) return null;

  const result = revealed ? diff(text, current.text) : null;

  function next() {
    setIndex((i) => (i + 1) % filtered.length);
    setText("");
    setRevealed(false);
  }

  return (
    <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
      <section className="surface p-5 md:p-7 animate-slide-up">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="eyebrow">Diktat — Dinle ve yaz</span>
          <div className="tabs-strip" role="tablist">
            {LEVELS.map((l) => (
              <button
                key={l}
                role="tab"
                aria-selected={level === l}
                className={`tab${level === l ? " active" : ""}`}
                onClick={() => onLevelChange(l)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => speak(current.text, 0.95)}
              disabled={!voicesReady}
            >
              ▶ Normal hız
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => speak(current.text, 0.7)}
              disabled={!voicesReady}
            >
              ◐ Yavaş
            </button>
            <span className="chip">{current.level}</span>
            {!voicesReady ? (
              <span className="chip chip-warning">
                <span className="status-dot warn" /> Tarayıcı sesleri yükleniyor
              </span>
            ) : null}
          </div>

          <textarea
            className="textarea"
            placeholder="Duyduklarını buraya yaz..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            rows={3}
          />

          <div className="flex items-center justify-between gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={next}>Atla →</button>
            {!revealed ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setRevealed(true)}
                disabled={text.trim().length === 0}
              >
                Cevabı kontrol et
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={next}>Sonraki cümle →</button>
            )}
          </div>
        </div>

        {revealed ? (
          <div className="mt-5 grid gap-3">
            <div
              className={`rounded-[var(--radius-md)] border p-4 text-sm animate-pop ${
                result?.ok
                  ? "border-[color:var(--success)] bg-[color:color-mix(in_oklab,var(--success)_10%,transparent)]"
                  : "border-[color:var(--warning)] bg-[color:color-mix(in_oklab,var(--warning)_10%,transparent)]"
              }`}
            >
              <p className="font-semibold">
                {result?.ok
                  ? "Mükemmel — kelime kelime doğru!"
                  : `Yaklaştın: ${result?.right}/${result?.total} kelime tutuyor.`}
              </p>
            </div>
            <div className="surface-muted p-4">
              <p className="eyebrow">Doğru cümle</p>
              <p className="mt-1 font-semibold">{current.text}</p>
            </div>
          </div>
        ) : null}

        {current.hint ? <p className="help mt-3">İpucu: {current.hint}</p> : null}
      </section>

      <aside className="surface p-5">
        <p className="eyebrow">Diktat ipuçları</p>
        <ul className="mt-3 grid gap-2 text-sm text-[color:var(--fg-muted)]">
          <li>• Önce cümleyi 2 kez dinle, sonra yazmaya başla.</li>
          <li>• Anlaşılmayan kelime için “Yavaş” butonunu kullan.</li>
          <li>• Almanca büyük/küçük harf duyarsız değerlendirilir.</li>
          <li>• ä/ö/ü/ß yazamazsan ae/oe/ue/ss kabul edilir.</li>
          <li>• Noktalama dikkate alınmaz.</li>
        </ul>
      </aside>
    </div>
  );
}
