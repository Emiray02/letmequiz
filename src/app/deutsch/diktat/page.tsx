import Link from "next/link";
import TopNav from "@/components/top-nav";
import DiktatPlayer from "@/components/diktat-player";

export const metadata = { title: "Diktat — dinleme alıştırması" };

export default function DiktatPage() {
  return (
    <>
      <TopNav active="/deutsch" />
      <main className="app-main app-container pt-8 md:pt-12">
        <nav className="text-sm text-[color:var(--fg-muted)] flex items-center gap-2">
          <Link href="/deutsch" className="hover:text-[color:var(--fg)]">Almanca</Link>
          <span>›</span>
          <span className="text-[color:var(--fg)]">Diktat</span>
        </nav>
        <h1 className="h-display mt-4 text-3xl md:text-4xl">Diktat — dinle ve yaz</h1>
        <p className="mt-2 text-[color:var(--fg-muted)] max-w-2xl">
          Tarayıcının Almanca seslerini kullanırız. Kulaklık önerilir. ä/ö/ü/ß yazamazsan ae/oe/ue/ss kabul edilir.
        </p>
        <div className="mt-6">
          <DiktatPlayer />
        </div>
      </main>
    </>
  );
}
