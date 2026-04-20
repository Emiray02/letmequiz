"use client";

import { useState } from "react";

type Skill = "schreiben" | "sprechen" | "lesen" | "hoeren";

type Correction = {
  wrong: string;
  right: string;
  reason: string;
  category: "grammatik" | "wortschatz" | "rechtschreibung" | "stil" | "andere";
};

type FeedbackResponse = {
  detectedLanguage: { lang: string; confidence: number };
  corrections: Correction[];
  rewrittenText: string;
  scores: { grammatik: number; wortschatz: number; aufgabe: number; stil: number; gesamt: number };
  tips: string[];
  vocabSuggestions: { word: string; meaning: string; example: string }[];
  usedAiModel: string;
};

const LABELS: Record<Skill, { title: string; placeholder: string; promptPlaceholder: string }> = {
  schreiben: {
    title: "Yazma Stüdyosu",
    placeholder: "Almanca cevabını buraya yaz…",
    promptPlaceholder: "Görev: Bir e-posta yaz, ders bul, randevu erteleyici cümle…",
  },
  sprechen: {
    title: "Konuşma Koçu",
    placeholder: "Konuştuğunu buraya transkripte et veya yaz…",
    promptPlaceholder: "Soru: 'Stell dich vor und beschreibe deinen Beruf.'",
  },
  lesen: {
    title: "Okuma Refleksiyon",
    placeholder: "Okuduğun metnin Almanca özetini yaz…",
    promptPlaceholder: "Hangi metni okudun?",
  },
  hoeren: {
    title: "Dinleme Refleksiyon",
    placeholder: "Duyduğun diyalogu Almanca yeniden ifade et…",
    promptPlaceholder: "Hangi parçayı dinledin?",
  },
};

export default function SkillFeedbackPanel({
  skill,
  defaultPrompt,
  level = "A2",
}: {
  skill: Skill;
  defaultPrompt?: string;
  level?: string;
}) {
  const labels = LABELS[skill];
  const [text, setText] = useState("");
  const [prompt, setPrompt] = useState(defaultPrompt ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FeedbackResponse | null>(null);
  const [recording, setRecording] = useState(false);

  function startSpeechToText() {
    type SRConstructor = new () => SpeechRecognitionLike;
    type SpeechRecognitionLike = {
      lang: string;
      interimResults: boolean;
      onresult: (e: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void;
      onerror: (e: unknown) => void;
      onend: () => void;
      start: () => void;
      stop: () => void;
    };
    const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setError("Tarayıcın konuşma tanımayı desteklemiyor. Chrome/Edge öneririz.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "de-DE";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setText((prev) => (prev ? prev + " " + transcript : transcript));
    };
    rec.onerror = () => setRecording(false);
    rec.onend = () => setRecording(false);
    rec.start();
    setRecording(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill, text, prompt, level }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? "Geri bildirim alınamadı.");
      }
      const json = (await res.json()) as FeedbackResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir şeyler ters gitti.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="surface p-5 md:p-7 grid gap-5 animate-slide-up">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="eyebrow">{skill.toUpperCase()} · CEFR {level}</span>
          <h2 className="h-display text-2xl mt-1">{labels.title}</h2>
        </div>
        <span className={`chip ${skill === "sprechen" ? "chip-warning" : "chip-primary"}`}>
          AI geri bildirim
        </span>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div>
          <label className="label" htmlFor="fb-prompt">Görev / soru (opsiyonel)</label>
          <input
            id="fb-prompt"
            className="input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={labels.promptPlaceholder}
          />
        </div>
        <div>
          <label className="label" htmlFor="fb-text">Cevabın</label>
          <textarea
            id="fb-text"
            className="input"
            rows={skill === "sprechen" ? 4 : 7}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={labels.placeholder}
          />
          <p className="text-xs text-[color:var(--fg-muted)] mt-1">
            {text.trim().split(/\s+/).filter(Boolean).length} kelime · sistem dilini otomatik algılar
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn btn-primary" disabled={loading || !text.trim()}>
            {loading ? "Analiz ediliyor…" : "AI'dan geri bildirim al"}
          </button>
          {skill === "sprechen" ? (
            <button
              type="button"
              className={`btn ${recording ? "btn-danger" : "btn-secondary"}`}
              onClick={startSpeechToText}
              disabled={recording}
            >
              {recording ? "🎙️ Dinleniyor…" : "🎙️ Sesle yaz"}
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={() => { setText(""); setData(null); }}>
            Sıfırla
          </button>
        </div>
      </form>

      {error ? (
        <p className="text-sm text-[color:var(--danger)]">{error}</p>
      ) : null}

      {data ? <FeedbackResult data={data} /> : null}
    </section>
  );
}

function FeedbackResult({ data }: { data: FeedbackResponse }) {
  const langLabel =
    data.detectedLanguage.lang === "de"
      ? "Almanca"
      : data.detectedLanguage.lang === "tr"
        ? "Türkçe"
        : data.detectedLanguage.lang === "mixed"
          ? "Karışık"
          : "Bilinmiyor";

  return (
    <div className="grid gap-4 mt-2">
      <div className="grid gap-3 md:grid-cols-5">
        <Stat label="Genel" value={data.scores.gesamt} highlight />
        <Stat label="Gramer" value={data.scores.grammatik} />
        <Stat label="Kelime" value={data.scores.wortschatz} />
        <Stat label="Görev" value={data.scores.aufgabe} />
        <Stat label="Üslup" value={data.scores.stil} />
      </div>

      <div className="surface-muted p-3 text-sm">
        <strong>Algılanan dil:</strong> {langLabel}
        <span className="text-[color:var(--fg-muted)]"> · model: {data.usedAiModel}</span>
      </div>

      {data.corrections.length > 0 ? (
        <div>
          <h3 className="font-semibold mb-2">Düzeltmeler</h3>
          <ul className="grid gap-2">
            {data.corrections.map((c, i) => (
              <li key={i} className="surface-muted p-3 grid gap-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip chip-danger" style={{ textDecoration: "line-through" }}>{c.wrong}</span>
                  <span aria-hidden>→</span>
                  <span className="chip chip-success">{c.right}</span>
                  <span className="chip">{c.category}</span>
                </div>
                <p className="text-[color:var(--fg-muted)]">{c.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-[color:var(--fg-muted)]">Net hata yok 👏</p>
      )}

      {data.rewrittenText ? (
        <div>
          <h3 className="font-semibold mb-1">Düzeltilmiş cevap</h3>
          <p className="surface-muted p-3 text-sm whitespace-pre-wrap">{data.rewrittenText}</p>
        </div>
      ) : null}

      {data.tips.length > 0 ? (
        <div>
          <h3 className="font-semibold mb-1">Tavsiyeler</h3>
          <ul className="list-disc pl-5 text-sm grid gap-1">
            {data.tips.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      ) : null}

      {data.vocabSuggestions.length > 0 ? (
        <div>
          <h3 className="font-semibold mb-2">Önerilen kelimeler</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.vocabSuggestions.map((v, i) => (
              <li key={i} className="surface-muted p-3 text-sm">
                <p><strong>{v.word}</strong> — {v.meaning}</p>
                <p className="text-[color:var(--fg-muted)] mt-1">{v.example}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`stat${highlight ? " stat-primary" : ""}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}<span className="text-sm text-[color:var(--fg-muted)]">/100</span></span>
    </div>
  );
}
