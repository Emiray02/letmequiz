import Link from "next/link";
import { notFound } from "next/navigation";
import QuizPlayer from "@/components/quiz-player";
import TopNav from "@/components/top-nav";
import { getStudySetById } from "@/lib/data";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function QuizPage({ params }: PageProps) {
  const { id } = await params;
  const set = await getStudySetById(id);

  if (!set) {
    notFound();
  }

  return (
    <>
      <TopNav active="/library" />
      <main className="app-main app-container pt-8 md:pt-12">
        <nav className="text-sm text-[color:var(--fg-muted)] flex items-center gap-2">
          <Link href="/library" className="hover:text-[color:var(--fg)]">Kütüphane</Link>
          <span>›</span>
          <Link href={`/set/${set.id}`} className="hover:text-[color:var(--fg)]">{set.title}</Link>
          <span>›</span>
          <span className="text-[color:var(--fg)]">Quiz</span>
        </nav>

        <section className="mt-4 surface p-6 md:p-8">
          <span className="chip chip-primary">Quiz modu</span>
          <h1 className="h-display mt-3 text-3xl md:text-4xl">{set.title}</h1>
          <p className="mt-2 max-w-3xl text-[color:var(--fg-muted)]">
            Her terim için doğru tanımı seç; skorun anlık görüntülenir.
          </p>
          <div className="mt-4 flex gap-2">
            <Link href={`/set/${set.id}`} className="btn btn-secondary btn-sm">← Karta dön</Link>
          </div>
        </section>

        <div className="mt-6">
          <QuizPlayer set={set} />
        </div>
      </main>
    </>
  );
}
