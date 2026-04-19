import Link from "next/link";
import ClassroomHub from "@/components/classroom-hub";
import { listStudySets } from "@/lib/data";

type PageProps = {
  searchParams: Promise<{ setId?: string }>;
};

export default async function ClassroomPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sets = await listStudySets();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="rounded-full border border-slate-300 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Back to Home
        </Link>
      </div>

      <section className="mb-6 rounded-[2rem] border border-black/10 bg-white/75 p-8 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)] backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">Sharing + Class Mode</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-slate-900 md:text-5xl">
          Organize classes and assign sets with shareable study links.
        </h1>
      </section>

      <ClassroomHub sets={sets} initialSetId={params.setId} />
    </div>
  );
}
