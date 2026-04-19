import Link from "next/link";
import TopNav from "@/components/top-nav";
import ArtikelTrainer from "@/components/artikel-trainer";

export const metadata = { title: "der · die · das alıştırması" };

export default function ArtikelPage() {
  return (
    <>
      <TopNav active="/deutsch" />
      <main className="app-main app-container pt-8 md:pt-12">
        <nav className="text-sm text-[color:var(--fg-muted)] flex items-center gap-2">
          <Link href="/deutsch" className="hover:text-[color:var(--fg)]">Almanca</Link>
          <span>›</span>
          <span className="text-[color:var(--fg)]">der · die · das</span>
        </nav>
        <h1 className="h-display mt-4 text-3xl md:text-4xl">Artikel alıştırması</h1>
        <p className="mt-2 text-[color:var(--fg-muted)] max-w-2xl">
          Kart üstündeki ismin doğru artikelini seç. Yanlışsa kuralı görürsün; sayaç ve seri sıfırlanmaz, kütüphane kendiliğinden karışır.
        </p>
        <div className="mt-6">
          <ArtikelTrainer />
        </div>
      </main>
    </>
  );
}
