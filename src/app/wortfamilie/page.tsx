"use client";

import { useState } from "react";

type Family = {
  root: string;
  trMeaning: string;
  members: Array<{ word: string; type: string; trMeaning: string; exampleDe: string; exampleTr: string }>;
  memorationTip: string;
};

export default function WortfamiliePage() {
  const [w, setW] = useState("helfen");
  const [data, setData] = useState<Family | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError(""); setData(null);
    try {
      const res = await fetch("/api/ai/german", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "wortfamilie", input: { word: w.trim() } }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Hata");
      setData(j.data as Family);
    } catch (e) { setError(e instanceof Error ? e.message : "Hata"); }
    finally { setLoading(false); }
  }

  return (
    <>
      <header className="mb-6">
        <span className="chip chip-primary">Wortfamilie</span>
        <h1 className="h-display mt-3 text-3xl md:text-4xl">Kelime ailesi haritası</h1>
        <p className="section-subtitle">Bir kök → tüm akrabalar (fiil, isim, sıfat, bileşik). Almanca'nın bileşik mantığını öğren.</p>
      </header>

      <div className="surface p-5">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex-1 min-w-[14rem]">
            <span className="label">Kök kelime</span>
            <input className="input" value={w} onChange={e => setW(e.target.value)} placeholder="z.B. helfen, sprechen, Arbeit, Land…" onKeyDown={e => e.key === "Enter" && load()} />
          </label>
          <button type="button" className="btn btn-primary" onClick={load} disabled={loading || !w.trim()}>
            {loading ? "…" : "Haritayı çıkar"}
          </button>
        </div>
        {error ? <p className="mt-3 chip chip-danger">{error}</p> : null}
      </div>

      {data ? (
        <section className="mt-6 grid gap-4">
          <div className="surface p-5">
            <p className="eyebrow">Kök</p>
            <h2 className="mt-1 text-2xl font-semibold">{data.root}</h2>
            <p className="text-sm text-[color:var(--fg-muted)]">{data.trMeaning}</p>
            <hr className="divider-soft" />
            <p className="eyebrow">Hatırlama ipucu</p>
            <p className="mt-1 text-sm">{data.memorationTip}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.members.map((m, i) => (
              <div key={i} className="card card-hover">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold">{m.word}</h3>
                  <span className="chip chip-soft text-[10px]">{m.type}</span>
                </div>
                <p className="mt-1 text-sm text-[color:var(--fg-muted)]">{m.trMeaning}</p>
                <hr className="divider-soft" />
                <p className="text-sm italic">{m.exampleDe}</p>
                <p className="text-xs text-[color:var(--fg-subtle)]">{m.exampleTr}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
