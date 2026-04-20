"use client";

import { useState } from "react";

const SCENARIOS = [
  { id: "baeckerei", label: "Bäckerei — Fırın",            level: "A2", desc: "Brötchen, Brot, Kuchen sipariş et." },
  { id: "arzt",      label: "Arzttermin — Doktor randevusu", level: "B1", desc: "Şikayetini anlat, randevu al." },
  { id: "wohnung",   label: "Wohnungsbesichtigung",         level: "B1", desc: "Mülk sahibine soru sor, daireyi konuş." },
  { id: "restaurant",label: "Restaurant",                   level: "A2", desc: "Sipariş ver, hesap iste, şikâyet et." },
  { id: "amt",       label: "Bürgeramt — Belediye",         level: "B1", desc: "Anmeldung, kimlik, form doldurma." },
  { id: "vorstellung", label: "Vorstellungsgespräch",       level: "B2", desc: "Kısa iş görüşmesi simülasyonu." },
];

type Msg = { role: "student" | "ai"; content: string };
type Reply = {
  reply: string;
  studentFeedback: { wasUnderstandable: boolean; tipTr: string; suggestedReplyDe: string };
  shouldEnd: boolean;
};

export default function RollenspielPage() {
  const [scenario, setScenario] = useState<string | null>(null);
  const [level, setLevel] = useState("A2");
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<Reply["studentFeedback"] | null>(null);
  const [error, setError] = useState("");

  async function send() {
    if (!input.trim() || !scenario) return;
    const userMsg: Msg = { role: "student", content: input.trim() };
    const newHist = [...history, userMsg];
    setHistory(newHist); setInput(""); setLoading(true); setError("");
    try {
      const res = await fetch("/api/ai/german", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "rollenspiel",
          input: { scenario: SCENARIOS.find(s => s.id === scenario)?.label ?? scenario, level, history: newHist.map(m => ({ role: m.role, content: m.content })) },
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Hata");
      const r = j.data as Reply;
      setHistory([...newHist, { role: "ai", content: r.reply }]);
      setLastFeedback(r.studentFeedback);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally { setLoading(false); }
  }

  if (!scenario) {
    return (
      <>
        <header className="mb-6">
          <span className="chip chip-accent">Sprechen · Rollenspiel</span>
          <h1 className="h-display mt-3 text-3xl md:text-4xl">AI ile rol oyunu</h1>
          <p className="section-subtitle">Gerçek hayat senaryosu seç. AI Almanca konuşur, sen cevap verirsin. Her cevabına anlık geri bildirim.</p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIOS.map(s => (
            <button key={s.id} type="button" onClick={() => { setScenario(s.id); setLevel(s.level); setHistory([]); setLastFeedback(null); }} className="tile card-hover text-left">
              <div className="flex items-baseline justify-between">
                <span className={`cefr cefr-${s.level.toLowerCase()}`}>{s.level}</span>
              </div>
              <span className="tile-title">{s.label}</span>
              <span className="tile-desc">{s.desc}</span>
            </button>
          ))}
        </div>
      </>
    );
  }

  const sc = SCENARIOS.find(s => s.id === scenario)!;
  return (
    <>
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => setScenario(null)}>← Senaryolar</button>
          <h1 className="h-display mt-2 text-2xl md:text-3xl">{sc.label}</h1>
        </div>
        <span className={`cefr cefr-${sc.level.toLowerCase()}`}>{sc.level}</span>
      </header>

      <div className="surface p-5 grid gap-3" style={{ minHeight: "16rem" }}>
        {history.length === 0 ? (
          <p className="text-sm text-[color:var(--fg-muted)] text-center py-6">Sen başla — örn. <em>&quot;Guten Tag, ich hätte gern…&quot;</em></p>
        ) : history.map((m, i) => (
          <div key={i} className={`max-w-[85%] ${m.role === "student" ? "self-end" : "self-start"}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--fg-subtle)] mb-1">{m.role === "student" ? "Sen" : "AI"}</p>
            <div className={`card-tight ${m.role === "student" ? "surface-soft" : ""}`} style={m.role === "ai" ? { background: "var(--primary-soft)", color: "var(--primary-strong)" } : undefined}>
              <p className="text-sm">{m.content}</p>
            </div>
          </div>
        ))}
      </div>

      {lastFeedback ? (
        <div className="surface-soft mt-4 p-4">
          <p className="eyebrow">Son cevabın için geri bildirim</p>
          <p className="mt-1 text-sm"><span className="chip chip-soft">{lastFeedback.wasUnderstandable ? "✓ Anlaşıldı" : "⚠ Anlaşılmadı"}</span></p>
          <p className="mt-2 text-sm"><strong>İpucu:</strong> {lastFeedback.tipTr}</p>
          <p className="mt-1 text-sm text-[color:var(--fg-muted)]"><strong>Daha iyi cevap:</strong> {lastFeedback.suggestedReplyDe}</p>
        </div>
      ) : null}

      <div className="mt-4 flex gap-2">
        <input className="input flex-1" value={input} onChange={e => setInput(e.target.value)} placeholder="Almanca cevabını yaz…" disabled={loading} onKeyDown={e => { if (e.key === "Enter") send(); }} />
        <button className="btn btn-primary" onClick={send} disabled={loading || !input.trim()}>{loading ? "…" : "Gönder"}</button>
      </div>
      {error ? <p className="mt-2 chip chip-danger">{error}</p> : null}
    </>
  );
}
