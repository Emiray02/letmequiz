import Link from "next/link";

const SHORTCUTS: Array<{ keys: string; desc: string }> = [
  { keys: "G H", desc: "Ana sayfa" },
  { keys: "G T", desc: "Bugünün hedefi (Tagesziel)" },
  { keys: "G W", desc: "Wortschatz" },
  { keys: "G L", desc: "Lesen" },
  { keys: "G O", desc: "Hören" },
  { keys: "G S", desc: "Schreiben" },
  { keys: "G K", desc: "Sprechen" },
  { keys: "G G", desc: "Gramer hub" },
  { keys: "G F", desc: "Hata defteri" },
  { keys: "G C", desc: "C-Test (Cloze)" },
  { keys: "G N", desc: "Almanca haberler" },
  { keys: "G D", desc: "Almanca düşün" },
  { keys: "G E", desc: "Sınav planım" },
  { keys: "G A", desc: "AI Tezgâh" },
  { keys: "?", desc: "Bu listeyi aç" },
];

export default function ShortcutsPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section>
        <p className="eyebrow">Klavye kısayolları</p>
        <h1 className="h-display text-2xl">Hızlı gezinme</h1>
        <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
          Önce <kbd className="chip">G</kbd> tuşuna bas, sonra hedef harfe. Her yerden çalışır.
        </p>

        <div className="surface mt-5 p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[color:var(--fg-subtle)]">
                <th className="pb-2 pr-4 font-semibold">Tuşlar</th>
                <th className="pb-2 font-semibold">Sayfa</th>
              </tr>
            </thead>
            <tbody>
              {SHORTCUTS.map((s) => (
                <tr key={s.keys} className="border-t border-[color:var(--border)]">
                  <td className="py-2 pr-4">
                    {s.keys.split(" ").map((k, i) => (
                      <span key={i} className="chip mr-1 font-mono">{k}</span>
                    ))}
                  </td>
                  <td className="py-2">{s.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="surface p-5 h-fit">
        <p className="eyebrow">İpucu</p>
        <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
          Form alanına yazarken kısayollar pasiftir, böylece metin akışını bozmaz.
        </p>
        <hr className="divider" />
        <Link href="/data" className="btn btn-secondary btn-block">Veri yedekle</Link>
      </aside>
    </div>
  );
}
