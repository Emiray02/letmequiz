"use client";

import { useState } from "react";

type Conjugation = {
  infinitiv: string;
  partizipII: string;
  praeteritum_ich: string;
  auxiliary: "haben" | "sein";
  isSeparable: boolean;
  praesens: Record<string, string>;
  praeteritum: Record<string, string>;
  perfekt: Record<string, string>;
  imperativ: { du: string; ihr: string; Sie: string };
  trMeaning: string;
};

const PRONOUNS = [
  ["ich", "ich"],
  ["du", "du"],
  ["er/sie/es", "er_sie_es"],
  ["wir", "wir"],
  ["ihr", "ihr"],
  ["sie/Sie", "sie_Sie"],
] as const;

export default function KonjugatorPage() {
  const [verb, setVerb] = useState("gehen");
  const [data, setData] = useState<Conjugation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError(""); setData(null);
    try {
      const res = await fetch("/api/ai/german", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "konjugieren", input: { verb: verb.trim() } }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Hata");
      setData(j.data as Conjugation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally { setLoading(false); }
  }

  return (
    <>
      <header className="mb-6">
        <span className="chip chip-primary">Konjugator</span>
        <h1 className="h-display mt-3 text-3xl md:text-4xl">Fiil çekim tablosu</h1>
        <p className="section-subtitle">Herhangi bir Almanca fiili gir — AI tüm şahıs ve zamanları üretsin.</p>
      </header>

      <div className="surface p-5">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex-1 min-w-[16rem]">
            <span className="label">Fiil (Infinitiv)</span>
            <input className="input" value={verb} onChange={e => setVerb(e.target.value)} placeholder="z.B. gehen, sprechen, anrufen…" onKeyDown={e => e.key === "Enter" && load()} />
          </label>
          <button type="button" className="btn btn-primary" onClick={load} disabled={loading || !verb.trim()}>
            {loading ? "…" : "Çekimle"}
          </button>
        </div>
        {error ? <p className="mt-3 chip chip-danger">{error}</p> : null}
      </div>

      {data ? (
        <section className="mt-6 grid gap-4">
          <div className="surface p-5">
            <p className="eyebrow">Genel</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <h2 className="text-2xl font-semibold">{data.infinitiv}</h2>
              <span className="chip chip-soft">{data.trMeaning}</span>
              <span className="chip">{data.auxiliary}</span>
              {data.isSeparable ? <span className="chip chip-warning">ayrılabilir</span> : null}
              <span className="chip">Partizip II: <strong className="ml-1">{data.partizipII}</strong></span>
              <span className="chip">Präteritum: <strong className="ml-1">{data.praeteritum_ich}</strong></span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Tense title="Präsens" rows={data.praesens} />
            <Tense title="Präteritum" rows={data.praeteritum} />
            <Tense title="Perfekt" rows={data.perfekt} />
          </div>

          <div className="surface p-5">
            <p className="eyebrow">Imperativ</p>
            <ul className="mt-2 grid gap-1 text-sm">
              <li><span className="text-[color:var(--fg-muted)]">du →</span> <strong>{data.imperativ.du}</strong></li>
              <li><span className="text-[color:var(--fg-muted)]">ihr →</span> <strong>{data.imperativ.ihr}</strong></li>
              <li><span className="text-[color:var(--fg-muted)]">Sie →</span> <strong>{data.imperativ.Sie}</strong></li>
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}

function Tense({ title, rows }: { title: string; rows: Record<string, string> }) {
  return (
    <div className="surface p-5">
      <p className="eyebrow">{title}</p>
      <table className="mt-2 w-full text-sm">
        <tbody>
          {PRONOUNS.map(([label, key]) => (
            <tr key={key} className="border-b border-[color:var(--border)] last:border-0">
              <td className="py-1.5 text-[color:var(--fg-muted)]" style={{ width: "5.5rem" }}>{label}</td>
              <td className="py-1.5 font-semibold">{rows?.[key] ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
