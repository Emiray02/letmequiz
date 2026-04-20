"use client";

import Link from "next/link";
import { useState } from "react";

type Template = {
  id: string;
  level: "A2" | "B1" | "B2";
  type: string;
  title: string;
  intro: string;
  blocks: Array<{ key: string; label: string; placeholder: string; }>;
  /** Pieces in order; "{key}" markers will be replaced by user input. */
  pieces: string[];
};

const TEMPLATES: Template[] = [
  {
    id: "einladung",
    level: "A2", type: "E-Mail", title: "Einladung — Davet",
    intro: "Bir arkadaşı doğum gününe / etkinliğe davet et.",
    blocks: [
      { key: "name", label: "Arkadaşın adı", placeholder: "Anna" },
      { key: "anlass", label: "Vesile", placeholder: "meinem Geburtstag" },
      { key: "datum", label: "Tarih ve saat", placeholder: "am Samstag um 19 Uhr" },
      { key: "ort", label: "Yer", placeholder: "bei mir zu Hause" },
      { key: "frage", label: "Soru", placeholder: "Kannst du kommen?" },
    ],
    pieces: [
      "Liebe/Lieber {name},\n\n",
      "ich möchte dich zu {anlass} einladen. Die Feier ist {datum} {ort}. ",
      "{frage}\n\n",
      "Ich freue mich auf deine Antwort.\n\nViele Grüße",
    ],
  },
  {
    id: "beschwerde",
    level: "B1", type: "Brief", title: "Beschwerde — Şikayet mektubu",
    intro: "Satın aldığın bir ürünle ilgili resmî şikayet.",
    blocks: [
      { key: "produkt", label: "Ürün", placeholder: "Kaffeemaschine" },
      { key: "datum", label: "Satın alma tarihi", placeholder: "am 5. März" },
      { key: "problem", label: "Sorun", placeholder: "funktioniert nicht richtig" },
      { key: "wunsch", label: "Talep", placeholder: "eine neue Maschine oder mein Geld zurück" },
    ],
    pieces: [
      "Sehr geehrte Damen und Herren,\n\n",
      "ich habe {datum} bei Ihnen eine {produkt} gekauft. Leider {problem}. ",
      "Ich bitte Sie deshalb um {wunsch}.\n\n",
      "Mit freundlichen Grüßen",
    ],
  },
  {
    id: "anfrage",
    level: "A2", type: "E-Mail", title: "Anfrage — Bilgi talebi",
    intro: "Bir kursa/etkinliğe katılmak için bilgi iste.",
    blocks: [
      { key: "kurs", label: "Kurs / Etkinlik", placeholder: "den Deutschkurs A2" },
      { key: "wann", label: "Ne zaman başlamak istiyorsun", placeholder: "im Mai" },
      { key: "fragen", label: "Sormak istediğin", placeholder: "wie viel der Kurs kostet und wann er beginnt" },
    ],
    pieces: [
      "Sehr geehrte Damen und Herren,\n\n",
      "ich interessiere mich für {kurs} und möchte {wann} anfangen. ",
      "Können Sie mir bitte sagen, {fragen}?\n\n",
      "Vielen Dank im Voraus.\n\nMit freundlichen Grüßen",
    ],
  },
  {
    id: "termin",
    level: "A2", type: "E-Mail", title: "Termin verschieben — Randevu erteleme",
    intro: "Doktor / iş / hizmet randevusunu nazikçe ertele.",
    blocks: [
      { key: "termin", label: "Mevcut randevu", placeholder: "meinen Termin am Montag" },
      { key: "grund", label: "Sebep", placeholder: "ich krank bin" },
      { key: "neu", label: "Yeni öneri", placeholder: "nächste Woche" },
    ],
    pieces: [
      "Sehr geehrte Damen und Herren,\n\n",
      "leider kann ich {termin} nicht wahrnehmen, weil {grund}. ",
      "Können wir den Termin auf {neu} verschieben?\n\n",
      "Vielen Dank für Ihr Verständnis.\n\nMit freundlichen Grüßen",
    ],
  },
  {
    id: "bewerbung",
    level: "B1", type: "Brief", title: "Bewerbung — İş başvurusu",
    intro: "Bir iş ilanına kısa motivasyon mektubu.",
    blocks: [
      { key: "stelle", label: "Pozisyon", placeholder: "die Stelle als Verkäuferin" },
      { key: "wo", label: "Nerede gördün", placeholder: "in der Zeitung vom 12. April" },
      { key: "erfahrung", label: "Deneyimin", placeholder: "drei Jahre als Kassiererin" },
      { key: "warum", label: "Neden", placeholder: "ich gerne mit Menschen arbeite" },
    ],
    pieces: [
      "Sehr geehrte Damen und Herren,\n\n",
      "hiermit bewerbe ich mich um {stelle}, die ich {wo} gesehen habe. ",
      "Ich habe {erfahrung}. ",
      "Mich interessiert die Stelle, weil {warum}.\n\n",
      "Über eine Einladung zum Vorstellungsgespräch würde ich mich sehr freuen.\n\nMit freundlichen Grüßen",
    ],
  },
  {
    id: "wohnung",
    level: "B1", type: "E-Mail", title: "Wohnungsanfrage — Daire sorma",
    intro: "İlandaki daire için bilgi iste / görmek için randevu al.",
    blocks: [
      { key: "wo", label: "İlan kaynağı", placeholder: "auf Immobilienscout24" },
      { key: "details", label: "Hangi bilgileri istiyorsun", placeholder: "die genauen Nebenkosten und ob Haustiere erlaubt sind" },
      { key: "wann", label: "Ne zaman görebilirsin", placeholder: "am Wochenende" },
    ],
    pieces: [
      "Sehr geehrte Damen und Herren,\n\n",
      "ich habe Ihre Anzeige {wo} gesehen und interessiere mich für die Wohnung. ",
      "Könnten Sie mir bitte {details} mitteilen? Ich hätte auch gerne einen Besichtigungstermin {wann}.\n\n",
      "Vielen Dank im Voraus.\n\nMit freundlichen Grüßen",
    ],
  },
  {
    id: "entschuldigung",
    level: "A2", type: "Notiz", title: "Entschuldigung — Mazeret notu",
    intro: "Çocuğun okuldan / kendinin işten devamsızlığını bildir.",
    blocks: [
      { key: "person", label: "Kim", placeholder: "mein Sohn Tim" },
      { key: "tag", label: "Hangi gün", placeholder: "heute" },
      { key: "grund", label: "Sebep", placeholder: "er Fieber hat" },
    ],
    pieces: [
      "Sehr geehrte Damen und Herren,\n\n",
      "ich möchte Sie informieren, dass {person} {tag} nicht kommen kann, weil {grund}. ",
      "Vielen Dank für Ihr Verständnis.\n\nMit freundlichen Grüßen",
    ],
  },
  {
    id: "danksagung",
    level: "A2", type: "E-Mail", title: "Danksagung — Teşekkür",
    intro: "Bir hediye / yardım için teşekkür et.",
    blocks: [
      { key: "name", label: "Kime", placeholder: "Maria" },
      { key: "wofuer", label: "Ne için", placeholder: "das schöne Geschenk" },
      { key: "gefuhl", label: "Ne hissettin", placeholder: "ich habe mich sehr gefreut" },
    ],
    pieces: [
      "Liebe/Lieber {name},\n\n",
      "ich möchte dir herzlich für {wofuer} danken. {gefuhl}.\n\n",
      "Bis bald, viele Grüße",
    ],
  },
  {
    id: "forum",
    level: "B1", type: "Forum", title: "Forum-Beitrag — Forum cevabı",
    intro: "Bir forumda görüşünü belirt (telc B1 yazma görevi).",
    blocks: [
      { key: "thema", label: "Konu", placeholder: "Smartphones in der Schule" },
      { key: "meinung", label: "Görüşün", placeholder: "ich finde es nicht gut" },
      { key: "grund1", label: "1. sebep", placeholder: "die Schüler sich nicht konzentrieren können" },
      { key: "grund2", label: "2. sebep", placeholder: "es zu viele Streitigkeiten gibt" },
    ],
    pieces: [
      "Hallo zusammen,\n\n",
      "zum Thema „{thema}\" möchte ich Folgendes sagen. ",
      "{meinung}, weil {grund1}. Außerdem ist es problematisch, dass {grund2}. ",
      "Was meint ihr dazu?\n\nViele Grüße",
    ],
  },
  {
    id: "krank",
    level: "A2", type: "Notiz", title: "Krankmeldung — Hastalık bildirimi",
    intro: "Patrona kısa hastalık bildirimi.",
    blocks: [
      { key: "tag", label: "Bugün/yarın", placeholder: "heute" },
      { key: "grund", label: "Belirti", placeholder: "ich starke Halsschmerzen habe" },
      { key: "wann", label: "Geri dönüş", placeholder: "übermorgen" },
    ],
    pieces: [
      "Sehr geehrte/r Frau/Herr ___,\n\n",
      "ich kann {tag} leider nicht zur Arbeit kommen, weil {grund}. ",
      "Ich hoffe, dass ich {wann} wieder fit bin. ",
      "Den Krankenschein bringe ich morgen.\n\nMit freundlichen Grüßen",
    ],
  },
  {
    id: "vorschlag",
    level: "B1", type: "E-Mail", title: "Vorschlag machen — Öneri sun",
    intro: "Bir arkadaşına ortak plan öner.",
    blocks: [
      { key: "name", label: "Kime", placeholder: "Lukas" },
      { key: "plan", label: "Öneri", placeholder: "am Wochenende ins Kino zu gehen" },
      { key: "wann", label: "Ne zaman", placeholder: "Samstagabend um 19 Uhr" },
      { key: "frage", label: "Soru", placeholder: "Was hältst du davon?" },
    ],
    pieces: [
      "Hallo {name},\n\n",
      "wie wäre es, wenn wir {plan}? Ich dachte an {wann}. ",
      "{frage}\n\n",
      "Schreib mir bitte zurück.\n\nLiebe Grüße",
    ],
  },
  {
    id: "kuendigung",
    level: "B1", type: "Brief", title: "Kündigung — Üyelik / abonelik fesih",
    intro: "Spor salonu / dergi aboneliğini iptal et.",
    blocks: [
      { key: "vertrag", label: "Anlaşma", placeholder: "meine Mitgliedschaft Nr. 12345" },
      { key: "datum", label: "Tarih", placeholder: "zum 30. Juni" },
      { key: "bitte", label: "Talep", placeholder: "mir die Kündigung schriftlich zu bestätigen" },
    ],
    pieces: [
      "Sehr geehrte Damen und Herren,\n\n",
      "hiermit kündige ich {vertrag} fristgerecht {datum}. ",
      "Bitte {bitte}.\n\n",
      "Mit freundlichen Grüßen",
    ],
  },
];

function fill(t: Template, vals: Record<string, string>): string {
  return t.pieces.map(p => p.replace(/\{(\w+)\}/g, (_, k) => vals[k]?.trim() || `___`)).join("");
}

export default function VorlagenPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const t = TEMPLATES.find(x => x.id === activeId);

  if (!t) {
    return (
      <>
        <header className="mb-6">
          <span className="chip chip-primary">Schreiben · Vorlagen</span>
          <h1 className="h-display mt-3 text-3xl md:text-4xl">Yazma şablon fabrikası</h1>
          <p className="section-subtitle">12 telc/Goethe formatı. Boşlukları doldur, hazır metnini al ve <Link href="/skills/schreiben" className="link">AI'a kontrol ettir</Link>.</p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map(t => (
            <button key={t.id} type="button" onClick={() => { setActiveId(t.id); setVals({}); }} className="tile card-hover text-left">
              <div className="flex items-baseline justify-between">
                <span className={`cefr cefr-${t.level.toLowerCase()}`}>{t.level}</span>
                <span className="chip chip-soft text-[10px]">{t.type}</span>
              </div>
              <span className="tile-title">{t.title}</span>
              <span className="tile-desc">{t.intro}</span>
            </button>
          ))}
        </div>
      </>
    );
  }

  const text = fill(t, vals);
  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => setActiveId(null)}>← Şablonlar</button>
          <h1 className="h-display mt-2 text-2xl md:text-3xl">{t.title}</h1>
          <p className="text-sm text-[color:var(--fg-muted)]">{t.intro}</p>
        </div>
        <span className={`cefr cefr-${t.level.toLowerCase()}`}>{t.level}</span>
      </header>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="surface p-5">
          <p className="eyebrow">Boşlukları doldur</p>
          <div className="mt-3 grid gap-3">
            {t.blocks.map(b => (
              <label key={b.key}>
                <span className="label">{b.label}</span>
                <input className="input" value={vals[b.key] ?? ""} placeholder={b.placeholder} onChange={e => setVals(v => ({ ...v, [b.key]: e.target.value }))} />
              </label>
            ))}
          </div>
        </div>
        <div className="surface p-5">
          <p className="eyebrow">Hazır metin</p>
          <pre className="mt-3 whitespace-pre-wrap rounded-md bg-[color:var(--bg-muted)] p-4 text-[14px] leading-7">{text}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard?.writeText(text)}>Kopyala</button>
            <Link href={`/skills/schreiben?prefill=${encodeURIComponent(text)}`} className="btn btn-primary btn-sm">AI ile kontrol et →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
