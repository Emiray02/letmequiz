import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-container flex flex-1 flex-col items-center justify-center pt-16 pb-24 text-center">
      <span className="chip chip-danger">404</span>
      <h1 className="h-display mt-4 text-4xl md:text-5xl">Sayfa bulunamadı</h1>
      <p className="mt-3 text-[color:var(--fg-muted)] max-w-md">
        Aradığın çalışma seti silinmiş ya da hiç var olmamış olabilir.
      </p>
      <div className="mt-6 flex gap-2">
        <Link href="/" className="btn btn-primary">Ana sayfaya dön</Link>
        <Link href="/library" className="btn btn-secondary">Kütüphaneye git</Link>
      </div>
    </main>
  );
}
