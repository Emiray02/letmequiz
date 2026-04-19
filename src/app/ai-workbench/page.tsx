import TopNav from "@/components/top-nav";
import AiWorkbench from "@/components/ai-workbench";

export const metadata = { title: "AI Çalışma Tezgâhı" };

export default function AiWorkbenchPage() {
  return (
    <>
      <TopNav active="/ai-workbench" />
      <main className="app-main app-container pt-8 md:pt-12">
        <div className="max-w-3xl">
          <span className="chip chip-primary">
            <span className="status-dot live" /> AI Çalışma
          </span>
          <h1 className="h-display mt-4 text-3xl md:text-5xl">
            Bir dosya yükle, eksiksiz bir çalışma seti çıksın.
          </h1>
          <p className="mt-4 text-base text-[color:var(--fg-muted)] md:text-lg">
            PDF, DOCX, TXT, MD veya CSV yükle; özet, sözlük, flashcard, quiz, çalışma rehberi ve
            zaman çizelgesi otomatik üretilsin. Sonra kaynaklarına soru sor — alıntılarla cevap gelsin.
          </p>
        </div>
        <div className="mt-8 md:mt-10">
          <AiWorkbench />
        </div>
      </main>
    </>
  );
}