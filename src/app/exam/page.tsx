import TopNav from "@/components/top-nav";
import ExamPlanPanel from "@/components/exam-plan-panel";
import MockExamRunner from "@/components/mock-exam-runner";

export const metadata = { title: "Sınav Planım ve Mock Sınav" };

export default function ExamPage() {
  return (
    <>
      <TopNav active="/exam" />
      <main className="app-main app-container pt-8 md:pt-12 grid gap-6">
        <header>
          <span className="chip chip-primary">Sınav odaklı çalışma</span>
          <h1 className="h-display mt-3 text-3xl md:text-4xl">Sınav Planım</h1>
          <p className="text-sm text-[color:var(--fg-muted)] mt-2 max-w-2xl">
            telc, Goethe, ÖSD, TestDaF, DSH veya YDS — sınav kurumunu ve tarihini gir. Sistem <strong>Ebbinghaus</strong>,{" "}
            <strong>Bjork</strong>, <strong>Krashen</strong> ve <strong>Karpicke</strong> ilkelerine göre her gün sana özel bir program kurar.
          </p>
        </header>
        <ExamPlanPanel />
        <MockExamRunner />
      </main>
    </>
  );
}
