"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ALL_LEVELS,
  type Level,
  type WortschatzEntry,
  bilingualEntries,
} from "@/lib/materials-data";
import { nextReviewIntervalDays } from "@/lib/scientific-methods";

type Mode = "browse" | "quiz";
type QuizDirection = "de2tr" | "tr2de" | "article";

type CardState = {
  intervalDays: number;
  easeFactor: number;
  due: number; // ms epoch
  reps: number;
};

const STORAGE_KEY = "letmequiz.wortschatz.srs";

function loadSrs(): Record<string, CardState> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveSrs(state: Record<string, CardState>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function entryKey(e: WortschatzEntry, idx: number): string {
  return `${e.word ?? e.de ?? "?"}|${e.tr ?? ""}|${idx}`;
}

function frontText(e: WortschatzEntry, dir: QuizDirection): string {
  if (dir === "tr2de") return e.tr ?? "";
  if (dir === "article") return e.word ?? e.de ?? "";
  // de2tr
  const head = e.artikel ? `${e.artikel} ${e.word ?? ""}` : (e.word ?? e.de ?? "");
  return head + (e.plural ? `, ${e.plural}` : "");
}

function backText(e: WortschatzEntry, dir: QuizDirection): string {
  if (dir === "article") return e.artikel ?? "(?)";
  if (dir === "tr2de") {
    const head = e.artikel ? `${e.artikel} ${e.word ?? ""}` : (e.word ?? e.de ?? "");
    return head + (e.plural ? `, ${e.plural}` : "");
  }
  return e.tr ?? "";
}

export default function WortschatzLab() {
  const [level, setLevel] = useState<Level | "Tümü">("A1.2");
  const [mode, setMode] = useState<Mode>("browse");
  const [dir, setDir] = useState<QuizDirection>("de2tr");
  const [search, setSearch] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [index, setIndex] = useState(0);
  const [srs, setSrs] = useState<Record<string, CardState>>({});

  useEffect(() => {
    setSrs(loadSrs());
  }, []);

  const allEntries = useMemo(() => {
    const lvl = level === "Tümü" ? undefined : level;
    return bilingualEntries(lvl);
  }, [level]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allEntries;
    return allEntries.filter((e) =>
      [e.word, e.de, e.tr, e.plural, e.artikel]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q)),
    );
  }, [allEntries, search]);

  const articleEntries = useMemo(
    () => filtered.filter((e) => e.artikel && e.word),
    [filtered],
  );

  const quizPool = dir === "article" ? articleEntries : filtered;
  const safeIndex = quizPool.length === 0 ? 0 : index % quizPool.length;
  const current = quizPool[safeIndex];
  const cardId = current ? entryKey(current, safeIndex) : "";

  function rate(quality: number) {
    if (!current) return;
    const prev = srs[cardId] ?? { intervalDays: 0, easeFactor: 2.5, due: 0, reps: 0 };
    const next = nextReviewIntervalDays(prev.intervalDays, prev.easeFactor, quality);
    const updated: Record<string, CardState> = {
      ...srs,
      [cardId]: {
        intervalDays: next.intervalDays,
        easeFactor: next.easeFactor,
        due: Date.now() + next.intervalDays * 86400_000,
        reps: prev.reps + 1,
      },
    };
    setSrs(updated);
    saveSrs(updated);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  const dueCount = useMemo(() => {
    const now = Date.now();
    return Object.values(srs).filter((s) => s.due <= now).length;
  }, [srs]);

  return (
    <section className="grid gap-6">
      <header className="surface p-6 grid gap-3">
        <span className="eyebrow">WORTSCHATZ · telc A1–A2 (DE↔TR)</span>
        <h1 className="h-display text-3xl">Kelime laboratuvarı</h1>
        <p className="text-sm text-[color:var(--fg-muted)] max-w-2xl">
          telc PDF&apos;lerinden parsed {allEntries.length.toLocaleString("tr-TR")}+ DE↔TR kelime.
          Aralıklı tekrar (SRS) ile çalış: artikel tahmini, anlam testi veya gözat.
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {(["Tümü", ...ALL_LEVELS] as const).map((lv) => (
            <button
              key={lv}
              type="button"
              className={`btn btn-sm ${level === lv ? "btn-primary" : "btn-ghost"}`}
              onClick={() => { setLevel(lv); setIndex(0); setRevealed(false); }}
            >
              {lv}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-xs opacity-60">Mod:</span>
          <button type="button" className={`btn btn-sm ${mode === "browse" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("browse")}>📚 Gözat</button>
          <button type="button" className={`btn btn-sm ${mode === "quiz" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("quiz")}>🎯 Quiz (SRS)</button>
          {mode === "quiz" ? (
            <>
              <span className="ml-3 text-xs opacity-60">Yön:</span>
              <select className="input input-sm w-auto" value={dir} onChange={(e) => { setDir(e.target.value as QuizDirection); setIndex(0); setRevealed(false); }}>
                <option value="de2tr">DE → TR</option>
                <option value="tr2de">TR → DE</option>
                <option value="article">Artikel tahmin (der/die/das)</option>
              </select>
              <span className="chip chip-soft ml-2">Vadesi gelen: {dueCount}</span>
            </>
          ) : null}
        </div>
      </header>

      {mode === "browse" ? (
        <div className="surface p-5 grid gap-3">
          <input
            className="input"
            placeholder="Ara: Almanca, Türkçe, artikel…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <p className="text-xs opacity-60">{filtered.length.toLocaleString("tr-TR")} sonuç</p>
          <div className="overflow-auto max-h-[70vh] border border-[color:var(--border)] rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[color:var(--surface)]">
                <tr className="text-left">
                  <th className="p-2">Artikel</th>
                  <th className="p-2">Almanca</th>
                  <th className="p-2">Çoğul</th>
                  <th className="p-2">Türkçe</th>
                  <th className="p-2">Lekt.</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 1500).map((e, i) => (
                  <tr key={i} className="border-t border-[color:var(--border-muted)]">
                    <td className="p-2 font-mono">{e.artikel ?? ""}</td>
                    <td className="p-2 font-semibold">{e.word ?? e.de ?? ""}</td>
                    <td className="p-2 opacity-70">{e.plural ?? ""}</td>
                    <td className="p-2">{e.tr ?? ""}</td>
                    <td className="p-2 text-xs opacity-60">{e.lektion ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 1500 ? (
              <p className="p-2 text-xs opacity-60">İlk 1500 gösteriliyor — daha dar bir arama yap.</p>
            ) : null}
          </div>
        </div>
      ) : current ? (
        <div className="surface p-8 grid gap-6 text-center">
          <p className="text-xs opacity-60">{safeIndex + 1} / {quizPool.length} · {dir.toUpperCase()}</p>
          <h2 className="h-display text-4xl">{frontText(current, dir)}</h2>
          {revealed ? (
            <p className="text-2xl text-[color:var(--accent)] font-semibold">{backText(current, dir)}</p>
          ) : (
            <button type="button" className="btn btn-primary mx-auto" onClick={() => setRevealed(true)}>
              Cevabı göster
            </button>
          )}
          {revealed ? (
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" className="btn btn-danger" onClick={() => rate(1)}>😵 Bilmedim</button>
              <button type="button" className="btn btn-secondary" onClick={() => rate(3)}>🤔 Zorlandım</button>
              <button type="button" className="btn btn-primary" onClick={() => rate(4)}>👍 İyi</button>
              <button type="button" className="btn btn-success" onClick={() => rate(5)}>⚡ Kolay</button>
            </div>
          ) : (
            <button type="button" className="btn btn-ghost mx-auto" onClick={() => { setRevealed(false); setIndex((i) => i + 1); }}>
              Geç →
            </button>
          )}
          {current.lektion ? (
            <p className="text-xs opacity-60">Kaynak: Lektion {current.lektion}</p>
          ) : null}
        </div>
      ) : (
        <p className="surface p-6 text-sm">Bu seviyede DE↔TR çiftli kelime bulunamadı.</p>
      )}
    </section>
  );
}
