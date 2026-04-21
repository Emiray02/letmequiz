import Link from "next/link";
import { listStudySets } from "@/lib/data";
import HomePlanCard from "@/components/home-plan-card";

type Tile = { href: string; title: string; desc: string; icon: string };

const ICONS: Record<string, string> = {
  brain:  "M9 4.5a3 3 0 0 0-3 3v.4A2.5 2.5 0 0 0 4 10.4v3.2A2.5 2.5 0 0 0 6 16v.5a3 3 0 0 0 3 3M15 4.5a3 3 0 0 1 3 3v.4a2.5 2.5 0 0 1 2 2.5v3.2a2.5 2.5 0 0 1-2 2.4v.5a3 3 0 0 1-3 3M12 4v16",
  read:   "M3 5h7a3 3 0 0 1 3 3v11a2 2 0 0 0-2-2H3zM21 5h-7a3 3 0 0 0-3 3v11a2 2 0 0 1 2-2h8z",
  ear:    "M6 12a6 6 0 1 1 12 0v3a3 3 0 0 1-6 0M9 9v3a3 3 0 0 0 3 3",
  pen:    "M12 19l7-7-3-3-7 7v3zM14 6l4 4M5 19h4",
  spark:  "M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6 8 8M16 16l2.4 2.4M5.6 18.4 8 16M16 8l2.4-2.4",
  book:   "M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 0 2 2h12",
};

const ESSENTIALS: Tile[] = [
  { href: "/wortschatz",       title: "Wortschatz",       desc: "Aralıklı tekrar (SRS) kelime quizleri.",         icon: ICONS.brain },
  { href: "/skills/lesen",     title: "Lesen",            desc: "telc Lesetext + AI geri bildirim.",              icon: ICONS.read },
  { href: "/skills/hoeren",    title: "Hören",            desc: "151 Hörtext + dictogloss çalışması.",            icon: ICONS.ear },
  { href: "/skills/schreiben", title: "Schreiben",        desc: "E-posta yaz, AI Türkçe açıklamayla düzeltsin.",  icon: ICONS.pen },
  { href: "/grammar",          title: "Gramer atölyesi",  desc: "Konjugator, cümle doktoru, Wortfamilie.",        icon: ICONS.spark },
  { href: "/grammar/lessons",  title: "Konu anlatımı",    desc: "12 dersli A1→B1 gramer rehberi.",                icon: ICONS.book },
];

function TileIcon({ d }: { d: string }) {
  return (
    <span className="tile-icon" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    </span>
  );
}

export default async function HomePage() {
  const sets = await listStudySets();
  const totalCards = sets.reduce((s, x) => s + x.cardCount, 0);

  return (
    <>
      <section className="grid items-center gap-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <span className="chip chip-primary">
            <span className="status-dot live" /> Almanca öğrenme stüdyosu
          </span>
          <h1 className="h-display mt-4 text-3xl md:text-5xl">
            Bugün <span style={{ color: "var(--primary)" }}>15 dakika</span> Almanca.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] text-[color:var(--fg-muted)] md:text-base">
            Öğretmenin sana bir telc planı verdiyse, bugünün görevleri tek tıkla burada.
            Plan yoksa kendi tempoda Wortschatz ve becerilerle başla.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/heute" className="btn btn-primary btn-lg">Bugün çalış →</Link>
            <Link href="/wortschatz" className="btn btn-secondary btn-lg">Wortschatz</Link>
          </div>
        </div>

        <HomePlanCard />
      </section>

      <section className="mt-12">
        <header className="mb-5">
          <h2 className="section-title">Hızlı başla</h2>
          <p className="section-subtitle">En çok kullanılan 6 araç. Diğer her şey kenar çubuğunda “Daha fazla” altında.</p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ESSENTIALS.map((t) => (
            <Link key={t.href} href={t.href} className="tile card-hover">
              <TileIcon d={t.icon} />
              <span className="tile-title">{t.title}</span>
              <span className="tile-desc">{t.desc}</span>
              <span className="mt-auto pt-3 text-[13px] font-semibold text-[color:var(--primary)]">Aç →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <header className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="section-title">Öne çıkan setler</h2>
            <p className="section-subtitle">CEFR seviyeli hazır kart desteleri ({totalCards} kart toplam).</p>
          </div>
          <Link href="/library" className="btn btn-ghost btn-sm">Tümü →</Link>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sets.length === 0 ? (
            <div className="surface-muted p-6 text-center text-sm text-[color:var(--fg-muted)]">
              Henüz set yok. AI ile veya elle ilk setini oluştur.
            </div>
          ) : (
            sets.slice(0, 3).map((s) => {
              const m = s.title.match(/\b(A1|A2|B1|B2|C1|C2)\b/i);
              const code = m ? m[1].toUpperCase() : null;
              return (
                <Link key={s.id} href={`/set/${s.id}`} className="card card-hover flex h-full flex-col">
                  <div className="flex items-center justify-between gap-2">
                    {code ? <span className={`cefr cefr-${code.toLowerCase()}`}>{code}</span> : <span className="chip">Set</span>}
                    <span className="text-xs text-[color:var(--fg-subtle)]">{s.cardCount} kart</span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold leading-tight">{s.title}</h3>
                  <p className="mt-1 text-sm text-[color:var(--fg-muted)] line-clamp-3">{s.description}</p>
                  <span className="mt-auto pt-4 text-sm font-semibold text-[color:var(--primary)]">Setı aç →</span>
                </Link>
              );
            })
          )}
        </div>
      </section>

      <footer className="mt-16 mb-4 text-center text-xs text-[color:var(--fg-subtle)]">
        LetMeQuiz · Almanca öğrenme stüdyosu · {new Date().getFullYear()}
      </footer>
    </>
  );
}
