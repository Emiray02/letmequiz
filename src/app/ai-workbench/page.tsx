import Link from "next/link";
import AiWorkbench from "@/components/ai-workbench";

export default function AiWorkbenchPage() {
  return (
    <div className="relative min-h-screen overflow-hidden pb-16">
      <div className="pointer-events-none absolute -left-24 top-12 h-64 w-64 rounded-full bg-sky-200/70 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-28 h-72 w-72 rounded-full bg-amber-200/70 blur-3xl" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-8">
        <Link href="/" className="rounded-full border border-slate-300 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
          Back Home
        </Link>
        <Link
          href="/create"
          className="rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white"
        >
          New Set
        </Link>
      </header>

      <main className="mx-auto mt-8 w-full max-w-6xl px-6">
        <section className="mb-6 rounded-[2rem] border border-black/10 bg-white/80 p-8 shadow-[0_25px_65px_-45px_rgba(15,23,42,0.8)] backdrop-blur md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-600">AI Tools</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-slate-900 md:text-5xl">
            Document to study system in one flow.
          </h1>
          <p className="mt-3 max-w-3xl text-base text-slate-700">
            Upload class notes, lecture slides, reading documents, or topic summaries and generate a complete set of
            study tools.
          </p>
        </section>

        <AiWorkbench />
      </main>
    </div>
  );
}
