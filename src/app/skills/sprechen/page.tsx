import TopNav from "@/components/top-nav";
import SkillFeedbackPanel from "@/components/skill-feedback-panel";

const PROMPTS = [
  "Stell dich vor und beschreibe deinen Beruf.",
  "Erzähle von deiner Familie (4-6 Sätze).",
  "Wie sieht dein Wochenende aus?",
  "Beschreibe deinen Weg zur Arbeit oder Uni.",
];

export const metadata = { title: "Sprechen — Konuşma Koçu" };

export default function SprechenPage() {
  return (
    <>
      <TopNav active="/skills" />
      <main className="app-main app-container pt-8 md:pt-12 grid gap-6">
        <header>
          <span className="chip chip-primary">Sprechen · Shadowing + Feedback</span>
          <h1 className="h-display mt-3 text-3xl md:text-4xl">Konuşma Koçu</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-2 max-w-2xl">
            🎙️ düğmesine bas, Almanca konuş — sistem konuştuğunu yazar. AI telaffuz hatalarını, gramer kayıplarını ve
            daha doğal bir ifadeyi gösterir. Chrome veya Edge tarayıcısı önerilir.
          </p>
        </header>

        <div className="surface p-4">
          <p className="eyebrow mb-2">Örnek sorular</p>
          <ul className="grid gap-2">
            {PROMPTS.map((p, i) => (
              <li key={i} className="surface-muted p-3 text-sm">{p}</li>
            ))}
          </ul>
        </div>

        <SkillFeedbackPanel skill="sprechen" defaultPrompt={PROMPTS[0]} level="A2" />
      </main>
    </>
  );
}
