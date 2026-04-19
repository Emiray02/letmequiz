"use client";

import Link from "next/link";
import { useState } from "react";
import type { StudySet } from "@/types/study";
import { getReviewSnapshotForSet } from "@/lib/student-store";
import ExamArena from "@/components/exam-arena";
import CefrClipLibrary from "@/components/cefr-clip-library";
import ErrorNotebook from "@/components/error-notebook";
import FlashcardPlayer from "@/components/flashcard-player";
import LearningCoachPanel from "@/components/learning-coach-panel";
import ListeningDrill from "@/components/listening-drill";
import SetNotes from "@/components/set-notes";
import SpeakingCoach from "@/components/speaking-coach";
import SmartReview from "@/components/smart-review";
import VocabularyLab from "@/components/vocabulary-lab";
import WritePractice from "@/components/write-practice";

type StudyStudioProps = {
  set: StudySet;
};

type StudioTab =
  | "flashcards"
  | "writing"
  | "listening"
  | "speaking-coach"
  | "clip-library"
  | "error-notebook"
  | "review"
  | "vocab-lab"
  | "exam-arena";

const tabLabels: Array<{ id: StudioTab; label: string; description: string }> = [
  {
    id: "flashcards",
    label: "Flashcards",
    description: "Flip cards and rate memory strength.",
  },
  {
    id: "writing",
    label: "Writing",
    description: "Type the answer and improve active recall.",
  },
  {
    id: "listening",
    label: "Listening",
    description: "Use text-to-speech to train language hearing.",
  },
  {
    id: "speaking-coach",
    label: "Speaking Coach",
    description: "Mic based pronunciation and grammar feedback.",
  },
  {
    id: "clip-library",
    label: "CEFR Clips",
    description: "A1 A2 B1 transcript, cloze, and shadowing.",
  },
  {
    id: "error-notebook",
    label: "Error Notebook",
    description: "Grouped mistakes and recovery mini sets.",
  },
  {
    id: "review",
    label: "Smart Review",
    description: "Study only due cards with spaced repetition.",
  },
  {
    id: "vocab-lab",
    label: "Vocab Lab",
    description: "Mnemonic, cloze, context transfer, and interleaving.",
  },
  {
    id: "exam-arena",
    label: "Exam Arena",
    description: "Fill blank, short answer, matching, and mistake mini quiz.",
  },
];

export default function StudyStudio({ set }: StudyStudioProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>("flashcards");
  const [refreshTick, setRefreshTick] = useState(0);
  const [snapshot, setSnapshot] = useState(() =>
    getReviewSnapshotForSet(
      set.id,
      set.cards.map((card) => card.id)
    )
  );

  function refreshProgress() {
    setSnapshot(
      getReviewSnapshotForSet(
        set.id,
        set.cards.map((card) => card.id)
      )
    );
    setRefreshTick((value) => value + 1);
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 rounded-[1.8rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] backdrop-blur sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cards</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{set.cards.length}</p>
        </div>
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Due</p>
          <p className="mt-1 text-2xl font-semibold text-cyan-900">{snapshot.dueCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Mastered</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-900">{snapshot.masteredCount}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Difficult</p>
          <p className="mt-1 text-2xl font-semibold text-amber-900">{snapshot.difficultCount}</p>
        </div>
      </section>

      <section className="grid gap-2 rounded-[1.6rem] border border-black/10 bg-white/80 p-3 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur sm:grid-cols-2 xl:grid-cols-4">
        {tabLabels.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              activeTab === tab.id
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-800 hover:bg-slate-100"
            }`}
          >
            <p className="text-sm font-semibold">{tab.label}</p>
            <p className={`mt-1 text-xs ${activeTab === tab.id ? "text-white/80" : "text-slate-500"}`}>
              {tab.description}
            </p>
          </button>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <div>
          {activeTab === "flashcards" ? (
            <FlashcardPlayer set={set} onProgressUpdate={refreshProgress} />
          ) : null}
          {activeTab === "writing" ? (
            <WritePractice set={set} onProgressUpdate={refreshProgress} />
          ) : null}
          {activeTab === "listening" ? (
            <ListeningDrill set={set} onProgressUpdate={refreshProgress} />
          ) : null}
          {activeTab === "speaking-coach" ? (
            <SpeakingCoach set={set} onProgressUpdate={refreshProgress} />
          ) : null}
          {activeTab === "clip-library" ? (
            <CefrClipLibrary set={set} />
          ) : null}
          {activeTab === "error-notebook" ? (
            <ErrorNotebook set={set} />
          ) : null}
          {activeTab === "review" ? (
            <SmartReview set={set} onProgressUpdate={refreshProgress} />
          ) : null}
          {activeTab === "vocab-lab" ? (
            <VocabularyLab set={set} onProgressUpdate={refreshProgress} />
          ) : null}
          {activeTab === "exam-arena" ? (
            <ExamArena set={set} onProgressUpdate={refreshProgress} />
          ) : null}
        </div>

        <div className="space-y-4">
          <LearningCoachPanel set={set} refreshTick={refreshTick} />
          <SetNotes key={set.id} setId={set.id} />
          <section className="rounded-[1.6rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
            <h3 className="font-display text-2xl text-slate-900">Next Step</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Switch to timed quiz mode after this session to measure retention under pressure.
            </p>
            <Link
              href={`/quiz/${set.id}`}
              className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Open Timed Quiz
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
