import Link from "next/link";
import { listStudySets } from "@/lib/data";
import { materialsTotals } from "@/lib/materials-data";

type ToolGroup = {
  id: string;
  title: string;
  hint: string;
  items: ToolItem[];
};

type ToolItem = {
  href: string;
  title: string;
  desc: string;
  icon: string;
};

const ICONS: Record<string, string> = {
  brain:    "M9 4.5a3 3 0 0 0-3 3v.4A2.5 2.5 0 0 0 4 10.4v3.2A2.5 2.5 0 0 0 6 16v.5a3 3 0 0 0 3 3M15 4.5a3 3 0 0 1 3 3v.4a2.5 2.5 0 0 1 2 2.5v3.2a2.5 2.5 0 0 1-2 2.4v.5a3 3 0 0 1-3 3M12 4v16",
  letters:  "M5 19V8l3-3 4 6 4-6 3 3v11",
  rotate:   "M3 12a9 9 0 0 1 15-6.7L21 8M21 4v4h-4M21 12a9 9 0 0 1-15 6.7L3 16M3 20v-4h4",
  ear:      "M6 12a6 6 0 1 1 12 0v3a3 3 0 0 1-6 0M9 9v3a3 3 0 0 0 3 3",
  blocks:   "M3 5h7v7H3zM14 5h7v7h-7zM3 16h7v3H3zM14 12h7v7h-7z",
  read:     "M3 5h7a3 3 0 0 1 3 3v11a2 2 0 0 0-2-2H3zM21 5h-7a3 3 0 0 0-3 3v11a2 2 0 0 1 2-2h8z",
  pen:      "M12 19l7-7-3-3-7 7v3zM14 6l4 4M5 19h4",
  mic:      "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  target:   "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10z",
  folder:   "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  film:     "M3 5h18v14H3zM3 9h18M3 15h18M7 5v14M17 5v14",
  spark:    "M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6 8 8M16 16l2.4 2.4M5.6 18.4 8 16M16 8l2.4-2.4",
  book:     "M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 0 2 2h12",
};

const GROUPS: ToolGroup[] = [
  {
    id: "daily",
    title: "Günlük çalışma",
    hint: "Her gün 15 dakika — kalıcı öğrenme için kısa, sık tekrarlar.",
    items: [
      { href: "/tagesziel", title: "Bugünün hedefi", desc: "3 günlük görev + streak — günde 15 dk’lık tutarlı plan.", icon: ICONS.target },
      { href: "/wortschatz", title: "Wortschatz (SRS)", desc: "1.300+ DE↔TR kelime, aralıklı tekrar quizleri, artikel tahmini.", icon: ICONS.brain },
      { href: "/deutsch/artikel", title: "der · die · das", desc: "60+ A1/A2 isimle artikel hafızası ve faustregeln.", icon: ICONS.letters },
      { href: "/deutsch/verben", title: "Fiil çekim (Präsens)", desc: "Modal, yardımcı, düzenli, düzensiz — yazarak öğren.", icon: ICONS.rotate },
      { href: "/deutsch/diktat", title: "Diktat", desc: "Almanca sesle dinle, yaz, kelime kelime kontrol et.", icon: ICONS.ear },
      { href: "/deutsch/saetze", title: "Cümle kur", desc: "Karışık parçalardan doğru sıralı cümle — V2 mantığı.", icon: ICONS.blocks },
      { href: "/cloze", title: "C-Test (Cloze)", desc: "telc Lesetextlerinden otomatik üretilen kelime tamamlama testi.", icon: ICONS.read },
    ],
  },
  {
    id: "skills",
    title: "Beceriler · Skills",
    hint: "telc içeriğine bağlı, AI'ın kaynak metne göre puanladığı 4 beceri atölyesi.",
    items: [
      { href: "/skills/lesen",     title: "Lesen — Okuma",       desc: "24 telc Lesetext metnini oku, AI içerik tabanlı geri bildirim versin.", icon: ICONS.read },
      { href: "/skills/hoeren",    title: "Hören — Dinleme",     desc: "151 Hörtext + mp3 eşleşmesi; dictogloss ile yeniden anlat.",          icon: ICONS.ear },
      { href: "/skills/schreiben", title: "Schreiben — Yazma",   desc: "E-posta, forum cevabı yaz; AI hatalarını TR açıklamayla düzeltsin.",   icon: ICONS.pen },
      { href: "/skills/sprechen",  title: "Sprechen — Konuşma",  desc: "Sesli cevap ver, transkribe et, telaffuz ve akıcılık için geri bildirim al.", icon: ICONS.mic },
      { href: "/skills/schreiben/vorlagen", title: "Schreiben şablonları", desc: "telc/Goethe için 12 hazır mektup/e-posta şablonu — boşlukları doldur.", icon: ICONS.pen },
      { href: "/skills/sprechen/rollenspiel", title: "Sprechen Rollenspiel", desc: "AI ile fırın, doktor, daire görüşmesi gibi 6 rol oyunu.", icon: ICONS.mic },
      { href: "/aussprache", title: "Aussprache (Mic)", desc: "Minimal pair çiftleri — mikrofona söyle, benzerlik puanı al.", icon: ICONS.mic },
      { href: "/denken", title: "Almanca düşün", desc: "60 sn süre, Türkçe karakterler bloke — doğrudan Almanca üret.", icon: ICONS.spark },
    ],
  },
  {
    id: "exam",
    title: "Sınava hazırlık",
    hint: "telc · Goethe · ÖSD · TestDaF · DSH · YDS — sınav tarihine göre dinamik plan.",
    items: [
      { href: "/exam",      title: "Sınav planım",       desc: "Sınav tarihi + kurum gir, dinamik haftalık plan otomatik gelsin.",   icon: ICONS.target },
      { href: "/seviye",    title: "Seviye testi",       desc: "CEFR yerleştirme: 15 sorulukla A1–B2 arası seviyeni belirle.",      icon: ICONS.target },
      { href: "/materials", title: "telc materyalleri",  desc: "Einfach gut + Auf jeden Fall: 41 PDF + 299 mp3 — tek panelden eriş.", icon: ICONS.folder },
      { href: "/clips",     title: "Sitcom klipler",     desc: "Gerçek diyaloglarda kelime ve kalıbın kullanımı — DE + TR çeviri.",  icon: ICONS.film },
      { href: "/news",      title: "Almanca haberler",   desc: "A2/B1/B2 kısa haber metinleri + AI özet, sözlük ve sorular.",       icon: ICONS.read },
    ],
  },
  {
    id: "tools",
    title: "Araçlar",
    hint: "Kendi notlarından üret, ilerlemeni takip et.",
    items: [
      { href: "/grammar",       title: "Gramer atölyesi",   desc: "Konjugator, cümle doktoru, C-Test, Wortfamilie — tek hub.",      icon: ICONS.spark },
      { href: "/fehlerheft",    title: "Hata defterim",      desc: "AI’nin yakaladığı hatalar haftalık quiz olarak geri gelir.",     icon: ICONS.book },
      { href: "/woche",         title: "Haftalık özet",      desc: "Son 7 günün etkinlik grafiği, streak ve odaklanılacak hatalar.", icon: ICONS.spark },
      { href: "/wortfamilie",   title: "Wortfamilie",        desc: "Bir kökten türeyen kelime ailelerini AI ile keşfet.",            icon: ICONS.spark },
      { href: "/ai-workbench",  title: "AI Çalışma Tezgâhı", desc: "PDF / DOCX / not yükle: özet + flashcard + quiz tek tıkla.",     icon: ICONS.spark },
      { href: "/library",       title: "Kütüphane",          desc: "Hazır CEFR setleri ve oluşturduklarını tek panelde çalış.",      icon: ICONS.book },
      { href: "/forgetting-curve", title: "Unutma eğrisi",      desc: "Ebbinghaus modeli ile retansiyon ve optimal tekrar takvimi.",      icon: ICONS.spark },
      { href: "/community",     title: "Lerngemeinschaft",   desc: "Çalışma arkadaşları + topluluk meydan okumaları.",                icon: ICONS.spark },
      { href: "/data",          title: "Veri yedekle",       desc: "Tüm yerel veriyi JSON olarak indir/yükle — cihaz değiştir.",        icon: ICONS.folder },
      { href: "/shortcuts",     title: "Klavye kısayolları",  desc: "G + harf ile her sayfaya hızlı geçiş. ? ile bu listeyi aç.",     icon: ICONS.spark },
    ],
  },
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
  const totals = materialsTotals();
  const totalCards = sets.reduce((s, x) => s + x.cardCount, 0);

  return (
    <>
      <section className="grid items-center gap-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <span className="chip chip-primary">
            <span className="status-dot live" /> Almanca öğrenme stüdyosu
          </span>
          <h1 className="h-display mt-4 text-3xl md:text-5xl">
            Almanca&apos;da <span style={{ color: "var(--primary)" }}>her şey</span> tek panelde.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] text-[color:var(--fg-muted)] md:text-base">
            telc içeriği parse edildi, kelime havuzu hazır, AI öğretmen kaynak metne göre puanlıyor.
            Günde 15 dakika — sınava giden net bir rutin.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/wortschatz" className="btn btn-primary btn-lg">Bugün çalışmaya başla</Link>
            <Link href="/exam" className="btn btn-secondary btn-lg">Sınav planımı kur</Link>
          </div>
          <p className="mt-4 inline-flex items-center gap-2 text-xs text-[color:var(--fg-muted)]">
            <span className="status-dot live" /> Tüm ilerleme cihazında saklanır — hesap gerekmiyor. Yedeklemek için <Link href="/data" className="underline">Veri yedekle</Link>.
          </p>
        </div>

        <div className="surface p-5 md:p-6 animate-slide-up">
          <p className="eyebrow">Materyal envanteri</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="stat">
              <span className="stat-label">Lesetext</span>
              <span className="stat-value">{totals.lesetexte}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Hörtext</span>
              <span className="stat-value">{totals.hoertexte}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Kelime</span>
              <span className="stat-value">{totals.bilingual.toLocaleString("tr-TR")}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Setler</span>
              <span className="stat-value">{sets.length}</span>
            </div>
          </div>
          <hr className="divider" />
          <p className="eyebrow">Hızlı eylem</p>
          <div className="mt-3 grid gap-2">
            <Link href="/wortschatz" className="btn btn-secondary btn-block">Wortschatz quiz</Link>
            <Link href="/skills/lesen" className="btn btn-secondary btn-block">Lesetext oku</Link>
            <Link href="/skills/hoeren" className="btn btn-secondary btn-block">Hörtext dinle</Link>
          </div>
        </div>
      </section>

      {GROUPS.map((g) => (
        <section key={g.id} className="mt-12">
          <header className="mb-5">
            <h2 className="section-title">{g.title}</h2>
            <p className="section-subtitle">{g.hint}</p>
          </header>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((t) => (
              <Link key={t.href} href={t.href} className="tile card-hover">
                <TileIcon d={t.icon} />
                <span className="tile-title">{t.title}</span>
                <span className="tile-desc">{t.desc}</span>
                <span className="mt-auto pt-3 text-[13px] font-semibold text-[color:var(--primary)]">
                  Aç →
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-12">
        <header className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="section-title">Öne çıkan setler</h2>
            <p className="section-subtitle">CEFR seviyeleriyle hazır kart desteleri ({totalCards} kart toplam).</p>
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
