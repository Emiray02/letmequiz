import Link from "next/link";
import FamilyAccessPanel from "@/components/family-access-panel";
import ParentMonitorDashboard from "@/components/parent-monitor-dashboard";

export default function ParentModePage() {
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
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">Parent Mode</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-slate-900 md:text-5xl">
          Ogrencinin gelisimini grafiklerle takip et, hatirlatma gonder.
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-700">
          Task tamamlama, gunluk calisma, accuracy ve hata sinyalleri tek panelde izlenir.
        </p>
      </section>

      <FamilyAccessPanel />

      <ParentMonitorDashboard />
    </div>
  );
}
