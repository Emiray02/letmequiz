"use client";

import { useState } from "react";

type Article = {
  id: string;
  level: "A2" | "B1" | "B2";
  date: string;
  title: string;
  source: string;
  text: string;
};

const ARTICLES: Article[] = [
  {
    id: "a1", level: "A2", date: "2026-04-15", source: "Nachrichten leicht",
    title: "Frühling in Deutschland",
    text: "In vielen Städten in Deutschland ist es jetzt Frühling. Die Bäume haben grüne Blätter. Die Menschen gehen gerne in den Park. Viele Familien machen ein Picknick. Die Kinder spielen draußen. Es regnet manchmal, aber dann scheint wieder die Sonne. Der Frühling dauert von März bis Mai.",
  },
  {
    id: "a2", level: "B1", date: "2026-04-12", source: "DW Top-Thema",
    title: "Berlin: Mehr Fahrräder, weniger Autos",
    text: "Die Stadt Berlin will, dass weniger Menschen mit dem Auto fahren. Deshalb baut die Stadt neue Fahrradwege. Viele Berliner finden das gut, weil die Luft sauberer wird. Andere sind unzufrieden, weil Parkplätze verschwinden. Die Politiker diskutieren, wie sie beide Gruppen zufriedenstellen können. Eine Lösung könnte mehr öffentlicher Verkehr sein.",
  },
  {
    id: "a3", level: "B1", date: "2026-04-10", source: "Tagesschau (vereinfacht)",
    title: "Schulen testen Vier-Tage-Woche",
    text: "Mehrere Schulen in Bayern testen eine Vier-Tage-Woche. Das bedeutet, die Schüler lernen nur von Montag bis Donnerstag. Am Freitag haben sie frei. Lehrer sagen, die Kinder sind weniger müde und können besser lernen. Eltern sind unterschiedlicher Meinung. Manche müssen am Freitag arbeiten und brauchen eine Betreuung für ihre Kinder.",
  },
  {
    id: "a4", level: "A2", date: "2026-04-08", source: "Nachrichten leicht",
    title: "Neue App hilft beim Deutsch lernen",
    text: "Eine neue App soll Menschen helfen, schneller Deutsch zu lernen. Die App nutzt künstliche Intelligenz. Man kann mit dem Computer sprechen wie mit einem Freund. Die App korrigiert Fehler und gibt Tipps. Viele Schüler benutzen sie schon. Forscher sagen, dass solche Apps eine gute Hilfe sind, aber den Lehrer nicht ersetzen.",
  },
  {
    id: "a5", level: "B2", date: "2026-04-05", source: "DW Wirtschaft",
    title: "Inflation in der Eurozone sinkt leicht",
    text: "Die Inflation in den Ländern der Eurozone ist im März leicht gesunken. Lebensmittel wurden weniger teuer als erwartet. Trotzdem bleibt die Inflation über dem Ziel der Europäischen Zentralbank von zwei Prozent. Experten gehen davon aus, dass die Zinsen vorerst hoch bleiben. Verbraucher hoffen jedoch, dass die Preise im Supermarkt bald wieder normaler werden.",
  },
  {
    id: "a6", level: "B1", date: "2026-04-03", source: "DW Top-Thema",
    title: "Junge Menschen interessieren sich wieder für Bücher",
    text: "Eine neue Studie zeigt: Immer mehr junge Menschen in Deutschland lesen wieder Bücher. Besonders beliebt sind Romane und Krimis. Viele junge Leser sagen, dass sie das Lesen entspannend finden. Soziale Medien spielen dabei eine wichtige Rolle: Auf TikTok empfehlen Influencer ihre Lieblingsbücher. Buchhandlungen freuen sich über mehr junge Kunden.",
  },
];

type Summary = {
  summaryDe: string;
  summaryTr: string;
  keyVocab: Array<{ word: string; trMeaning: string; exampleDe: string }>;
  comprehensionQuestions: Array<{ q: string; a: string }>;
};

export default function NewsPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const a = ARTICLES.find(x => x.id === activeId);

  async function summarize(art: Article) {
    setLoading(true); setError(""); setData(null);
    try {
      const res = await fetch("/api/ai/german", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "news-summary", input: { text: art.text, level: art.level } }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Hata");
      setData(j.data as Summary);
    } catch (e) { setError(e instanceof Error ? e.message : "Hata"); }
    finally { setLoading(false); }
  }

  if (!a) {
    return (
      <>
        <header className="mb-6">
          <span className="chip chip-primary">Echte Texte</span>
          <h1 className="h-display mt-3 text-3xl md:text-4xl">Almanca güncel haberler</h1>
          <p className="section-subtitle">Basitleştirilmiş haber metinleri — AI özet, anahtar kelime ve anlama soruları üretir.</p>
        </header>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ARTICLES.map(x => (
            <li key={x.id}>
              <button type="button" className="card card-hover w-full text-left" onClick={() => { setActiveId(x.id); setData(null); }}>
                <div className="flex items-baseline justify-between">
                  <span className={`cefr cefr-${x.level.toLowerCase()}`}>{x.level}</span>
                  <span className="text-xs text-[color:var(--fg-subtle)]">{x.date}</span>
                </div>
                <h3 className="mt-2 text-base font-semibold">{x.title}</h3>
                <p className="mt-1 text-xs text-[color:var(--fg-muted)]">{x.source}</p>
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <>
      <header className="mb-6 flex items-baseline justify-between gap-3">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => { setActiveId(null); setData(null); }}>← Haberler</button>
          <h1 className="h-display mt-2 text-2xl md:text-3xl">{a.title}</h1>
          <p className="text-xs text-[color:var(--fg-subtle)]">{a.source} · {a.date}</p>
        </div>
        <span className={`cefr cefr-${a.level.toLowerCase()}`}>{a.level}</span>
      </header>

      <section className="surface p-5 leading-7 text-[15px]">{a.text}</section>

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={() => summarize(a)} disabled={loading}>{loading ? "Üretiliyor…" : "AI özet + sözlük + sorular"}</button>
        {error ? <span className="chip chip-danger">{error}</span> : null}
      </div>

      {data ? (
        <section className="mt-6 grid gap-4">
          <div className="surface p-5">
            <p className="eyebrow">Özet (DE)</p>
            <p className="mt-2 text-sm">{data.summaryDe}</p>
            <hr className="divider-soft" />
            <p className="eyebrow">Özet (TR)</p>
            <p className="mt-2 text-sm text-[color:var(--fg-muted)]">{data.summaryTr}</p>
          </div>
          <div className="surface p-5">
            <p className="eyebrow">Anahtar kelimeler</p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {data.keyVocab.map((v, i) => (
                <li key={i} className="card-tight surface-soft">
                  <p className="font-semibold">{v.word} <span className="text-xs text-[color:var(--fg-muted)]">— {v.trMeaning}</span></p>
                  <p className="text-xs italic mt-1">{v.exampleDe}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="surface p-5">
            <p className="eyebrow">Anlama soruları</p>
            <ol className="mt-2 grid gap-2">
              {data.comprehensionQuestions.map((q, i) => (
                <li key={i} className="card-tight surface-soft">
                  <p className="font-semibold text-sm">{i+1}. {q.q}</p>
                  <details className="mt-1">
                    <summary className="text-xs text-[color:var(--primary)] cursor-pointer">Cevabı göster</summary>
                    <p className="mt-1 text-sm">{q.a}</p>
                  </details>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}
    </>
  );
}
