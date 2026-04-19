import Link from "next/link";
import { notFound } from "next/navigation";
import QuizPlayer from "@/components/quiz-player";
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
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="rounded-full border border-slate-300 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Back to Home
        </Link>
        <Link
          href={`/set/${set.id}`}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Back to Flashcards
        </Link>
      </div>

      <section className="mb-5 rounded-[2rem] border border-black/10 bg-white/75 p-8 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Quiz Mode</p>
        <h1 className="mt-2 font-display text-4xl text-slate-900">{set.title}</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          Pick the correct definition for each term and track your score live.
        </p>
      </section>

      <QuizPlayer set={set} />
    </div>
  );
}
