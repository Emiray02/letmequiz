import Link from "next/link";
import { listStudySets, usingMockData } from "@/lib/data";
import TopNav from "@/components/top-nav";
import HomeSetGrid from "@/components/home-set-grid";

type Feature = {
  href: string;
  title: string;
  description: string;
  badge: string;
  badgeClass: string;
};

const features: Feature[] = [
  {
    href: "/ai-workbench",
    title: "AI Çalışma Tezgâhı",
    description:
      "PDF, DOCX veya not dosyalarını yükle; özet, sözlük, flashcard ve quiz olarak otomatik üretilsin.",
    badge: "Yapay zeka",
    badgeClass: "chip-primary",
  },
  {
    href: "/create",
    title: "Kendi Setini Oluştur",
    description:
      "Kelime, kalıp ve cümleleri kart olarak ekle; çalışma ve quiz modlarında pratik yap.",
    badge: "Manuel",
    badgeClass: "chip-accent",
  },
  {
    href: "/classroom",
    title: "Sınıf Modu",
    description:
      "Öğretmen ve sınıf arkadaşlarınla canlı çalışma odası, ortak setler ve ilerleme paylaşımı.",
    badge: "Birlikte",
    badgeClass: "chip-success",
  },
  {
    href: "/parent",
    title: "Veli Paneli",
    description:
      "Çocuğunun çalışma süresini, doğruluk oranını ve hedeflerini güvenli şekilde takip et.",
    badge: "Veli",
    badgeClass: "chip-warning",
  },
  {
    href: "/analytics",
    title: "Çalışma Analitiği",
    description:
      "Haftalık aktivite, doğruluk eğilimi ve odak alanlarını tek bir panelde gör.",
    badge: "İçgörü",
    badgeClass: "chip",
  },
];

export default async function HomePage() {
  const studySets = await listStudySets();
  const totalCards = studySets.reduce((sum, set) => sum + set.cardCount, 0);

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav active="/" />

      <main className="app-container flex-1 pb-24 pt-10 md:pt-14">
        <section className="grid items-end gap-8 md:grid-cols-[1.3fr_1fr]">
          <div>
            <span className="chip chip-primary">
              <span className="status-dot live" /> Dil öğrenme stüdyosu
            </span>
            <h1 className="h-display mt-5 text-4xl md:text-6xl">
              Notlarını AI ile dakikalar içinde{" "}
              <span style={{ color: "var(--primary)" }}>çalışılabilir</span> hale getir.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-[color:var(--fg-muted)] md:text-lg">
              LetMeQuiz; flashcard, quiz, AI özet ve sınıf modunu tek bir sade arayüzde
              birleştirir. Almanca, İngilizce ya da kendi notların — hepsi için profesyonel
              bir çalışma akışı.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/ai-workbench" className="btn btn-primary btn-lg">
                AI ile başla
              </Link>
              <Link href="/create" className="btn btn-secondary btn-lg">
                Boş set oluştur
              </Link>
            </div>

            {usingMockData ? (
              <p className="mt-5 inline-flex items-center gap-2 text-sm text-[color:var(--fg-muted)]">
                <span className="status-dot warn" /> Demo modu aktif — Supabase değişkenleri tanımlı değil.
              </p>
            ) : null}
          </div>

          <div className="surface p-5 md:p-6">
            <p className="text-sm font-semibold text-[color:var(--fg-muted)]">Kütüphanen</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="surface-muted p-4">
                <p className="text-xs uppercase tracking-wide text-[color:var(--fg-subtle)]">Set</p>
                <p className="mt-1 text-2xl font-semibold">{studySets.length}</p>
              </div>
              <div className="surface-muted p-4">
                <p className="text-xs uppercase tracking-wide text-[color:var(--fg-subtle)]">Kart</p>
                <p className="mt-1 text-2xl font-semibold">{totalCards}</p>
              </div>
            </div>
            <hr className="divider" />
            <p className="text-sm font-semibold text-[color:var(--fg-muted)]">Hızlı eylemler</p>
            <div className="mt-3 grid gap-2">
              <Link href="/ai-workbench" className="btn btn-secondary justify-between">
                Notlarımı yükle <span aria-hidden>→</span>
              </Link>
              <Link href="/create" className="btn btn-secondary justify-between">
                Yeni set oluştur <span aria-hidden>→</span>
              </Link>
              <Link href="/analytics" className="btn btn-ghost justify-between">
                İstatistiklerimi gör <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Tek bir uygulama, eksiksiz akış</h2>
              <p className="section-subtitle">
                Çalışmak, paylaşmak ve takip etmek için ihtiyacın olan her şey.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Link key={feature.href} href={feature.href} className="card card-hover flex h-full flex-col">
                <span className={`chip ${feature.badgeClass} self-start`}>{feature.badge}</span>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-[color:var(--fg-muted)]">{feature.description}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--primary)]">
                  Aç <span aria-hidden>→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Çalışma setlerin</h2>
              <p className="section-subtitle">
                {studySets.length === 0
                  ? "Henüz set yok. AI ile veya elle ilk setini oluştur."
                  : `${studySets.length} set kütüphanende.`}
              </p>
            </div>
            <Link href="/create" className="btn btn-secondary btn-sm">
              Yeni set
            </Link>
          </div>

          <div className="mt-6">
            <HomeSetGrid sets={studySets} />
          </div>
        </section>
      </main>

      <footer className="border-t border-[color:var(--border)] py-8">
        <div className="app-container flex flex-col items-center justify-between gap-3 text-sm text-[color:var(--fg-muted)] md:flex-row">
          <p>LetMeQuiz · {new Date().getFullYear()}</p>
          <div className="flex gap-4">
            <Link href="/ai-workbench" className="hover:text-[color:var(--fg)]">AI Çalışma</Link>
            <Link href="/analytics" className="hover:text-[color:var(--fg)]">Analiz</Link>
            <Link href="/classroom" className="hover:text-[color:var(--fg)]">Sınıf</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}