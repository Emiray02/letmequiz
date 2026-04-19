"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type {
  AiSourceChatResponse,
  AiWorkbenchResponse,
  AiWorkbenchSuccessResponse,
  StudyQuizQuestion,
} from "@/types/ai";

type OutputTab = "summary" | "flashcards" | "quiz" | "guide" | "timeline";

const tabLabels: Array<{ id: OutputTab; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "flashcards", label: "Flashcards" },
  { id: "quiz", label: "Quiz" },
  { id: "guide", label: "Study Guide" },
  { id: "timeline", label: "Timeline" },
];

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function renderQuizQuestion(question: StudyQuizQuestion, index: number) {
  return (
    <article key={`${question.question}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">Question {index + 1}</p>
      <h4 className="mt-1 text-base font-semibold text-slate-900">{question.question}</h4>
      <ul className="mt-3 space-y-2">
        {question.options.map((option, optionIndex) => (
          <li
            key={`${question.question}-option-${optionIndex}`}
            className={`rounded-xl border px-3 py-2 text-sm ${
              optionIndex === question.answerIndex
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {String.fromCharCode(65 + optionIndex)}. {option}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-slate-600">{question.explanation}</p>
    </article>
  );
}

export default function AiWorkbench() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [focus, setFocus] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<AiWorkbenchSuccessResponse | null>(null);
  const [activeTab, setActiveTab] = useState<OutputTab>("summary");
  const [error, setError] = useState("");

  const [setTitle, setSetTitle] = useState("");
  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const [createSetError, setCreateSetError] = useState("");
  const [createdSetId, setCreatedSetId] = useState("");

  const [chatQuestion, setChatQuestion] = useState("");
  const [chatAnswer, setChatAnswer] = useState("");
  const [chatSources, setChatSources] = useState<string[]>([]);
  const [chatError, setChatError] = useState("");
  const [isChatting, setIsChatting] = useState(false);

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      setError("Please choose at least one source file before generating.");
      return;
    }

    setError("");
    setCreateSetError("");
    setCreatedSetId("");
    setChatQuestion("");
    setChatAnswer("");
    setChatError("");
    setChatSources([]);
    setIsGenerating(true);

    try {
      const formData = new FormData();
      for (const file of selectedFiles) {
        formData.append("files", file);
      }
      if (focus.trim()) {
        formData.append("focus", focus.trim());
      }

      const response = await fetch("/api/ai/workbench", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as AiWorkbenchResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Failed to generate study toolkit." : payload.errorMessage);
      }

      setResult(payload);
      setSetTitle(payload.toolkit.title);
      setActiveTab("summary");
    } catch (generationError) {
      setResult(null);
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Unexpected error while generating the toolkit."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleAskSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!result) {
      return;
    }

    if (chatQuestion.trim().length < 4) {
      setChatError("Please enter a more specific question.");
      return;
    }

    setChatError("");
    setIsChatting(true);

    try {
      const response = await fetch("/api/ai/workbench/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceText: result.sourceBundle,
          question: chatQuestion.trim(),
        }),
      });

      const payload = (await response.json()) as AiSourceChatResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Could not answer question from sources." : payload.errorMessage);
      }

      setChatAnswer(payload.answer);
      setChatSources(payload.citations.map((citation) => `${citation.source}: ${citation.quote}`));
    } catch (askError) {
      setChatAnswer("");
      setChatSources([]);
      setChatError(askError instanceof Error ? askError.message : "Unexpected error in source chat.");
    } finally {
      setIsChatting(false);
    }
  }

  async function handleCreateSet() {
    if (!result) {
      return;
    }

    const cards = result.toolkit.flashcards
      .map((item) => ({
        term: item.term.trim(),
        definition: item.definition.trim(),
      }))
      .filter((item) => item.term.length > 0 && item.definition.length > 0)
      .slice(0, 80);

    if (cards.length < 2) {
      setCreateSetError("At least 2 valid generated flashcards are required to create a set.");
      return;
    }

    setIsCreatingSet(true);
    setCreateSetError("");

    try {
      const response = await fetch("/api/sets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: setTitle.trim() || result.toolkit.title,
          description: `Generated from ${result.fileName} with AI Workbench.`,
          cards,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof payload?.error === "string" ? payload.error : "Failed to create study set from AI output."
        );
      }

      const setId = payload?.data?.id;
      if (typeof setId !== "string" || setId.length === 0) {
        throw new Error("Study set created but no ID was returned.");
      }

      setCreatedSetId(setId);
    } catch (createError) {
      setCreateSetError(
        createError instanceof Error ? createError.message : "Unexpected error while creating set."
      );
    } finally {
      setIsCreatingSet(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.9rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] backdrop-blur md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">NotebookLM Style</p>
        <h2 className="mt-2 font-display text-3xl leading-tight text-slate-900 md:text-4xl">
          Upload sources and generate a full study toolkit.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 md:text-base">
          Supports TXT, MD, CSV, JSON, PDF, and DOCX. The assistant extracts the source text and builds summary,
          glossary, flashcards, quiz, citations, timeline, and writing prompts.
        </p>

        <form onSubmit={handleGenerate} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="workbench-file" className="text-sm font-semibold text-slate-700">
              Source files
            </label>
            <input
              id="workbench-file"
              type="file"
              multiple
              accept=".txt,.md,.csv,.json,.pdf,.docx"
              onChange={(event) =>
                setSelectedFiles(Array.from(event.target.files ?? []).filter((item) => item.size > 0))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              required
            />
            <p className="text-xs text-slate-500">
              {selectedFiles.length > 0
                ? `${selectedFiles.length} file selected`
                : "Select one or more files to build a shared knowledge base."}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="workbench-focus" className="text-sm font-semibold text-slate-700">
              Optional focus prompt
            </label>
            <textarea
              id="workbench-focus"
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
              placeholder="Example: Emphasize exam definitions and compare similar concepts"
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-cyan-500 transition focus:ring"
            />
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isGenerating ? "Analyzing Source..." : "Generate Study Toolkit"}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
      </section>

      {result ? (
        <>
          <section className="grid gap-3 rounded-[1.6rem] border border-black/10 bg-white/80 p-4 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] backdrop-blur sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sources</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{result.sourceFiles.length} files</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Primary Size</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatMegabytes(result.sizeBytes)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Chars</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{result.extractedChars}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Model</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">{result.usedAiModel}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Source List</p>
            <ul className="mt-2 grid gap-2 md:grid-cols-2">
              {result.sourceFiles.map((source) => (
                <li
                  key={`${source.fileName}-${source.sizeBytes}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  {source.fileName} ({Math.round(source.extractedChars / 100) / 10}k chars)
                </li>
              ))}
            </ul>
          </section>

          {result.warnings.length ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {result.warnings.join(" ")}
            </section>
          ) : null}

          <section className="grid gap-2 rounded-[1.4rem] border border-black/10 bg-white/80 p-3 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.8)] backdrop-blur sm:grid-cols-5">
            {tabLabels.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  tab.id === activeTab
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </section>

          {activeTab === "summary" ? (
            <section className="space-y-4 rounded-[1.8rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
              <h3 className="font-display text-3xl text-slate-900">{result.toolkit.title}</h3>
              <p className="text-base text-slate-700">{result.toolkit.conciseSummary}</p>
              <p className="text-sm leading-relaxed text-slate-600">{result.toolkit.deepSummary}</p>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Key Insights</p>
                <ul className="mt-2 space-y-2">
                  {result.toolkit.keyInsights.map((insight, index) => (
                    <li key={`${insight}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Glossary</p>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  {result.toolkit.glossary.slice(0, 10).map((item) => (
                    <article key={item.term} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <h4 className="text-sm font-semibold text-slate-900">{item.term}</h4>
                      <p className="mt-1 text-sm text-slate-700">{item.definition}</p>
                      <p className="mt-2 text-xs text-slate-500">{item.example}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Citations</p>
                <ul className="mt-2 space-y-2">
                  {result.toolkit.citations.slice(0, 8).map((citation, index) => (
                    <li
                      key={`${citation.source}-${index}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                    >
                      <p className="font-semibold text-slate-800">{citation.source}</p>
                      <p className="mt-1 text-slate-600">{citation.quote}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          {activeTab === "flashcards" ? (
            <section className="space-y-3 rounded-[1.8rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
              <h3 className="font-display text-3xl text-slate-900">Generated Flashcards</h3>
              <p className="text-sm text-slate-600">Total cards: {result.toolkit.flashcards.length}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {result.toolkit.flashcards.slice(0, 30).map((card, index) => (
                  <article key={`${card.term}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <h4 className="text-sm font-semibold text-slate-900">{card.term}</h4>
                    <p className="mt-2 text-sm text-slate-700">{card.definition}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === "quiz" ? (
            <section className="space-y-3 rounded-[1.8rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
              <h3 className="font-display text-3xl text-slate-900">Quiz Pack</h3>
              <div className="space-y-3">{result.toolkit.quiz.slice(0, 10).map(renderQuizQuestion)}</div>
            </section>
          ) : null}

          {activeTab === "guide" ? (
            <section className="space-y-4 rounded-[1.8rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
              <h3 className="font-display text-3xl text-slate-900">Study Guide</h3>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Memorize First</p>
                <ul className="mt-2 space-y-2">
                  {result.toolkit.studyGuide.memorizeFirst.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Common Traps</p>
                <ul className="mt-2 space-y-2">
                  {result.toolkit.studyGuide.commonTraps.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Exam Style Prompts</p>
                <ul className="mt-2 space-y-2">
                  {result.toolkit.studyGuide.examStylePrompts.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Writing Prompts</p>
                <ul className="mt-2 space-y-2">
                  {result.toolkit.writingPrompts.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          {activeTab === "timeline" ? (
            <section className="space-y-3 rounded-[1.8rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
              <h3 className="font-display text-3xl text-slate-900">Timeline</h3>
              <div className="space-y-3">
                {result.toolkit.timeline.map((item, index) => (
                  <article
                    key={`${item.label}-${index}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="mt-1 text-sm text-slate-700">{item.detail}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-[1.8rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
            <h3 className="font-display text-3xl text-slate-900">Convert To Study Set</h3>
            <p className="mt-2 text-sm text-slate-600">
              Push generated flashcards directly into your set library and continue with Smart Review.
            </p>

            <div className="mt-4 space-y-3">
              <input
                value={setTitle}
                onChange={(event) => setSetTitle(event.target.value)}
                placeholder="Set title"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-cyan-500 focus:ring"
              />

              <button
                type="button"
                onClick={handleCreateSet}
                disabled={isCreatingSet}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCreatingSet ? "Creating Set..." : "Create Set From AI Flashcards"}
              </button>

              {createSetError ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {createSetError}
                </p>
              ) : null}

              {createdSetId ? (
                <Link
                  href={`/set/${createdSetId}`}
                  className="inline-flex rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                >
                  Open Created Set
                </Link>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      {result ? (
        <section className="rounded-[1.8rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
          <h3 className="font-display text-3xl text-slate-900">Source Chat</h3>
          <p className="mt-2 text-sm text-slate-600">
            Ask questions directly over all uploaded sources and get grounded answers with citations.
          </p>

          <form onSubmit={handleAskSource} className="mt-4 space-y-3">
            <textarea
              value={chatQuestion}
              onChange={(event) => setChatQuestion(event.target.value)}
              placeholder="Example: Which 3 concepts are most likely to appear in exam questions?"
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-cyan-500 transition focus:ring"
            />
            <button
              type="submit"
              disabled={isChatting}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isChatting ? "Searching Sources..." : "Ask Sources"}
            </button>
          </form>

          {chatError ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {chatError}
            </p>
          ) : null}

          {chatAnswer ? (
            <div className="mt-4 space-y-3">
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {chatAnswer}
              </article>
              {chatSources.length ? (
                <ul className="space-y-2">
                  {chatSources.map((source, index) => (
                    <li key={`${source}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                      {source}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
