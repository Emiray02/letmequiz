import Link from "next/link";
import CreateSetForm from "@/components/create-set-form";
import SetImportPanel from "@/components/set-import-panel";

export default function CreateSetPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="rounded-full border border-slate-300 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Back to Home
        </Link>
      </div>

      <section className="mb-6 rounded-[2rem] border border-black/10 bg-white/70 p-8 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)] backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">Set Builder</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-slate-900 md:text-5xl">
          Turn your notes into flashcards in under 60 seconds.
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-700">
          Add terms and definitions, publish the set, then switch straight into study or quiz mode.
        </p>
      </section>

      <CreateSetForm />

      <SetImportPanel />
    </div>
  );
}
