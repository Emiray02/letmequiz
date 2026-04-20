import Link from "next/link";

const TOOLS = [
  { href: "/grammar/lessons",    title: "Konu anlatımı", desc: "A1–B1 gramer dersleri: kural, tablo, örnek, dikkat noktaları." },
  { href: "/grammar/konjugator", title: "Konjugator", desc: "Herhangi bir fiil — tüm şahıs ve zamanlar." },
  { href: "/grammar/doctor",     title: "Cümle doktoru", desc: "Cümle yapıştır — yapı, hatalar, alternatifler." },
  { href: "/cloze",              title: "C-Test (Cloze)", desc: "telc Lesetext'lerden otomatik boşluklu metin." },
  { href: "/wortfamilie",        title: "Wortfamilie", desc: "Bir kök → tüm kelime ailesi (AI ile)." },
];

export const metadata = { title: "Gramer · LetMeQuiz" };

export default function GrammarHub() {
  return (
    <>
      <header className="mb-6">
        <span className="chip chip-primary">Grammatik</span>
        <h1 className="h-display mt-3 text-3xl md:text-4xl">Gramer atölyesi</h1>
        <p className="section-subtitle">Çekim, yapı analizi, kelime aileleri — tek panelde.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {TOOLS.map(t => (
          <Link key={t.href} href={t.href} className="tile card-hover">
            <span className="tile-title">{t.title}</span>
            <span className="tile-desc">{t.desc}</span>
            <span className="mt-auto pt-3 text-[13px] font-semibold text-[color:var(--primary)]">Aç →</span>
          </Link>
        ))}
      </div>
    </>
  );
}
