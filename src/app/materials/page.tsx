import Link from "next/link";
import TopNav from "@/components/top-nav";
import { getMaterialsCatalog, type MaterialPdf } from "@/lib/materials-catalog";

export const metadata = { title: "Telc Materyalleri" };
export const dynamic = "force-static";

const LEVEL_ORDER: MaterialPdf["level"][] = ["A1.1", "A1.2", "A2.1", "A2.2", "Karışık"];
const KIND_ORDER: MaterialPdf["kind"][] = [
  "Lesetext",
  "Wortschatz",
  "Hörtexte (transkript)",
  "Video transkript",
  "Lösungen",
  "Diğer",
];

export default function MaterialsPage() {
  const cat = getMaterialsCatalog();

  // Group PDFs by level → kind.
  const grouped = new Map<MaterialPdf["level"], Map<MaterialPdf["kind"], MaterialPdf[]>>();
  for (const lvl of LEVEL_ORDER) grouped.set(lvl, new Map());
  for (const p of cat.pdfs) {
    const byKind = grouped.get(p.level)!;
    if (!byKind.has(p.kind)) byKind.set(p.kind, []);
    byKind.get(p.kind)!.push(p);
  }

  return (
    <>
      <TopNav active="/materials" />
      <main className="app-main app-container pt-8 md:pt-12 grid gap-6">
        <header>
          <span className="chip chip-primary">Telc resmi materyaller</span>
          <h1 className="h-display mt-3 text-3xl md:text-4xl">Materyal Kütüphanesi</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-2 max-w-2xl">
            <strong>{cat.totals.pdfCount} PDF</strong> + <strong>{cat.totals.audioCount} ses kaydı</strong> ·{" "}
            yaklaşık {cat.totals.totalSizeMB} MB. <em>Einfach gut</em> ve <em>Auf jeden Fall</em> serilerinin
            tüm Lesetext, Wortschatz, Hörtext transkriptleri ve çözüm anahtarları.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link href="/skills/hoeren" className="btn btn-primary btn-sm">Dinleme atölyesine git</Link>
            <Link href="/skills/lesen" className="btn btn-secondary btn-sm">Okuma atölyesine git</Link>
          </div>
        </header>

        {LEVEL_ORDER.map((lvl) => {
          const kinds = grouped.get(lvl)!;
          if (kinds.size === 0) return null;
          const audio = cat.audio.filter((a) => a.level === lvl);
          return (
            <section key={lvl} className="surface p-5 grid gap-4">
              <header className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="h-display text-2xl">
                  <span className={`cefr cefr-${lvl.replace(".", "").toLowerCase().slice(0, 2)}`}>{lvl}</span>{" "}
                  <span className="ml-2">Seviye Materyalleri</span>
                </h2>
                <span className="text-xs text-[color:var(--fg-muted)]">
                  {[...kinds.values()].reduce((s, a) => s + a.length, 0)} PDF
                  {audio.length > 0
                    ? ` · ${audio.reduce((s, a) => s + a.files.length, 0)} ses`
                    : ""}
                </span>
              </header>

              {KIND_ORDER.map((kind) => {
                const items = kinds.get(kind) ?? [];
                if (items.length === 0) return null;
                return (
                  <div key={kind}>
                    <p className="eyebrow mb-2">{kind} ({items.length})</p>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {items.map((p) => (
                        <li key={p.name} className="surface-muted p-3 text-sm flex items-center justify-between gap-2">
                          <span className="grid">
                            <strong className="leading-tight">
                              {p.lektion ? `${p.lektion} — ${p.topic}` : p.name.replace(/_/g, " ").replace(/\.pdf$/i, "")}
                            </strong>
                            <span className="text-xs text-[color:var(--fg-muted)]">
                              {p.series} · {Math.round(p.sizeBytes / 1024)} KB
                            </span>
                          </span>
                          <a
                            className="btn btn-secondary btn-sm"
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Aç ↗
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

              {audio.length > 0 ? (
                <div>
                  <p className="eyebrow mb-2">Ses kayıtları ({audio.reduce((s, a) => s + a.files.length, 0)})</p>
                  <ul className="grid gap-2 md:grid-cols-2">
                    {audio.map((coll) => (
                      <li key={coll.folder} className="surface-muted p-3">
                        <p className="font-semibold text-sm">Track {coll.trackRange}</p>
                        <p className="text-xs text-[color:var(--fg-muted)]">{coll.files.length} dosya</p>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-[color:var(--primary)]">
                            Track listesini göster
                          </summary>
                          <ul className="mt-2 grid gap-1 max-h-60 overflow-y-auto">
                            {coll.files.map((f) => (
                              <li key={f.name} className="flex items-center justify-between gap-2 text-xs">
                                <span>{f.name.replace(/^Auf_jeden_Fall_/, "").replace(/\.mp3$/, "")}</span>
                                <a className="btn btn-ghost btn-sm" href={f.url} target="_blank" rel="noreferrer">▶</a>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          );
        })}
      </main>
    </>
  );
}
