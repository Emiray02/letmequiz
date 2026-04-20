import TopNav from "@/components/top-nav";
import HoerenWorkshop from "@/components/hoeren-workshop";
import { getMaterialsCatalog, getHoertexteTranscripts } from "@/lib/materials-catalog";

export const metadata = { title: "Hören — Telc kayıtlarıyla dinleme atölyesi" };
export const dynamic = "force-static";

export default function HoerenPage() {
  const cat = getMaterialsCatalog();
  const transcripts = getHoertexteTranscripts();
  return (
    <>
      <TopNav active="/skills" />
      <main className="app-main app-container pt-8 md:pt-12 grid gap-6">
        <header>
          <span className="chip chip-primary">Hören · Auf jeden Fall (Telc)</span>
          <h1 className="h-display mt-3 text-3xl md:text-4xl">Dinleme Atölyesi</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-2 max-w-2xl">
            <strong>{cat.totals.audioCount} orijinal telc ses kaydı</strong> + Hörtext transkriptleri.
            Bir tracki dinle, <strong>metne bakmadan</strong> duyduğunu yaz; AI seviyene göre düzeltsin.
          </p>
        </header>

        <HoerenWorkshop
          collections={cat.audio}
          transcripts={transcripts.map((t) => ({ name: t.name, url: t.url, level: t.level }))}
        />
      </main>
    </>
  );
}
