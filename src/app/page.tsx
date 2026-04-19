import Link from "next/link";
import { listStudySets, usingMockData } from "@/lib/data";
import TopNav from "@/components/top-nav";

type Tool = {
  href: string;
  emoji: string;
  title: string;
  desc: string;
  badge?: string;
  badgeClass?: string;
};

const tools: Tool[] = [
  {
    href: "/deutsch/artikel",
    emoji: "📕",
    title: "der · die · das",
    desc: "60+ A1/A2 isimle artikel hafızası — anlık geri bildirim ve Faustregeln.",
    badge: "A1 / A2",
    badgeClass: "chip-primary",
  },
  {
    href: "/deutsch/verben",
    emoji: "🔁",
    title: "Fiil çekim (Präsens)",
    desc: "Modal, yardımcı, düzenli, düzensiz — yazarak öğren.",
    badge: "A1 → B1",
    badgeClass: "chip-primary",
  },
  {
    href: "/deutsch/diktat",
    emoji: "🎧",
    title: "Diktat",
    desc: "Tarayıcının Almanca sesleriyle dinle, yaz, kelime kelime kontrol et.",
    badge: "Dinleme",
    badgeClass: "chip-accent",
  },
  {
    href: "/deutsch/saetze",
    emoji: "🧩",
    title: "Cümle kur",
    desc: "Karışık parçalardan doğru sıralı cümle — Almanca V2 mantığı için.",
    badge: "Yazma",
    badgeClass: "chip-accent",
  },
  {
    href: "/ai-workbench",
    emoji: "🤖",
    title: "AI Çalışma Tezgâhı",
    desc: "PDF / DOCX / not yükle: özet + flashcard + quiz tek tıkla.",
    badge: "AI",
    badgeClass: "chip-success",
  },
  {
    href: "/library",
    emoji: "📚",
    title: "Kütüphane",
    desc: "Hazır CEFR setleri ve oluşturduklarını tek panelde çalış.",
    badge: "Setler",
    badgeClass: "chip-warning",
  },
];

export default async function HomePage() {
  const sets = await listStudySets();
  const totalCards = sets.reduce((s, x) => s + x.cardCount, 0);
  const featured = sets.slice(0, 3);

  return (
    <>
      <TopNav active="/" />

      <main className="app-main app-container pt-8 md:pt-14">
        {/* HERO */}
        <section className="grid items-end gap-8 md:grid-cols-[1.35fr_1fr]">
          <div>
            <span className="chip chip-primary">
              <span className="status-dot live" /> Almanca öğrenme stüdyosu
            </span>
            <h1 className="h-display mt-5 text-4xl md:text-6xl">
              Almanca sınavını <span style={{ color: "var(--primary)" }}>geçeceksin</span>.
              Her gün 15 dakika, doğru araçla.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-[color:var(--fg-muted)] md:text-lg">
              telc · Goethe · ÖSD odaklı kart setleri, der/die/das alıştırması, fiil çekim, diktat ve AI ile
              kendi notlarından üretilen quizler — hepsi tek, sade panelde.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/deutsch" className="btn btn-primary btn-lg">Çalışmaya başla</Link>
              <Link href="/ai-workbench" className="btn btn-secondary btn-lg">Notlarımı yükle</Link>
              <Link href="/library" className="btn btn-ghost btn-lg">Hazır setlere bak</Link>
            </div>

            {usingMockData ? (
              <p className="mt-5 inline-flex items-center gap-2 text-sm text-[color:var(--fg-muted)]">
                <span className="status-dot warn" /> Demo modu — Supabase tanımlı değil. İlerleme cihaza özel kalır.
              </p>
            ) : null}
          </div>

          <div className="surface p-5 md:p-6 animate-slide-up">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Bugün</p>
              <span className="streak-flame" aria-hidden>🔥</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="stat">
                <span className="stat-label">Setler</span>
                <span className="stat-value">{sets.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Kart</span>
                <span className="stat-value">{totalCards}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Hedef</span>
                <span className="stat-value">15dk</span>
              </div>
              <div className="stat">
                <span className="stat-label">Seri</span>
                <span className="stat-value">1</span>
              </div>
            </div>

            <hr className="divider" />

            <p className="eyebrow">Hızlı eylemler</p>
            <div className="mt-3 grid gap-2">
              <Link href="/deutsch/artikel" className="btn btn-secondary justify-between btn-block">
                der/die/das alıştırması <span aria-hidden>→</span>
              </Link>
              <Link href="/deutsch/verben" className="btn btn-secondary justify-between btn-block">
                Fiil çekim çalıştır <span aria-hidden>→</span>
              </Link>
              <Link href="/deutsch/diktat" className="btn btn-secondary justify-between btn-block">
                Diktat dinle <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* TOOLS */}
        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Tek panelde tüm araçlar</h2>
              <p className="section-subtitle">İhtiyacın olan her alıştırma — internet bile gerekmez.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <Link key={t.href} href={t.href} className="tile card-hover">
                <span className="tile-icon" aria-hidden>{t.emoji}</span>
                <span className="tile-title">{t.title}</span>
                <span className="tile-desc">{t.desc}</span>
                <span className="mt-auto inline-flex items-center justify-between text-xs">
                  {t.badge ? <span className={`chip ${t.badgeClass ?? ""}`}>{t.badge}</span> : <span />}
                  <span className="text-[color:var(--primary)] font-semibold">Aç →</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* FEATURED SETS */}
        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Öne çıkan setler</h2>
              <p className="section-subtitle">CEFR seviyeleriyle hazır kart desteleri.</p>
            </div>
            <Link href="/library" className="btn btn-secondary btn-sm">Tümünü gör</Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featured.length === 0 ? (
              <div className="surface-muted p-6 text-center text-sm text-[color:var(--fg-muted)]">
                Henüz set yok. AI ile veya elle ilk setini oluştur.
              </div>
            ) : (
              featured.map((s) => {
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

        {/* WHY US */}
        <section className="mt-16 surface p-6 md:p-10">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <span className="eyebrow">Neden LetMeQuiz</span>
              <h3 className="h-display mt-2 text-2xl md:text-3xl">Sınavı geçtiren rutin.</h3>
              <p className="mt-3 text-sm text-[color:var(--fg-muted)]">
                Goethe ve telc kalıplarından beslenen hazır setler, AI ile kendi notlarına uyarlanmış quizler ve
                kısa alıştırmalar — günde 15 dakikada bile fark yaratır.
              </p>
            </div>
            <div className="grid gap-3">
              <p className="text-sm font-semibold">Sınav formatına yakın</p>
              <p className="text-sm text-[color:var(--fg-muted)]">Sınav türünden bağımsız çalışır; A1’den B2’ye kadar günlük rutinleri kapsar.</p>
            </div>
            <div className="grid gap-3">
              <p className="text-sm font-semibold">Mobil öncelikli</p>
              <p className="text-sm text-[color:var(--fg-muted)]">Otobüste, kuyruklarda, kahve molasında — alt menüden tek dokunuşla çalışmaya devam et.</p>
            </div>
          </div>
        </section>

        <footer className="mt-16 border-t border-[color:var(--border)] py-8">
          <div className="flex flex-col items-center justify-between gap-3 text-sm text-[color:var(--fg-muted)] md:flex-row">
            <p>LetMeQuiz · {new Date().getFullYear()} · Berlin’den selamlar 👋</p>
            <div className="flex gap-4">
              <Link href="/deutsch" className="hover:text-[color:var(--fg)]">Almanca</Link>
              <Link href="/ai-workbench" className="hover:text-[color:var(--fg)]">AI Tezgâh</Link>
              <Link href="/library" className="hover:text-[color:var(--fg)]">Kütüphane</Link>
              <Link href="/analytics" className="hover:text-[color:var(--fg)]">İlerleme</Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
