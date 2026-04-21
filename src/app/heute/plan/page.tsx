"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import PlanSetupForm from "@/components/plan-setup-form";
import { clearLocalPlan, loadLocalPlan } from "@/lib/local-exam-plan";

export default function PlanEditPage() {
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <main className="app-main app-container pt-12 max-w-2xl">
      <nav className="text-sm text-[color:var(--fg-muted)]">
        <Link href="/heute" className="hover:text-[color:var(--fg)]">← Bugün çalış</Link>
      </nav>
      <h1 className="h-display mt-4 text-3xl md:text-4xl">Planımı düzenle</h1>
      <p className="mt-2 text-[color:var(--fg-muted)]">
        Seviye veya sınav tarihini değiştir. Yeni plan kaydedilir; tamamladığın maddelerin geçmişi
        kaybolmaz, ancak gün indeksleri yeniden hesaplanır.
      </p>

      <div className="surface p-5 mt-6">
        <PlanSetupForm onSaved={() => router.push("/heute")} />
      </div>

      <div className="surface p-5 mt-6">
        <p className="eyebrow">Tehlikeli bölge</p>
        {!confirmReset ? (
          <button className="btn mt-3" onClick={() => setConfirmReset(true)}>
            Planı ve tüm ilerlemeyi sıfırla
          </button>
        ) : (
          <div className="mt-3 grid gap-2">
            <p className="text-sm">Bu işlem yerel planını ve check-off geçmişini siler. Emin misin?</p>
            <div className="flex gap-2">
              <button
                className="btn"
                style={{ background: "#dc2626", color: "white" }}
                onClick={() => { clearLocalPlan(); router.push("/"); }}
              >
                Evet, sil
              </button>
              <button className="btn" onClick={() => setConfirmReset(false)}>Vazgeç</button>
            </div>
          </div>
        )}
        {loadLocalPlan() == null && (
          <p className="mt-2 text-xs text-[color:var(--fg-muted)]">Şu an aktif yerel plan yok.</p>
        )}
      </div>
    </main>
  );
}
