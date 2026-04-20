import TopNav from "@/components/top-nav";
import SkillFeedbackPanel from "@/components/skill-feedback-panel";

const PASSAGES: { title: string; text: string; question: string }[] = [
  {
    title: "Mein Tag",
    text:
      "Ich heiße Anna und wohne in Hamburg. Jeden Morgen stehe ich um sieben Uhr auf. Ich trinke einen Kaffee und fahre mit der S-Bahn zur Arbeit. Mittags esse ich mit Kollegen in der Kantine. Am Abend lese ich ein Buch oder sehe eine Serie.",
    question: "Worum geht es im Text? Was macht Anna am Morgen?",
  },
  {
    title: "Beim Arzt",
    text:
      "Herr Müller hat seit zwei Tagen Kopfschmerzen. Er geht zum Arzt und beschreibt seine Beschwerden. Der Arzt hört ihm zu und verschreibt eine Tablette. Herr Müller soll viel Wasser trinken und sich ausruhen.",
    question: "Warum geht Herr Müller zum Arzt? Was empfiehlt der Arzt?",
  },
  {
    title: "Im Supermarkt",
    text:
      "Lisa kauft heute ein. Sie braucht Brot, Milch, Käse und Obst. An der Kasse bezahlt sie mit Karte. Der Supermarkt ist voll, aber sie findet alles schnell. Zuhause kocht sie mit ihrer Schwester Abendessen.",
    question: "Was kauft Lisa? Wie bezahlt sie?",
  },
];

export const metadata = { title: "Lesen — Okuma Atölyesi" };

export default function LesenPage() {
  return (
    <>
      <TopNav active="/skills" />
      <main className="app-main app-container pt-8 md:pt-12 grid gap-6">
        <header>
          <span className="chip chip-primary">Lesen · Comprehensible Input i+1</span>
          <h1 className="h-display mt-3 text-3xl md:text-4xl">Okuma Atölyesi</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-2 max-w-2xl">
            Kısa metinleri oku, sonra soruya Almanca (veya Türkçe) cevap ver. AI cevabını metinle karşılaştırır,
            anlamadığın kelimeleri listeler.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {PASSAGES.map((p) => (
            <article key={p.title} className="surface p-4 grid gap-2">
              <span className="eyebrow">{p.title}</span>
              <p className="text-sm whitespace-pre-wrap">{p.text}</p>
              <p className="text-xs text-[color:var(--fg-muted)]"><strong>Soru:</strong> {p.question}</p>
            </article>
          ))}
        </section>

        <SkillFeedbackPanel
          skill="lesen"
          defaultPrompt="Worum geht es im Text 'Mein Tag'? Was macht Anna am Morgen?"
          level="A2"
        />
      </main>
    </>
  );
}
