import Link from "next/link";
import { notFound } from "next/navigation";
import StudyStudio from "@/components/study-studio";
import SetExportPanel from "@/components/set-export-panel";
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

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="rounded-full border border-slate-300 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Back to Home
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/classroom?setId=${set.id}`}
            className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            Assign To Class
          </Link>
          <Link
            href={`/quiz/${set.id}`}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Open Quiz Mode
          </Link>
        </div>
      </div>

      <section className="mb-5 rounded-[2rem] border border-black/10 bg-white/75 p-8 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Learning Studio
        </p>
        <h1 className="mt-2 font-display text-4xl text-slate-900">{set.title}</h1>
        <p className="mt-3 max-w-3xl text-slate-700">{set.description || "No description provided."}</p>
      </section>

      <StudyStudio set={set} />

      <SetExportPanel set={set} />
    </div>
  );
}
