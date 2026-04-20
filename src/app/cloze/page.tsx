"use client";

import { useEffect, useMemo, useState } from "react";
import { LESETEXTE, type Lesetext } from "@/lib/materials-data";

/** Make a C-Test: keep first ~half of every 2nd word, hide the rest. */
function makeCloze(text: string, ratio = 0.5): { tokens: ClozeToken[]; total: number } {
  const tokens: ClozeToken[] = [];
  const re = /(\w+|[^\w]+)/gu;
  let counter = 0;
  let total = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const part = m[0];
    if (/^\w+/u.test(part) && part.length >= 4) {
      counter++;
      if (counter % 2 === 0) {
        const keep = Math.max(2, Math.ceil(part.length * (1 - ratio)));
        const visible = part.slice(0, keep);
        const hidden = part.slice(keep);
        tokens.push({ kind: "blank", visible, hidden, full: part });
        total++;
        continue;
      }
    }
    tokens.push({ kind: "text", text: part });
  }
  return { tokens, total };
}

type ClozeToken =
  | { kind: "text"; text: string }
  | { kind: "blank"; visible: string; hidden: string; full: string };

function Blank({ tok, idx, value, onChange, reveal }:{
  tok: Extract<ClozeToken, {kind:"blank"}>;
  idx: number;
  value: string;
  onChange: (v: string) => void;
  reveal: boolean;
}) {
  const correct = value.trim().toLowerCase() === tok.hidden.toLowerCase();
  const colorClass = !reveal ? "" : correct ? "border-[color:var(--success)]" : "border-[color:var(--danger)]";
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline" }}>
      <span style={{ fontWeight: 600 }}>{tok.visible}</span>
      <input
        type="text"
        size={Math.max(2, tok.hidden.length)}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`input input-sm ${colorClass}`}
        style={{ width: `${Math.max(2, tok.hidden.length) + 1}ch`, padding: "0 0.25rem", margin: "0 1px", display: "inline-block" }}
        aria-label={`boşluk ${idx+1}`}
      />
      {reveal && !correct ? <span style={{ color: "var(--success)", fontSize: "0.75rem", marginLeft: 2 }}>{tok.hidden}</span> : null}
    </span>
  );
}

export default function ClozePage() {
  const all = useMemo(() => LESETEXTE, []);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [reveal, setReveal] = useState(false);
  const text = all[idx];
  const cloze = useMemo(() => text ? makeCloze(text.text, 0.5) : { tokens: [], total: 0 }, [text]);

  useEffect(() => { setAnswers({}); setReveal(false); }, [idx]);

  if (!text) return <p>telc Lesetext bulunamadı.</p>;

  const blanks = cloze.tokens.filter((t): t is Extract<ClozeToken,{kind:"blank"}> => t.kind === "blank");
  const correctCount = blanks.reduce((s, t, i) => s + ((answers[i] ?? "").trim().toLowerCase() === t.hidden.toLowerCase() ? 1 : 0), 0);
  const score = blanks.length ? Math.round((correctCount / blanks.length) * 100) : 0;

  return (
    <>
      <header className="mb-6">
        <span className="chip chip-primary"><span className="status-dot live" /> C-Test · Lückentext</span>
        <h1 className="h-display mt-3 text-3xl md:text-4xl">Cloze: {text.topic}</h1>
        <p className="section-subtitle">{text.level} · Lektion {text.lektion} · {cloze.total} boşluk · gerçek telc okuma metni</p>
      </header>

      <div className="surface p-5 leading-9 text-[15px] md:text-base">
        {(() => {
          let bIdx = -1;
          return cloze.tokens.map((t, i) => {
            if (t.kind === "text") return <span key={i}>{t.text}</span>;
            bIdx++;
            const myIdx = bIdx;
            return (
              <Blank
                key={i}
                tok={t}
                idx={myIdx}
                value={answers[myIdx] ?? ""}
                onChange={v => setAnswers(a => ({ ...a, [myIdx]: v }))}
                reveal={reveal}
              />
            );
          });
        })()}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" onClick={() => setReveal(true)}>Kontrol et</button>
        <button type="button" className="btn btn-ghost" onClick={() => { setAnswers({}); setReveal(false); }}>Sıfırla</button>
        <button type="button" className="btn btn-secondary" onClick={() => setIdx((idx + 1) % all.length)}>Sonraki metin →</button>
        {reveal ? <span className="chip chip-success">Skor: {correctCount} / {blanks.length} (%{score})</span> : null}
      </div>

      <p className="mt-3 text-xs text-[color:var(--fg-muted)]">
        Metin {idx + 1} / {all.length}. C-Test mantığı: her 2. uzun kelimenin sağ yarısı silinir; bağlamdan tahmin et.
      </p>
    </>
  );
}
