"use client";

import { useEffect, useRef, useState } from "react";

const PAIRS: Array<{ a: string; b: string; trA: string; trB: string; tip: string }> = [
  { a: "Bett",   b: "Bett",   trA: "yatak",        trB: "yatak (uzun)", tip: "Aslında aynı kelime; örnek olarak Vater/Vetter ve schon/schön ile başla." },
  { a: "schon",  b: "schön",  trA: "zaten",        trB: "güzel",        tip: "ö = dudaklar 'o' der, dil 'e' der." },
  { a: "Hütte",  b: "Hüte",   trA: "kulübe",       trB: "şapkalar",     tip: "Çift ünsüzden önce kısa ü, tek ünsüzden önce uzun ü." },
  { a: "Mutter", b: "Mütter", trA: "anne",         trB: "anneler (çoğul)", tip: "Umlaut çoğul ve şeklen küçücük dudak yuvarlama." },
  { a: "Vater",  b: "Vetter", trA: "baba",         trB: "kuzen",        tip: "a açık, e dilin önde." },
  { a: "Tier",   b: "Tür",    trA: "hayvan",       trB: "kapı",         tip: "ie uzun i, ü dudak yuvarlak i." },
  { a: "kann",   b: "Kahn",   trA: "yapabilir",    trB: "kayık",        tip: "kısa a (kann) — uzun a (Kahn)." },
  { a: "Hölle",  b: "Höhle",  trA: "cehennem",     trB: "mağara",       tip: "kısa ö çift l — uzun ö h-uzatma + tek l." },
  { a: "Stadt",  b: "Staat",  trA: "şehir",        trB: "devlet",       tip: "kısa a — uzun aa." },
  { a: "Wahl",   b: "Wal",    trA: "seçim",        trB: "balina",       tip: "her ikisi uzun a; tonlama farkı." },
];

type RecResultEvent = { results: ArrayLike<{ 0: { transcript: string; confidence: number }; isFinal: boolean }> };
type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: RecResultEvent) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onend: (() => void) | null;
};
type RecCtor = new () => Recognition;
type WinWithSR = Window & { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };

function speak(text: string, rate = 0.9) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE"; u.rate = rate;
  window.speechSynthesis.speak(u);
}

function similar(a: string, b: string): number {
  const x = a.toLowerCase().trim(), y = b.toLowerCase().trim();
  if (!x || !y) return 0;
  if (x === y) return 1;
  // simple Dice coefficient on bigrams
  const big = (s: string) => { const r: string[] = []; for (let i = 0; i < s.length - 1; i++) r.push(s.slice(i, i+2)); return r; };
  const xb = big(x), yb = big(y);
  if (xb.length === 0 || yb.length === 0) return 0;
  const set = new Set(yb);
  let hits = 0;
  for (const t of xb) if (set.has(t)) hits++;
  return (2 * hits) / (xb.length + yb.length);
}

export default function AusprachePage() {
  const [idx, setIdx] = useState(0);
  const [target, setTarget] = useState<"a" | "b">("a");
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<Recognition | null>(null);

  useEffect(() => {
    const w = window as WinWithSR;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const r: Recognition = new SR();
    r.lang = "de-DE"; r.interimResults = false; r.maxAlternatives = 3; r.continuous = false;
    r.onresult = (ev) => {
      const t = ev.results[0]?.[0]?.transcript ?? "";
      setTranscript(t);
      const targetWord = target === "a" ? PAIRS[idx].a : PAIRS[idx].b;
      setScore(Math.round(similar(t, targetWord) * 100));
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recRef.current = r;
    return () => { try { r.stop(); } catch {} };
  }, [idx, target]);

  function record() {
    if (!recRef.current) return;
    setTranscript(""); setScore(null); setListening(true);
    try { recRef.current.start(); } catch { setListening(false); }
  }

  const p = PAIRS[idx];
  const targetWord = target === "a" ? p.a : p.b;

  return (
    <>
      <header className="mb-6">
        <span className="chip chip-accent">Aussprache · Minimal Pairs</span>
        <h1 className="h-display mt-3 text-3xl md:text-4xl">Telaffuz çiftleri</h1>
        <p className="section-subtitle">Türk öğrencilerin en zorlandığı ses çiftleri. Dinle → tekrarla → tarayıcı puanlasın.</p>
      </header>

      {!supported ? (
        <div className="surface-muted p-4 chip-warning">Tarayıcın konuşma tanımayı desteklemiyor. Chrome / Edge masaüstünde dene.</div>
      ) : null}

      <section className="surface p-6 grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <button type="button" onClick={() => { setTarget("a"); speak(p.a); }} className={`card-hover tile ${target === "a" ? "border-[color:var(--primary)]" : ""}`}>
            <span className="eyebrow">A</span>
            <span className="text-3xl font-bold">{p.a}</span>
            <span className="text-sm text-[color:var(--fg-muted)]">{p.trA}</span>
            <span className="mt-auto text-xs text-[color:var(--primary)]">▶ Dinle ve hedef yap</span>
          </button>
          <button type="button" onClick={() => { setTarget("b"); speak(p.b); }} className={`card-hover tile ${target === "b" ? "border-[color:var(--primary)]" : ""}`}>
            <span className="eyebrow">B</span>
            <span className="text-3xl font-bold">{p.b}</span>
            <span className="text-sm text-[color:var(--fg-muted)]">{p.trB}</span>
            <span className="mt-auto text-xs text-[color:var(--primary)]">▶ Dinle ve hedef yap</span>
          </button>
        </div>

        <div className="surface-soft p-4">
          <p className="eyebrow">İpucu</p>
          <p className="mt-1 text-sm">{p.tip}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" disabled={!supported || listening} onClick={record}>
            {listening ? "🎤 Dinliyor…" : `🎤 "${targetWord}" söyle`}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => speak(targetWord, 0.7)}>Yavaş tekrar</button>
          <button type="button" className="btn btn-ghost" onClick={() => { setIdx((idx + 1) % PAIRS.length); setTranscript(""); setScore(null); }}>
            Sonraki çift →
          </button>
        </div>

        {transcript ? (
          <div className="surface-soft p-4">
            <p className="text-sm"><span className="text-[color:var(--fg-muted)]">Algılanan:</span> <strong>{transcript}</strong></p>
            {score !== null ? (
              <p className="mt-1 text-sm">
                Benzerlik: <strong style={{ color: score > 80 ? "var(--success)" : score > 50 ? "var(--warning)" : "var(--danger)" }}>{score}%</strong>
                {score > 80 ? " ✓ Çok iyi!" : score > 50 ? " — biraz daha vurgu" : " — tekrar dene"}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <p className="mt-3 text-xs text-[color:var(--fg-muted)]">{idx + 1} / {PAIRS.length} çift</p>
    </>
  );
}
