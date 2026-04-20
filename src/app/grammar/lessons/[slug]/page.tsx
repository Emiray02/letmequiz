import Link from "next/link";
import { notFound } from "next/navigation";
import { LESSONS, findLesson, type LessonBlock } from "@/lib/grammar-lessons";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return LESSONS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const lesson = findLesson(slug);
  return { title: lesson ? `${lesson.title} · Gramer · LetMeQuiz` : "Gramer · LetMeQuiz" };
}

function Block({ b }: { b: LessonBlock }) {
  switch (b.type) {
    case "p":
      return <p className="mt-3 text-[15px] leading-relaxed">{b.text}</p>;
    case "h":
      return <h3 className="mt-6 text-lg font-semibold">{b.text}</h3>;
    case "list":
      return (
        <ul className="mt-3 ml-5 list-disc space-y-1 text-[15px]">
          {b.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );
    case "examples":
      return (
        <ul className="mt-3 grid gap-2">
          {b.items.map((ex, i) => (
            <li
              key={i}
              className="rounded-md border border-[color:var(--border)] p-3"
            >
              <div className="font-semibold">{ex.de}</div>
              <div className="text-sm text-[color:var(--fg-muted)]">{ex.tr}</div>
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {b.headers.map((h, i) => (
                  <th
                    key={i}
                    className="border-b border-[color:var(--border)] px-3 py-2 text-left font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i} className="odd:bg-[color:var(--bg-soft)]">
                  {r.map((cell, j) => (
                    <td
                      key={j}
                      className="border-b border-[color:var(--border)] px-3 py-2"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "tip":
      return (
        <div
          className="mt-4 rounded-md p-3 text-sm"
          style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", color: "#15803d" }}
        >
          <strong>İpucu:</strong> {b.text}
        </div>
      );
    case "warn":
      return (
        <div
          className="mt-4 rounded-md p-3 text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#b91c1c" }}
        >
          <strong>Dikkat:</strong> {b.text}
        </div>
      );
    case "note":
      return (
        <div
          className="mt-4 rounded-md p-3 text-sm"
          style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)", color: "#1d4ed8" }}
        >
          <strong>Not:</strong> {b.text}
        </div>
      );
  }
}

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const lesson = findLesson(slug);
  if (!lesson) notFound();

  const idx = LESSONS.findIndex((l) => l.slug === slug);
  const prev = idx > 0 ? LESSONS[idx - 1] : null;
  const next = idx >= 0 && idx < LESSONS.length - 1 ? LESSONS[idx + 1] : null;

  return (
    <article className="max-w-3xl">
      <Link href="/grammar/lessons" className="text-sm text-[color:var(--fg-muted)] hover:underline">
        ← Tüm dersler
      </Link>
      <header className="mt-3">
        <div className="flex items-center gap-2">
          <span className="chip chip-accent">{lesson.level}</span>
          <span className="text-sm text-[color:var(--fg-muted)]">{lesson.minutes} dk okuma</span>
        </div>
        <h1 className="h-display mt-2 text-3xl md:text-4xl">
          <span className="mr-2" aria-hidden>{lesson.emoji}</span>
          {lesson.title}
        </h1>
        <p className="mt-2 text-base text-[color:var(--fg-muted)]">{lesson.subtitle}</p>
      </header>

      <section className="mt-6">
        {lesson.blocks.map((b, i) => (
          <Block key={i} b={b} />
        ))}
      </section>

      <footer className="mt-10 border-t border-[color:var(--border)] pt-6">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--fg-muted)]">
          Kaynaklar
        </h4>
        <ul className="mt-2 grid gap-1 text-sm">
          {lesson.sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[color:var(--primary)] hover:underline"
              >
                {s.label} ↗
              </a>
            </li>
          ))}
        </ul>

        <nav className="mt-8 grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link href={`/grammar/lessons/${prev.slug}`} className="tile card-hover">
              <span className="text-xs text-[color:var(--fg-muted)]">← Önceki</span>
              <span className="tile-title">{prev.title}</span>
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/grammar/lessons/${next.slug}`} className="tile card-hover sm:text-right">
              <span className="text-xs text-[color:var(--fg-muted)]">Sonraki →</span>
              <span className="tile-title">{next.title}</span>
            </Link>
          ) : <span />}
        </nav>
      </footer>
    </article>
  );
}
