import type { Metadata } from "next";
import Link from "next/link";
import WortschatzLab from "@/components/wortschatz-lab";
import { materialsTotals } from "@/lib/materials-data";

export const metadata: Metadata = {
  title: "Wortschatz Labı · letmequiz",
  description: "telc PDF'lerinden parsed Almanca-Türkçe kelime havuzu + SRS quiz.",
};

export default function WortschatzPage() {
  const totals = materialsTotals();
  return (
    <main className="container py-8 grid gap-6">
      <nav className="text-xs opacity-70">
        <Link href="/">Ana sayfa</Link> · <span>Wortschatz</span>
      </nav>
      <WortschatzLab />
      <p className="text-xs opacity-60 text-center">
        {totals.bilingual.toLocaleString("tr-TR")} DE↔TR çift / {totals.wortschatzEntries.toLocaleString("tr-TR")} toplam giriş.
      </p>
    </main>
  );
}
