import type { Metadata } from "next";
import Link from "next/link";
import LesenWorkshop from "@/components/lesen-workshop";
import { LESETEXTE, WORTSCHATZ, materialsTotals } from "@/lib/materials-data";

export const metadata: Metadata = {
  title: "Lesen · letmequiz",
  description: "telc Lesetexte ile içerik tabanlı okuma çalışması ve AI geri bildirimi.",
};

export default function LesenPage() {
  const totals = materialsTotals();
  return (
    <main className="container py-8 grid gap-6">
      <nav className="text-xs opacity-70">
        <Link href="/">Ana sayfa</Link> · <Link href="/skills">Beceriler</Link> · <span>Lesen</span>
      </nav>
      <LesenWorkshop lesetexte={LESETEXTE} wortschatz={WORTSCHATZ} />
      <p className="text-xs opacity-60 text-center">
        Toplam {totals.lesetexte} Lesetext, {totals.wortschatzEntries} kelime parsedu telc materyallerinden çekildi.
      </p>
    </main>
  );
}
