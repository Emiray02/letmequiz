import ClassroomHub from "@/components/classroom-hub";
import TopNav from "@/components/top-nav";
import { listStudySets } from "@/lib/data";

type PageProps = {
  searchParams: Promise<{ setId?: string }>;
};

export default async function ClassroomPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sets = await listStudySets();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav active="/classroom" />
      <main className="app-container flex-1 pb-24 pt-10 md:pt-14">
        <div className="max-w-3xl">
          <span className="chip chip-success">Sınıf modu</span>
          <h1 className="h-display mt-4 text-3xl md:text-5xl">
            Sınıfını yönet, setleri paylaş, ortak çalışma başlat.
          </h1>
          <p className="mt-3 text-base text-[color:var(--fg-muted)]">
            Paylaşılabilir çalışma bağlantılarıyla öğrencilere set ata, canlı oda oluştur.
          </p>
        </div>
        <div className="mt-8">
          <ClassroomHub sets={sets} initialSetId={params.setId} />
        </div>
      </main>
    </div>
  );
}
