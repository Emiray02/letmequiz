import Link from "next/link";
import TopNav from "@/components/top-nav";
import SentenceBuilder from "@/components/sentence-builder";

export const metadata = { title: "Cümle kurma alıştırması" };

export default function SaetzePage() {
  return (
    <>
      <TopNav active="/deutsch" />
      <main className="app-main app-container pt-8 md:pt-12">
        <nav className="text-sm text-[color:var(--fg-muted)] flex items-center gap-2">
          <Link href="/deutsch" className="hover:text-[color:var(--fg)]">Almanca</Link>
          <span>›</span>
          <span className="text-[color:var(--fg)]">Cümle kur</span>
        </nav>
        <h1 className="h-display mt-4 text-3xl md:text-4xl">Sätze bauen</h1>
        <p className="mt-2 text-[color:var(--fg-muted)] max-w-2xl">
          Karışık parçalardan doğru sıralı Almanca cümle oluştur. Almanca kelime sırası (V2) için harika pratik.
        </p>
        <div className="mt-6">
          <SentenceBuilder />
        </div>
      </main>
    </>
  );
}
