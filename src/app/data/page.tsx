"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const KEYS_PREFIX = "lmq.";

function collect(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (k.startsWith(KEYS_PREFIX)) {
      const v = localStorage.getItem(k);
      if (v != null) out[k] = v;
    }
  }
  return out;
}

export default function DataPage() {
  const [keys, setKeys] = useState<string[]>([]);
  const [bytes, setBytes] = useState(0);
  const [importMsg, setImportMsg] = useState<string>("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  function refresh() {
    const data = collect();
    const ks = Object.keys(data).sort();
    setKeys(ks);
    setBytes(ks.reduce((s, k) => s + (data[k]?.length ?? 0), 0));
  }
  useEffect(() => { refresh(); }, []);

  function exportJson() {
    const data = collect();
    const payload = { app: "letmequiz", version: 1, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `letmequiz-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result || "{}")) as { data?: Record<string, string> };
        if (!obj?.data || typeof obj.data !== "object") throw new Error("Geçersiz dosya");
        let n = 0;
        for (const [k, v] of Object.entries(obj.data)) {
          if (k.startsWith(KEYS_PREFIX) && typeof v === "string") {
            localStorage.setItem(k, v); n++;
          }
        }
        setImportMsg(`✓ ${n} anahtar geri yüklendi. Sayfayı yenile.`);
        refresh();
      } catch (err) {
        setImportMsg(`Hata: ${(err as Error).message}`);
      }
    };
    reader.readAsText(f);
  }

  function clearAll() {
    if (!confirm("Tüm yerel verileri silmek istediğinden emin misin? Geri alınamaz.")) return;
    const ks = Object.keys(collect());
    for (const k of ks) localStorage.removeItem(k);
    refresh();
    setImportMsg(`${ks.length} anahtar silindi.`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section>
        <p className="eyebrow">Veri yedekle</p>
        <h1 className="h-display text-2xl">Verilerini dışarı al / içeri al</h1>
        <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
          Tüm Wortschatz, hata defteri, ayarlar ve istatistikler tek bir JSON dosyada. Telefon değiştirirken,
          tarayıcı temizlerken işine yarar.
        </p>

        <div className="surface mt-5 p-5">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={exportJson}>
              JSON olarak indir
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
              JSON&apos;dan içe aktar
            </button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={onFile} />
            <button type="button" className="btn btn-ghost" onClick={clearAll} style={{ marginLeft: "auto", color: "var(--danger, #c33)" }}>
              Tüm yerel veriyi sil
            </button>
          </div>
          {importMsg ? (
            <div className="surface-muted mt-4 p-3 text-sm">{importMsg}</div>
          ) : null}
        </div>

        <div className="surface mt-5 p-5">
          <p className="eyebrow">Mevcut yerel veri</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="stat"><span className="stat-label">Anahtar sayısı</span><span className="stat-value">{keys.length}</span></div>
            <div className="stat"><span className="stat-label">Toplam boyut</span><span className="stat-value">{(bytes / 1024).toFixed(1)} KB</span></div>
          </div>
          <hr className="divider" />
          <ul className="text-xs text-[color:var(--fg-muted)] grid gap-1 max-h-72 overflow-auto">
            {keys.length === 0 ? <li>Henüz veri yok.</li> : keys.map((k) => <li key={k} className="font-mono">{k}</li>)}
          </ul>
        </div>
      </section>

      <aside className="surface p-5 h-fit">
        <p className="eyebrow">Güvenlik</p>
        <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
          Veriler sadece bu cihazın localStorage&apos;ında. JSON&apos;u kendin saklarsın, yetki sende kalır.
        </p>
        <hr className="divider" />
        <Link href="/community" className="btn btn-secondary btn-block">Topluluk</Link>
        <Link href="/shortcuts" className="btn btn-secondary btn-block mt-2">Kısayollar</Link>
      </aside>
    </div>
  );
}
