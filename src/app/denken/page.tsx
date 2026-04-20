"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Prompt = { tr: string; hint: string; level: "A1" | "A2" | "B1" };

const PROMPTS: Prompt[] = [
  { tr: "Markette domates kalmamış. Satıcıya nazikçe sor.", hint: "haben Sie ... noch?", level: "A1" },
  { tr: "Arkadaşına hafta sonu için sinema teklif et.", hint: "Hast du Lust ...", level: "A1" },
  { tr: "Tren rötarlı. Yanındaki yolcuyla küçük muhabbet kur.", hint: "Wissen Sie, wann ...", level: "A2" },
  { tr: "Kiraladığın evde kalorifer çalışmıyor. Ev sahibine yaz.", hint: "Die Heizung funktioniert ...", level: "A2" },
  { tr: "Doktora karın ağrını anlat: ne zaman, ne yedin, nasıl bir ağrı.", hint: "Ich habe seit ... Schmerzen", level: "A2" },
  { tr: "İş arkadaşına bugün neden geç kaldığını söyle.", hint: "Es tut mir leid, ...", level: "A2" },
  { tr: "Restoranda garsona menüyü iste, ardından bir şikayet et.", hint: "Könnte ich bitte ...", level: "B1" },
  { tr: "Toplantıda fikrine katılmadığın birine kibarca itiraz et.", hint: "Ich sehe das ein bisschen anders, ...", level: "B1" },
  { tr: "Tanımadığın birine yol tarif et: 200 m düz, sağa, sonra köprüden geç.", hint: "Gehen Sie geradeaus ...", level: "A2" },
  { tr: "Yeni bir hobi denemek isteyen arkadaşına 3 öneri sun.", hint: "Du könntest ... versuchen", level: "B1" },
];

const SECONDS = 60;

export default function DenkenPage() {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(SECONDS);
  const [running, setRunning] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  function start() {
    setText(""); setSecondsLeft(SECONDS); setShowHint(false); setRunning(true);
    setTimeout(() => taRef.current?.focus(), 50);
  }
  function next() {
    setIdx((i) => (i + 1) % PROMPTS.length);
    setText(""); setSecondsLeft(SECONDS); setRunning(false); setShowHint(false);
  }
  function blockTurkish(value: string) {
    const tr = /[ÇçĞğİıÖöŞşÜü]/.test(value);
    if (tr) {
      const cleaned = value.replace(/[ÇçĞğİıÖöŞşÜü]/g, (ch) => {
        const map: Record<string, string> = { "ç": "c", "Ç": "C", "ğ": "g", "Ğ": "G", "İ": "I", "ı": "i", "ö": "ö", "Ö": "Ö", "ş": "s", "Ş": "S", "ü": "ü", "Ü": "Ü" };
        return map[ch] ?? ch;
      });
      setText(cleaned);
      return;
    }
    setText(value);
  }

  const p = PROMPTS[idx];
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const charCount = text.length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section className="surface p-6">
        <p className="eyebrow">Almanca düşün</p>
        <div className="flex items-center justify-between gap-3 mt-2">
          <h1 className="h-display text-2xl">Yalnızca Almanca yaz</h1>
          <span className={`cefr cefr-${p.level.toLowerCase()}`}>{p.level}</span>
        </div>
        <p className="mt-3 text-[15px] text-[color:var(--fg-muted)]">{p.tr}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-primary" onClick={start} disabled={running}>
            {running ? "Süre işliyor…" : "Başla (60 sn)"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={next}>Sonraki durum</button>
          <button type="button" className="btn btn-ghost" onClick={() => setShowHint((v) => !v)}>
            {showHint ? "İpucunu gizle" : "İpucu göster"}
          </button>
          <span className="ml-auto stat" style={{ padding: "0.25rem 0.625rem" }}>
            <span className="stat-label">Kalan</span>
            <span className="stat-value" style={{ fontSize: "1.25rem" }}>{secondsLeft}s</span>
          </span>
        </div>

        {showHint ? (
          <div className="surface-muted mt-4 p-3 text-sm">
            <span className="chip chip-primary mr-2">Hint</span>
            <span className="font-mono">{p.hint}</span>
          </div>
        ) : null}

        <textarea
          ref={taRef}
          className="textarea mt-4"
          rows={8}
          value={text}
          onChange={(e) => blockTurkish(e.target.value)}
          placeholder="Hier auf Deutsch schreiben — Türkçe karakterler otomatik temizlenir."
          disabled={!running}
        />

        <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--fg-subtle)]">
          <span>{wordCount} kelime · {charCount} karakter</span>
          <span>Hedef: 30+ kelime</span>
        </div>

        {!running && text.trim().length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/skills/schreiben?prefill=${encodeURIComponent(text)}`}
              className="btn btn-secondary"
            >
              AI ile kontrol et →
            </Link>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigator.clipboard.writeText(text).catch(() => {})}
            >
              Kopyala
            </button>
          </div>
        ) : null}
      </section>

      <aside className="surface p-5 h-fit">
        <p className="eyebrow">Neden işe yarıyor?</p>
        <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
          Beyin Türkçe → Almanca çeviri yapmak yerine doğrudan Almanca üretmeyi öğrenir.
          60 saniye baskı + Türkçe karakter blokesi = akıcılık antrenmanı.
        </p>
        <hr className="divider" />
        <p className="eyebrow">Bugünkü 3 hedef</p>
        <ul className="mt-2 space-y-1 text-sm">
          <li>· 5 farklı durum dene</li>
          <li>· Her metin 30+ kelime</li>
          <li>· En az 1 metni AI ile düzelt</li>
        </ul>
        <hr className="divider" />
        <Link href="/tagesziel" className="btn btn-secondary btn-block">Bugünün hedefine dön</Link>
      </aside>
    </div>
  );
}
