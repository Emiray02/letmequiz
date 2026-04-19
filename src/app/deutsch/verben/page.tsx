import Link from "next/link";
import TopNav from "@/components/top-nav";
import VerbTrainer from "@/components/verb-trainer";

export const metadata = { title: "Fiil çekim alıştırması" };

export default function VerbenPage() {
  return (
    <>
      <TopNav active="/deutsch" />
      <main className="app-main app-container pt-8 md:pt-12">
        <nav className="text-sm text-[color:var(--fg-muted)] flex items-center gap-2">
          <Link href="/deutsch" className="hover:text-[color:var(--fg)]">Almanca</Link>
          <span>›</span>
          <span className="text-[color:var(--fg)]">Fiil çekim</span>
        </nav>
        <h1 className="h-display mt-4 text-3xl md:text-4xl">Präsens çekim alıştırması</h1>
        <p className="mt-2 text-[color:var(--fg-muted)] max-w-2xl">
          Verilen zamir + mastar için doğru çekimi yaz. Tipi seçerek odaklan: yardımcı, modal, düzenli ya da düzensiz fiiller.
        </p>
        <div className="mt-6">
          <VerbTrainer />
        </div>
      </main>
    </>
  );
}
