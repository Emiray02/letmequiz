import TopNav from "@/components/top-nav";
import LesenWorkshop from "@/components/lesen-workshop";
import { getLesetexte, getWortschatz } from "@/lib/materials-catalog";

export const metadata = { title: "Lesen — Telc Lesetexte ile okuma atölyesi" };
export const dynamic = "force-static";

export default function LesenPage() {
  const lesetexte = getLesetexte();
  const wortschatz = getWortschatz();
  return (
    <>
      <TopNav active="/skills" />
      <main className="app-main app-container pt-8 md:pt-12 grid gap-6">
        <header>
          <span className="chip chip-primary">Lesen · Einfach gut (Telc)</span>
          <h1 className="h-display mt-3 text-3xl md:text-4xl">Okuma Atölyesi</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-2 max-w-2xl">
            <strong>{lesetexte.length} orijinal telc Lesetext</strong> + {wortschatz.length} Wortschatzliste.
            Bir Lektion seç, metni oku, sonra Almanca cevap yaz; AI metne göre kontrol etsin.
          </p>
        </header>
        <LesenWorkshop
          lesetexte={lesetexte.map((p) => ({
            name: p.name,
            url: p.url,
            level: p.level,
            lektion: p.lektion ?? "",
            topic: p.topic ?? p.name,
          }))}
          wortschatz={wortschatz.map((p) => ({ name: p.name, url: p.url, level: p.level }))}
        />
      </main>
    </>
  );
}
