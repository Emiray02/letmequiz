import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700">
        404
      </p>
      <h1 className="mt-4 font-display text-5xl text-slate-900">Set not found</h1>
      <p className="mt-3 text-slate-600">
        The requested study set does not exist or was removed.
      </p>
      <Link
        href="/"
        className="mt-7 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        Return Home
      </Link>
    </main>
  );
}
