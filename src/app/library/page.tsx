import Link from "next/link";
import TopNav from "@/components/top-nav";
import HomeSetGrid from "@/components/home-set-grid";
import { listStudySets, usingMockData } from "@/lib/data";

export const metadata = { title: "Kütüphane" };

export default async function LibraryPage() {
  const sets = await listStudySets();
  const totalCards = sets.reduce((s, x) => s + x.cardCount, 0);

  return (
    <>
      <TopNav active="/library" />
      <main className="app-main app-container pt-8 md:pt-12">
        <header className="grid items-end gap-4 md:flex md:items-end md:justify-between">
          <div>
            <span className="eyebrow">Kütüphane</span>
            <h1 className="h-display mt-2 text-3xl md:text-4xl">Tüm setlerin tek yerde</h1>
            <p className="mt-2 text-[color:var(--fg-muted)]">
              {sets.length} set · {totalCards} kart · CEFR seviyeleri otomatik etiketlenir.
            </p>
            {usingMockData ? (
              <p className="mt-2 text-sm text-[color:var(--fg-muted)] inline-flex items-center gap-2">
                <span className="status-dot warn" /> Demo modu aktif — Supabase tanımlı değil.
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Link href="/create" className="btn btn-primary">Yeni set</Link>
            <Link href="/ai-workbench" className="btn btn-secondary">AI ile üret</Link>
          </div>
        </header>

        <div className="mt-8">
          <HomeSetGrid sets={sets} />
        </div>
      </main>
    </>
  );
}
