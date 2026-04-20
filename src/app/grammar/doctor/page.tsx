"use client";

import { useState } from "react";

type Doctor = {
  isCorrect: boolean;
  corrected: string;
  structure: Array<{ part: string; role: string; case: string | null }>;
  issues: Array<{ type: string; explanationTr: string; fix: string }>;
  alternatives: Array<{ text: string; register: string; noteTr: string }>;
  trTranslation: string;
};

export default function DoctorPage() {
  const [s, setS] = useState("Ich habe gestern ein Buch gelesen.");
  const [level, setLevel] = useState("B1");
  const [data, setData] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function diagnose() {
    setLoading(true); setError(""); setData(null);
    try {
      const res = await fetch("/api/ai/german", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "doctor", input: { sentence: s.trim(), level } }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Hata");
      setData(j.data as Doctor);
    } catch (e) { setError(e instanceof Error ? e.message : "Hata"); }
    finally { setLoading(false); }
  }

  return (
    <>
      <header className="mb-6">
        <span className="chip chip-accent">Grammatik Doktor</span>
        <h1 className="h-display mt-3 text-3xl md:text-4xl">Cümle doktoru</h1>
        <p className="section-subtitle">Bir cümle yapıştır — AI yapısını çıkarsın, hataları işaretlesin, alternatifler önersin.</p>
      </header>

      <div className="surface p-5">
        <label className="label">Almanca cümle</label>
        <textarea className="textarea" rows={3} value={s} onChange={e => setS(e.target.value)} />
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label>
            <span className="label">Seviye</span>
            <select className="select input-sm" value={level} onChange={e => setLevel(e.target.value)}>
              {["A1","A2","B1","B2","C1"].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <button type="button" className="btn btn-primary" onClick={diagnose} disabled={loading || !s.trim()}>
            {loading ? "Analiz ediliyor…" : "Tanı koy"}
          </button>
          {error ? <span className="chip chip-danger">{error}</span> : null}
        </div>
      </div>

      {data ? (
        <section className="mt-6 grid gap-4">
          <div className="surface p-5">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className={`chip ${data.isCorrect ? "chip-success" : "chip-warning"}`}>{data.isCorrect ? "✓ Dilbilgisel doğru" : "⚠ Düzeltme önerildi"}</span>
              <p className="text-[15px]"><span className="text-[color:var(--fg-muted)]">Düzeltilmiş:</span> <strong>{data.corrected}</strong></p>
            </div>
            <p className="mt-2 text-sm text-[color:var(--fg-muted)]"><span className="eyebrow">TR çeviri:</span> {data.trTranslation}</p>
          </div>

          <div className="surface p-5">
            <p className="eyebrow">Yapı analizi</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.structure.map((p, i) => (
                <span key={i} className="chip" title={p.role}>
                  <strong>{p.part}</strong>
                  <span className="text-[color:var(--fg-subtle)] ml-1">·{p.role}{p.case ? ` ${p.case}` : ""}</span>
                </span>
              ))}
            </div>
          </div>

          {data.issues.length > 0 ? (
            <div className="surface p-5">
              <p className="eyebrow">Sorunlar</p>
              <ul className="mt-2 grid gap-2">
                {data.issues.map((it, i) => (
                  <li key={i} className="card-tight surface-soft">
                    <span className="chip chip-warning text-xs">{it.type}</span>
                    <p className="mt-1 text-sm">{it.explanationTr}</p>
                    <p className="mt-1 text-sm"><span className="text-[color:var(--fg-muted)]">Düzeltme:</span> <strong>{it.fix}</strong></p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {data.alternatives.length > 0 ? (
            <div className="surface p-5">
              <p className="eyebrow">Alternatif ifadeler</p>
              <ul className="mt-2 grid gap-2">
                {data.alternatives.map((a, i) => (
                  <li key={i} className="card-tight surface-soft">
                    <p className="text-sm"><strong>{a.text}</strong> <span className="chip chip-soft text-xs ml-1">{a.register}</span></p>
                    <p className="text-xs text-[color:var(--fg-muted)] mt-1">{a.noteTr}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
