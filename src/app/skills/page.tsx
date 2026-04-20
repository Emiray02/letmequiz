import Link from "next/link";
import TopNav from "@/components/top-nav";

type SkillTile = {
  href: string;
  emoji: string;
  title: string;
  desc: string;
  method: string;
};

const skills: SkillTile[] = [
  {
    href: "/skills/schreiben",
    emoji: "✍️",
    title: "Schreiben — Yazma",
    desc: "E-posta, SMS, forum cevabı yaz; AI hatalarını düzeltsin ve seviyene uygun yeniden yazsın.",
    method: "Output Hypothesis + Bilinçli pratik",
  },
  {
    href: "/skills/sprechen",
    emoji: "🎙️",
    title: "Sprechen — Konuşma",
    desc: "Sesli cevap ver, transkribe et, telaffuz ve akıcılık için AI geri bildirimi al.",
    method: "Shadowing + Deliberate practice",
  },
  {
    href: "/skills/lesen",
    emoji: "📖",
    title: "Lesen — Okuma",
    desc: "Kısa metni oku, anlamadığını yaz; sistem seviyene göre özetleyip kelime listesi versin.",
    method: "Comprehensible Input i+1",
  },
  {
    href: "/skills/hoeren",
    emoji: "🎧",
    title: "Hören — Dinleme",
    desc: "Almanca ses klibini dinle, duyduğunu yaz (Dictogloss), AI kıyaslasın.",
    method: "Dual Coding + Testing Effect",
  },
  {
    href: "/wortschatz",
    emoji: "🧠",
    title: "Wortschatz — Kelime",
    desc: "telc PDF'lerinden parsed 1.300+ DE↔TR kelime; SRS ile artikel & anlam çalış.",
    method: "Spaced Repetition (SM-2)",
  },
];

export default function SkillsHubPage() {
  return (
    <>
      <TopNav active="/skills" />
      <main className="app-main app-container pt-8 md:pt-12">
        <header className="grid items-end gap-4 md:grid-cols-[1.4fr_1fr]">
          <div>
            <span className="chip chip-primary">
              <span className="status-dot live" /> Modüler beceri stüdyosu
            </span>
            <h1 className="h-display mt-4 text-4xl md:text-5xl">
              4 becerini <span style={{ color: "var(--primary)" }}>ayrı ayrı</span> güçlendir.
            </h1>
            <p className="mt-3 max-w-2xl text-base text-[color:var(--fg-muted)]">
              Her modül aynı bilimsel ilkelere dayanır: <strong>anlaşılır girdi</strong>, <strong>aktif üretim</strong>,{" "}
              <strong>kişisel geri bildirim</strong>. Hangi beceride zorlanıyorsan oradan başla — sınav planın otomatik
              o becerilere daha çok zaman ayıracak.
            </p>
          </div>
          <div className="surface p-5">
            <p className="eyebrow">Nasıl çalışır</p>
            <ol className="mt-3 grid gap-2 text-sm">
              <li>1. Cevabını yaz ya da sesli ver.</li>
              <li>2. Sistem TR/DE algılar; Türkçe yazdıysan Almancaya aktarır.</li>
              <li>3. AI hataları <em>kelime kelime</em> düzeltir ve örnek verir.</li>
              <li>4. Puanların mock sınav + dinamik plana işlenir.</li>
            </ol>
          </div>
        </header>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          {skills.map((s) => (
            <Link key={s.href} href={s.href} className="tile card-hover">
              <span className="tile-icon" aria-hidden>{s.emoji}</span>
              <span className="tile-title">{s.title}</span>
              <span className="tile-desc">{s.desc}</span>
              <span className="mt-auto inline-flex items-center justify-between text-xs">
                <span className="chip chip-accent">{s.method}</span>
                <span className="text-[color:var(--primary)] font-semibold">Aç →</span>
              </span>
            </Link>
          ))}
        </section>

        <section className="mt-10 surface p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] items-center">
            <div>
              <h2 className="h-display text-2xl">Sınav planına bağlan</h2>
              <p className="text-sm text-[color:var(--fg-muted)] mt-1">
                Sınav tarihini ve kurumunu gir; sistem zayıf olduğun beceriye <strong>her gün daha fazla dakika</strong> ayırsın.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/exam" className="btn btn-primary">Sınav planım →</Link>
              <Link href="/clips" className="btn btn-secondary">Sitcom klipler</Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
