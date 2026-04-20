import TopNav from "@/components/top-nav";
import SkillFeedbackPanel from "@/components/skill-feedback-panel";

const PROMPTS = [
  "Schreibe eine E-Mail an deinen Sprachlehrer und verschiebe deinen Termin.",
  "Beschreibe deinen letzten Urlaub in 6-8 Sätzen.",
  "Schreibe einen kurzen Forum-Beitrag: 'Warum lerne ich Deutsch?'",
  "Bewerbungsschreiben: Eine kurze Vorstellung (Name, Alter, Beruf, Ziel).",
];

export const metadata = { title: "Schreiben — Yazma Stüdyosu" };

export default function SchreibenPage() {
  return (
    <>
      <TopNav active="/skills" />
      <main className="app-main app-container pt-8 md:pt-12 grid gap-6">
        <header>
          <span className="chip chip-primary">Schreiben · Output + Deliberate Practice</span>
          <h1 className="h-display mt-3 text-3xl md:text-4xl">Yazma Stüdyosu</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-2 max-w-2xl">
            Görevi seç, cevabını Almanca (veya Türkçe — sistem çevirsin) yaz. AI her yanlış kelimeyi doğrusuyla eşleştirir,
            seviyene uygun temiz versiyonu yanına koyar. Puanların sınav planına işlenir.
          </p>
        </header>

        <div className="surface p-4">
          <p className="eyebrow mb-2">Örnek görevler</p>
          <ul className="grid gap-2">
            {PROMPTS.map((p, i) => (
              <li key={i} className="surface-muted p-3 text-sm">{p}</li>
            ))}
          </ul>
        </div>

        <SkillFeedbackPanel skill="schreiben" defaultPrompt={PROMPTS[0]} level="A2" />
      </main>
    </>
  );
}
