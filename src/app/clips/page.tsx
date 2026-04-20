import TopNav from "@/components/top-nav";
import SitcomClipBrowser from "@/components/sitcom-clip-browser";

export const metadata = { title: "Sitcom Klipler" };

export default function ClipsPage() {
  return (
    <>
      <TopNav active="/clips" />
      <main className="app-main app-container pt-8 md:pt-12 grid gap-6">
        <header>
          <span className="chip chip-accent">Comprehensible Input + Dual Coding</span>
          <h1 className="h-display mt-3 text-3xl md:text-4xl">Sitcom Klipler</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-2 max-w-2xl">
            Gerçek diyaloglarda kelime ve kalıpların <strong>nasıl kullanıldığını</strong> gör. Her sahne CEFR seviyesine,
            senaryoya ve dilbilgisi odağına göre etiketlendi. 🔊 butonuyla sahneyi dinle, YouTube bağlantısından tam klibe git.
          </p>
        </header>
        <SitcomClipBrowser />
      </main>
    </>
  );
}
