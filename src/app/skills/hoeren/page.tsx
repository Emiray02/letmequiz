"use client";

import { useRef, useState } from "react";
import TopNav from "@/components/top-nav";
import SkillFeedbackPanel from "@/components/skill-feedback-panel";

type Clip = { id: string; title: string; text: string; level: "A1" | "A2" | "B1" };

const CLIPS: Clip[] = [
  {
    id: "a1-bakery",
    title: "Beim Bäcker (A1)",
    level: "A1",
    text:
      "Guten Morgen! Ich hätte gern zwei Brötchen und ein Vollkornbrot. Was kostet das? Drei Euro fünfzig, bitte.",
  },
  {
    id: "a2-bahnhof",
    title: "Am Bahnhof (A2)",
    level: "A2",
    text:
      "Der nächste Zug nach München fährt um neun Uhr fünfzehn von Gleis sieben. Bitte beachten Sie, dass der Zug fünf Minuten Verspätung hat.",
  },
  {
    id: "b1-wetter",
    title: "Wetterbericht (B1)",
    level: "B1",
    text:
      "Morgen erwartet uns ein wechselhaftes Wetter. Im Norden bleibt es bewölkt mit gelegentlichen Schauern, während im Süden die Sonne sich am Nachmittag durchsetzt. Die Temperaturen liegen zwischen zehn und siebzehn Grad.",
  },
];

export default function HoerenPage() {
  const [activeId, setActiveId] = useState(CLIPS[0].id);
  const active = CLIPS.find((c) => c.id === activeId) ?? CLIPS[0];
  const rate = useRef(0.95);

  function speak(rateOverride?: number) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(active.text);
    u.lang = "de-DE";
    u.rate = rateOverride ?? rate.current;
    window.speechSynthesis.speak(u);
  }

  return (
    <>
      <TopNav active="/skills" />
      <main className="app-main app-container pt-8 md:pt-12 grid gap-6">
        <header>
          <span className="chip chip-primary">Hören · Dictogloss + Testing Effect</span>
          <h1 className="h-display mt-3 text-3xl md:text-4xl">Dinleme Atölyesi</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-2 max-w-2xl">
            Klibi 1–2 kez dinle, <strong>metne bakmadan</strong> duyduklarını Almanca yaz. AI orijinal metinle kıyaslar,
            kaçırdığın kelimeleri işaretler.
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          {CLIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveId(c.id)}
              className={`surface p-4 text-left card-hover ${active.id === c.id ? "ring-2 ring-[color:var(--primary)]" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className={`cefr cefr-${c.level.toLowerCase()}`}>{c.level}</span>
                <span className="text-xs text-[color:var(--fg-muted)]">
                  {c.text.split(" ").length} kelime
                </span>
              </div>
              <p className="font-semibold mt-2">{c.title}</p>
            </button>
          ))}
        </section>

        <section className="surface p-5 grid gap-3">
          <p className="eyebrow">Aktif klip</p>
          <h2 className="h-display text-2xl">{active.title}</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={() => speak(0.9)}>▶️ Normal hızda dinle</button>
            <button type="button" className="btn btn-secondary" onClick={() => speak(0.7)}>🐢 Yavaş dinle</button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => window.speechSynthesis?.cancel()}
            >
              ⏹ Durdur
            </button>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-[color:var(--fg-muted)]">
              Metni göster (cevapladıktan sonra)
            </summary>
            <p className="surface-muted p-3 mt-2 text-sm whitespace-pre-wrap">{active.text}</p>
          </details>
        </section>

        <SkillFeedbackPanel
          skill="hoeren"
          defaultPrompt={`Duyduklarını Almanca yaz: '${active.title}'`}
          level="A2"
        />
      </main>
    </>
  );
}
