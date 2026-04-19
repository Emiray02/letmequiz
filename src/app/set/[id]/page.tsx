import Link from "next/link";
import { notFound } from "next/navigation";
import StudyStudio from "@/components/study-studio";
import SetExportPanel from "@/components/set-export-panel";
import TopNav from "@/components/top-nav";
import { getStudySetById } from "@/lib/data";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StudySetPage({ params }: PageProps) {
  const { id } = await params;
  const set = await getStudySetById(id);

  if (!set) {
    notFound();
  }

  const m = set.title.match(/\b(A1|A2|B1|B2|C1|C2)\b/i);
  const code = m ? m[1].toUpperCase() : null;

  return (
    <>
      <TopNav active="/library" />
      <main className="app-main app-container pt-8 md:pt-12">
        <nav className="text-sm text-[color:var(--fg-muted)] flex items-center gap-2">
          <Link href="/library" className="hover:text-[color:var(--fg)]">Kütüphane</Link>
          <span>›</span>
          <span className="text-[color:var(--fg)]">{set.title}</span>
        </nav>

        <section className="mt-4 surface p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                {code ? <span className={`cefr cefr-${code.toLowerCase()}`}>{code}</span> : <span className="chip">Set</span>}
                <span className="chip">{set.cards.length} kart</span>
              </div>
              <h1 className="h-display mt-3 text-3xl md:text-4xl">{set.title}</h1>
              <p className="mt-2 max-w-3xl text-[color:var(--fg-muted)]">
                {set.description || "Açıklama yok."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/classroom?setId=${set.id}`} className="btn btn-secondary">Sınıfa ata</Link>
              <Link href={`/quiz/${set.id}`} className="btn btn-primary">Quiz başlat</Link>
            </div>
          </div>
        </section>

        <div className="mt-6">
          <StudyStudio set={set} />
        </div>

        <div className="mt-6">
          <SetExportPanel set={set} />
        </div>
      </main>
    </>
  );
}
