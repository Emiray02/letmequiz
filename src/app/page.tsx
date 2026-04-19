import Link from "next/link";
import { listStudySets, usingMockData } from "@/lib/data";
import AccountSyncPanel from "@/components/account-sync-panel";
import FamilyAccessPanel from "@/components/family-access-panel";
import SetCatalog from "@/components/set-catalog";
import StudentDashboard from "@/components/student-dashboard";
import TelcA2Plan from "@/components/telc-a2-plan";

export default async function HomePage() {
  const studySets = await listStudySets();

  return (
    <div className="relative min-h-screen overflow-hidden pb-16">
      <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-amber-200/70 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-36 h-72 w-72 rounded-full bg-teal-200/70 blur-3xl" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-8">
        <Link href="/" className="font-display text-3xl tracking-tight text-slate-900">
          LETMEQUIZ
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/classroom"
            className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            Class Mode
          </Link>
          <Link
            href="/parent"
            className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            Parent Mode
          </Link>
          <Link
            href="/ai-workbench"
            className="rounded-full border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
          >
            AI Workbench
          </Link>
          <Link
            href="/analytics"
            className="rounded-full border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-100"
          >
            Analytics
          </Link>
          <Link
            href="/create"
            className="rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white"
          >
            New Set
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6">
        <section className="relative mt-8 overflow-hidden rounded-[2.2rem] border border-black/10 bg-white/75 p-8 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.8)] backdrop-blur md:p-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-amber-200/60 blur-3xl" />
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-600">Study Better</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-slate-900 md:text-6xl">
            Build your own flashcard arena and practice in quiz mode.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-700 md:text-lg">
            LetMeQuiz is a web app for creating card sets, flipping terms rapidly, and testing your recall with multiple-choice rounds.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/create"
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Create First Set
            </Link>
            <Link
              href="/ai-workbench"
              className="rounded-2xl border border-cyan-300 bg-cyan-50 px-5 py-3 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
            >
              Upload Notes with AI
            </Link>
            <Link
              href="/classroom"
              className="rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
            >
              Open Class Mode
            </Link>
            <Link
              href="/parent"
              className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              Open Parent Mode
            </Link>
            <Link
              href="/analytics"
              className="rounded-2xl border border-violet-300 bg-violet-50 px-5 py-3 text-sm font-semibold text-violet-800 transition hover:bg-violet-100"
            >
              Open Analytics
            </Link>
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Free DB: Supabase
            </a>
          </div>

          {usingMockData ? (
            <p className="mt-4 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Demo mode active: no Supabase env variables found.
            </p>
          ) : null}
        </section>

        <StudentDashboard setCount={studySets.length} />

        <FamilyAccessPanel />

        <TelcA2Plan />

        <AccountSyncPanel />

        <SetCatalog sets={studySets} />
      </main>
    </div>
  );
}
