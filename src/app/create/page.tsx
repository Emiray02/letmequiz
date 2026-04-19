import CreateSetForm from "@/components/create-set-form";
import SetImportPanel from "@/components/set-import-panel";
import TopNav from "@/components/top-nav";

export default function CreateSetPage() {
  return (
    <>
      <TopNav active="/create" />
      <main className="app-main app-container pt-8 md:pt-12" style={{ maxWidth: "64rem" }}>
        <div className="max-w-3xl">
          <span className="chip chip-accent">Set oluşturucu</span>
          <h1 className="h-display mt-4 text-3xl md:text-5xl">
            Notlarını 60 saniyede flashcardlara dönüştür.
          </h1>
          <p className="mt-3 text-base text-[color:var(--fg-muted)]">
            Terim ve tanım ekle, seti yayınla, hemen çalışmaya ya da quize geç.
          </p>
        </div>
        <div className="mt-8 grid gap-6">
          <CreateSetForm />
          <SetImportPanel />
        </div>
      </main>
    </>
  );
}
