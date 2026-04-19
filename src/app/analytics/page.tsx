import Link from "next/link";
import AnalyticsDashboard from "@/components/analytics-dashboard";

export default function AnalyticsPage() {
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
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">Product Analytics</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-slate-900 md:text-5xl">
          Usage signals and learning interaction trends.
        </h1>
      </section>

      <AnalyticsDashboard />
    </div>
  );
}
