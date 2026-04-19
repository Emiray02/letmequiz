import Link from "next/link";
import TopNav from "@/components/top-nav";

type Tool = {
  href: string;
  emoji: string;
  title: string;
  desc: string;
  level: string;
};

const tools: Tool[] = [
  { href: "/deutsch/artikel",  emoji: "📕", title: "der · die · das", desc: "Artikel hafızası — 60+ A1/A2 isim, anlık geri bildirim ve Faustregeln.", level: "A1–A2" },
  { href: "/deutsch/verben",   emoji: "🔁", title: "Fiil çekim",       desc: "Präsens çekim alıştırması: yardımcı, modal, düzenli, düzensiz fiiller.", level: "A1–B1" },
  { href: "/deutsch/diktat",   emoji: "🎧", title: "Diktat",           desc: "Almanca cümleyi dinle, yaz, kelime kelime kontrol et.", level: "A1–B1" },
  { href: "/deutsch/saetze",   emoji: "🧩", title: "Cümle kur",        desc: "Karışık parçalardan doğru kelime sıralı cümle oluştur.", level: "A1–B1" },
  { href: "/ai-workbench",     emoji: "🤖", title: "AI Çalışma Tezgâhı", desc: "Kendi notunu yükle: özet + flashcard + quiz tek tıkla.", level: "Hepsi" },
  { href: "/library",          emoji: "📚", title: "Kütüphane",         desc: "Hazır setler ve oluşturduklarını tek yerden çalış.", level: "Hepsi" },
];

const cefrPath = [
  { code: "A1", title: "Başlangıç", desc: "Selamlaşma, sayı, alışveriş, basit cümleler.", colorClass: "cefr-a1" },
  { code: "A2", title: "Temel",     desc: "Günlük rutin, sağlık, ulaşım, geçmiş zaman.",   colorClass: "cefr-a2" },
  { code: "B1", title: "Orta",      desc: "İş hayatı, fikir bildirme, dilek/kipler.",        colorClass: "cefr-b1" },
  { code: "B2", title: "Üst orta",  desc: "Soyut konular, akıcı tartışma, uzun metinler.",  colorClass: "cefr-b2" },
];

export default function DeutschHubPage() {
  return (
    <>
      <TopNav active="/deutsch" />

      <main className="app-main app-container pt-8 md:pt-12">
        <header className="grid items-end gap-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <span className="chip chip-primary">
              <span className="status-dot live" /> Almanca Stüdyosu
            </span>
            <h1 className="h-display mt-4 text-4xl md:text-5xl">
              Almanca sınavını <span style={{ color: "var(--primary)" }}>geçmek için</span> tek panel.
            </h1>
            <p className="mt-3 max-w-2xl text-base text-[color:var(--fg-muted)]">
              Seviyeye göre kelime kartları, der/die/das alıştırması, fiil çekim, diktat ve cümle yapma —
              hepsi günlük 15 dakikada işine yarayacak şekilde tasarlandı.
            </p>
          </div>

          <div className="surface p-5">
            <p className="eyebrow">CEFR yol haritası</p>
            <ol className="mt-3 grid gap-2">
              {cefrPath.map((step) => (
                <li key={step.code} className="flex items-start gap-3">
                  <span className={`cefr ${step.colorClass}`}>{step.code}</span>
                  <div>
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="text-xs text-[color:var(--fg-muted)]">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </header>

        <section className="mt-12">
          <h2 className="section-title">Çalışma araçları</h2>
          <p className="section-subtitle">Hangisini açarsan aç — tarayıcıda anında çalışır, internet gerekmez.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <Link key={t.href} href={t.href} className="tile card-hover">
                <span className="tile-icon" aria-hidden>{t.emoji}</span>
                <span className="tile-title">{t.title}</span>
                <span className="tile-desc">{t.desc}</span>
                <span className="mt-auto inline-flex items-center justify-between text-xs">
                  <span className="chip">{t.level}</span>
                  <span className="text-[color:var(--primary)] font-semibold">Aç →</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 surface p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[1.2fr_1fr] items-center">
            <div>
              <span className="eyebrow">Sınav modu</span>
              <h3 className="h-display mt-2 text-2xl md:text-3xl">telc A2 / Goethe Zertifikat A2</h3>
              <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
                Sınav formatına uygun deneme kelimeleri, randevu/şikayet/iş başvuru kalıpları ve
                örnek dinleme cümleleri seninle çalışmaya hazır.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/deutsch/artikel" className="btn btn-primary">der/die/das başlat</Link>
                <Link href="/deutsch/diktat" className="btn btn-secondary">Diktat çalış</Link>
                <Link href="/library" className="btn btn-ghost">Hazır setlere bak</Link>
              </div>
            </div>
            <ul className="grid gap-2 text-sm">
              <li className="flex items-center gap-2"><span className="status-dot live" /> 60+ Artikel kartı, ipuçlarıyla</li>
              <li className="flex items-center gap-2"><span className="status-dot live" /> 20 fiilin tüm Präsens formları</li>
              <li className="flex items-center gap-2"><span className="status-dot live" /> 14 diktat cümlesi (A1/A2/B1)</li>
              <li className="flex items-center gap-2"><span className="status-dot live" /> Cümle parçalarından kelime sıralama</li>
              <li className="flex items-center gap-2"><span className="status-dot live" /> AI ile kendi notlarını seti yap</li>
            </ul>
          </div>
        </section>
      </main>
    </>
  );
}
