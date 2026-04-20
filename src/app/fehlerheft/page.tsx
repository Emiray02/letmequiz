"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listEntries, deleteEntry, markReviewed, setResolved, addEntry, pickWeeklyQuiz, counts, type FehlerEntry } from "@/lib/fehlerheft-store";

const CATS: Array<FehlerEntry["category"]> = ["grammatik", "wortschatz", "rechtschreibung", "stil", "andere"];
const CAT_LABEL: Record<string, string> = {
  grammatik: "Gramer", wortschatz: "Kelime", rechtschreibung: "Yazım", stil: "Üslup", andere: "Diğer",
};

export default function FehlerheftPage() {
  const [entries, setEntries] = useState<FehlerEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | FehlerEntry["category"]>("open");
  const [quiz, setQuiz] = useState<FehlerEntry[] | null>(null);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizAns, setQuizAns] = useState("");
  const [quizReveal, setQuizReveal] = useState(false);

  // Manual add form
  const [w, setW] = useState(""); const [r, setR] = useState(""); const [why, setWhy] = useState("");
  const [cat, setCat] = useState<FehlerEntry["category"]>("grammatik");

  useEffect(() => { setEntries(listEntries()); }, []);

  function refresh() { setEntries(listEntries()); }
  function startQuiz() {
    const q = pickWeeklyQuiz(10);
    setQuiz(q); setQuizIdx(0); setQuizAns(""); setQuizReveal(false);
  }
  function quizNext() {
    if (!quiz) return;
    if (quiz[quizIdx]) markReviewed(quiz[quizIdx].id);
    if (quizIdx + 1 >= quiz.length) { setQuiz(null); refresh(); return; }
    setQuizIdx(quizIdx + 1); setQuizAns(""); setQuizReveal(false);
  }

  const c = counts();
  const filtered = entries.filter(e => {
    if (filter === "all") return true;
    if (filter === "open") return !e.resolved;
    return e.category === filter;
  });

  if (quiz && quiz[quizIdx]) {
    const cur = quiz[quizIdx];
    const correct = quizAns.trim().toLowerCase() === cur.right.trim().toLowerCase();
    return (
      <>
        <header className="mb-6">
          <span className="chip chip-warning">Haftalık hata quiz'i</span>
          <h1 className="h-display mt-3 text-3xl">Soru {quizIdx + 1} / {quiz.length}</h1>
        </header>
        <div className="surface p-6">
          <p className="eyebrow">Yanlış formu doğru yazın</p>
          <p className="mt-2 text-2xl font-semibold" style={{ textDecoration: "line-through", color: "var(--danger)" }}>{cur.wrong}</p>
          <p className="mt-2 text-sm text-[color:var(--fg-muted)]">{cur.reason}</p>
          <input
            type="text" autoFocus value={quizAns} onChange={e => setQuizAns(e.target.value)}
            placeholder="Doğru hâlini yaz…" className="input mt-4" disabled={quizReveal}
            onKeyDown={e => { if (e.key === "Enter") setQuizReveal(true); }}
          />
          {quizReveal ? (
            <div className="mt-4">
              <p className={`chip ${correct ? "chip-success" : "chip-danger"}`}>
                {correct ? "✓ Doğru" : `✗ Doğru: ${cur.right}`}
              </p>
              <button type="button" className="btn btn-primary mt-4" onClick={quizNext}>Sonraki →</button>
            </div>
          ) : (
            <button type="button" className="btn btn-secondary mt-4" onClick={() => setQuizReveal(true)}>Kontrol et</button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="chip chip-warning">Fehlerheft</span>
          <h1 className="h-display mt-3 text-3xl md:text-4xl">Hata defterim</h1>
          <p className="section-subtitle">AI feedback'inden gelen ve elle eklediğin hatalar — haftalık özel quiz'in burada.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary" onClick={startQuiz} disabled={c.open === 0}>
            Haftalık quiz ({c.open})
          </button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="stat"><span className="stat-label">Toplam</span><span className="stat-value">{c.total}</span></div>
        <div className="stat"><span className="stat-label">Açık</span><span className="stat-value">{c.open}</span></div>
        <div className="stat"><span className="stat-label">Gramer</span><span className="stat-value">{c.byCategory.grammatik ?? 0}</span></div>
        <div className="stat"><span className="stat-label">Kelime</span><span className="stat-value">{c.byCategory.wortschatz ?? 0}</span></div>
      </section>

      <section className="mt-6 surface p-5">
        <p className="eyebrow">Elle ekle</p>
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_1.4fr_auto_auto]">
          <input className="input input-sm" placeholder="Yanlış" value={w} onChange={e => setW(e.target.value)} />
          <input className="input input-sm" placeholder="Doğru" value={r} onChange={e => setR(e.target.value)} />
          <input className="input input-sm" placeholder="Sebep / not" value={why} onChange={e => setWhy(e.target.value)} />
          <select className="select input-sm" value={cat} onChange={e => setCat(e.target.value as FehlerEntry["category"])}>
            {CATS.map(k => <option key={k} value={k}>{CAT_LABEL[k]}</option>)}
          </select>
          <button type="button" className="btn btn-primary btn-sm" disabled={!w || !r}
            onClick={() => { addEntry({ wrong: w, right: r, reason: why, category: cat, source: "manual" }); setW(""); setR(""); setWhy(""); refresh(); }}>
            Ekle
          </button>
        </div>
      </section>

      <section className="mt-6">
        <div className="tabs-strip">
          <button className={`tab ${filter === "open" ? "active" : ""}`} onClick={() => setFilter("open")}>Açık</button>
          <button className={`tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>Tümü</button>
          {CATS.map(k => <button key={k} className={`tab ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)}>{CAT_LABEL[k]}</button>)}
        </div>

        <ul className="mt-4 grid gap-2">
          {filtered.length === 0 ? (
            <li className="surface-muted p-5 text-center text-sm text-[color:var(--fg-muted)]">
              Hiç hata yok. <Link href="/skills/schreiben" className="link">Schreiben</Link> ya da <Link href="/skills/sprechen" className="link">Sprechen</Link> dene — AI feedback otomatik buraya düşer.
            </li>
          ) : filtered.map(e => (
            <li key={e.id} className="card-tight surface-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm" style={{ textDecoration: "line-through", color: "var(--danger)" }}>{e.wrong}</span>
                  <span className="text-[color:var(--fg-muted)]">→</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--success)" }}>{e.right}</span>
                  <span className="chip">{CAT_LABEL[e.category]}</span>
                  <span className="chip chip-soft">{e.source}</span>
                  {e.resolved ? <span className="chip chip-success">çözüldü</span> : null}
                </div>
                <div className="flex gap-1.5">
                  <button className="btn btn-ghost btn-sm" onClick={() => { setResolved(e.id, !e.resolved); refresh(); }}>
                    {e.resolved ? "Aç" : "Çözüldü"}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { deleteEntry(e.id); refresh(); }}>Sil</button>
                </div>
              </div>
              {e.reason ? <p className="mt-1 text-xs text-[color:var(--fg-muted)]">{e.reason}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
