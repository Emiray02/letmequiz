import CefrPlacementTest from "@/components/cefr-placement-test";

export const metadata = { title: "Seviye testi · LetMeQuiz" };

export default function SeviyePage() {
  return (
    <>
      <header className="mb-6">
        <span className="chip chip-primary">CEFR Placement</span>
        <h1 className="h-display mt-3 text-3xl md:text-4xl">Seviye testim</h1>
        <p className="section-subtitle">Kısa adaptif test — şu an A1, A2 ya da B1'in neresindesin?</p>
      </header>
      <CefrPlacementTest />
    </>
  );
}
