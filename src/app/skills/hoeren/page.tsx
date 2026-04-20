import type { Metadata } from "next";
import Link from "next/link";
import HoerenWorkshop from "@/components/hoeren-workshop";
import { HOERTEXTE, materialsTotals } from "@/lib/materials-data";
import { getMaterialsCatalog } from "@/lib/materials-catalog";

export const metadata: Metadata = {
  title: "Hören · letmequiz",
  description: "telc Hörtexte transkriptleri + mp3 eşleşmeli dinleme atölyesi.",
};

export default function HoerenPage() {
  const totals = materialsTotals();
  const catalog = getMaterialsCatalog();
  const audio = catalog.audio.flatMap((a) =>
    a.files.map((f) => ({
      level: a.level,
      folder: a.folder,
      folderUrl: a.url,
      trackName: f.name,
      url: f.url,
    })),
  );

  return (
    <main className="container py-8 grid gap-6">
      <nav className="text-xs opacity-70">
        <Link href="/">Ana sayfa</Link> · <Link href="/skills">Beceriler</Link> · <span>Hören</span>
      </nav>
      <HoerenWorkshop hoertexte={HOERTEXTE} audio={audio} />
      <p className="text-xs opacity-60 text-center">
        {totals.hoertexte} Hörtext transkripti + {audio.length} mp3 telc materyallerinden eşleştirildi.
      </p>
    </main>
  );
}
