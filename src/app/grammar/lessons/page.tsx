import Link from "next/link";
import { LESSONS } from "@/lib/grammar-lessons";

export const metadata = { title: "Gramer Dersleri · LetMeQuiz" };

export default function GrammarLessonsIndex() {
  const byLevel = {
    A1: LESSONS.filter((l) => l.level === "A1"),
    A2: LESSONS.filter((l) => l.level === "A2"),
    B1: LESSONS.filter((l) => l.level === "B1"),
  };

  return (
    <>
      <header className="mb-6">
        <span className="chip chip-primary">Grammatik · Konu Anlatımı</span>
        <h1 className="h-display mt-3 text-3xl md:text-4xl">Gramer Dersleri</h1>
        <p className="section-subtitle">
          Her ders: kural, çekim tabloları, örnek cümleler ve tipik hatalar. Kaynaklar: Duden, Goethe-Institut, Deutsche Welle, DWDS.
        </p>
      </header>

      {(["A1", "A2", "B1"] as const).map((lvl) =>
        byLevel[lvl].length === 0 ? null : (
          <section key={lvl} className="mt-6">
            <h2 className="text-xl font-semibold">
              <span className="chip chip-accent mr-2">{lvl}</span>
              {lvl === "A1" ? "Başlangıç" : lvl === "A2" ? "Temel" : "Orta"}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {byLevel[lvl].map((lesson) => (
                <Link
                  key={lesson.slug}
                  href={`/grammar/lessons/${lesson.slug}`}
                  className="tile card-hover"
                >
                  <span className="flex items-center gap-2 text-2xl">{lesson.emoji}</span>
                  <span className="tile-title mt-1">{lesson.title}</span>
                  <span className="tile-desc">{lesson.subtitle}</span>
                  <span className="mt-auto pt-3 text-[13px] font-semibold text-[color:var(--primary)]">
                    {lesson.minutes} dk · Aç →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ),
      )}
    </>
  );
}
