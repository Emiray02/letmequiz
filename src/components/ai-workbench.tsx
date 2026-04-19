"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import type {
  AiSourceChatResponse,
  AiWorkbenchResponse,
  AiWorkbenchSuccessResponse,
  StudyQuizQuestion,
} from "@/types/ai";

type OutputTab = "summary" | "flashcards" | "quiz" | "guide" | "timeline";

const tabLabels: Array<{ id: OutputTab; label: string }> = [
  { id: "summary", label: "Özet" },
  { id: "flashcards", label: "Flashcard" },
  { id: "quiz", label: "Quiz" },
  { id: "guide", label: "Rehber" },
  { id: "timeline", label: "Zaman çizelgesi" },
];

type AiStatus = {
  ready: boolean;
  provider: "openai" | "openrouter" | "heuristic";
  model: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isHeuristicModel(model: string): boolean {
  return model.startsWith("heuristic");
}

function QuizCard({ q, index }: { q: StudyQuizQuestion; index: number }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <article className="card">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--fg-subtle)]">
        Soru {index + 1}
      </p>
      <h4 className="mt-1 text-base font-semibold">{q.question}</h4>
      <ul className="mt-3 space-y-2">
        {q.options.map((option, i) => {
          const isAnswer = i === q.answerIndex;
          const isPicked = picked === i;
          let cls = "border-[color:var(--border)] bg-[color:var(--bg-elev)]";
          if (picked !== null) {
            if (isAnswer)
              cls =
                "border-[color:var(--success)] bg-[color:color-mix(in_oklab,var(--success)_12%,transparent)]";
            else if (isPicked)
              cls =
                "border-[color:var(--danger)] bg-[color:color-mix(in_oklab,var(--danger)_12%,transparent)]";
          }
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => picked === null && setPicked(i)}
                disabled={picked !== null}
                className={`flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2 text-left text-sm transition ${cls}`}
              >
                <span className="chip" style={{ minWidth: "1.75rem", justifyContent: "center" }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{option}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {picked !== null ? (
        <p className="mt-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-muted)] p-3 text-sm text-[color:var(--fg-muted)]">
          {q.explanation}
        </p>
      ) : null}
    </article>
  );
}

export default function AiWorkbench() {
  const [status, setStatus] = useState<AiStatus | null>(null);

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setStatus(data as AiStatus);
      })
      .catch(() => {
        /* silent */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function onPickFiles(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files).filter((f) => f.size > 0);
    setSelectedFiles(list);
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    onPickFiles(e.dataTransfer.files);
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedFiles.length === 0) {
      setError("Lütfen en az bir kaynak dosya seç.");
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
      for (const file of selectedFiles) formData.append("files", file);
      if (focus.trim()) formData.append("focus", focus.trim());

      const response = await fetch("/api/ai/workbench", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as AiWorkbenchResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Çalışma seti üretilemedi." : payload.errorMessage);
      }
      setResult(payload);
      setSetTitle(payload.toolkit.title);
      setActiveTab("summary");
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleAskSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result) return;
    if (chatQuestion.trim().length < 4) {
      setChatError("Lütfen daha açık bir soru yaz.");
      return;
    }
    setChatError("");
    setIsChatting(true);
    try {
      const response = await fetch("/api/ai/workbench/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText: result.sourceBundle,
          question: chatQuestion.trim(),
        }),
      });
      const payload = (await response.json()) as AiSourceChatResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Soru cevaplanamadı." : payload.errorMessage);
      }
      setChatAnswer(payload.answer);
      setChatSources(payload.citations.map((c) => `${c.source}: ${c.quote}`));
    } catch (err) {
      setChatAnswer("");
      setChatSources([]);
      setChatError(err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setIsChatting(false);
    }
  }

  async function handleCreateSet() {
    if (!result) return;
    const cards = result.toolkit.flashcards
      .map((item) => ({ term: item.term.trim(), definition: item.definition.trim() }))
      .filter((item) => item.term && item.definition)
      .slice(0, 80);
    if (cards.length < 2) {
      setCreateSetError("Set oluşturmak için en az 2 geçerli kart gerekli.");
      return;
    }
    setIsCreatingSet(true);
    setCreateSetError("");
    try {
      const response = await fetch("/api/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: setTitle.trim() || result.toolkit.title,
          description: `${result.fileName} dosyasından AI ile üretildi.`,
          cards,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Set oluşturulamadı.");
      }
      const setId = payload?.data?.id;
      if (typeof setId !== "string" || !setId) throw new Error("Set oluşturuldu ama kimlik dönmedi.");
      setCreatedSetId(setId);
    } catch (err) {
      setCreateSetError(err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setIsCreatingSet(false);
    }
  }

  return (
    <div className="grid gap-6">
      {status ? (
        <div className="surface flex flex-wrap items-center justify-between gap-3 p-4" role="status">
          <div className="flex items-center gap-3">
            <span className={`status-dot ${status.ready ? "live" : "warn"}`} />
            <div>
              <p className="text-sm font-semibold">
                {status.ready ? "AI bağlı" : "AI anahtarı tanımlı değil"}
              </p>
              <p className="text-xs text-[color:var(--fg-muted)]">
                {status.ready
                  ? `Sağlayıcı: ${status.provider} · Model: ${status.model}`
                  : "Şu an yerel sezgisel motor kullanılıyor. Gerçek AI için OPENAI_API_KEY veya OPENROUTER_API_KEY ekle."}
              </p>
            </div>
          </div>
          {!status.ready ? (
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
            >
              Ücretsiz anahtar al
            </a>
          ) : null}
        </div>
      ) : null}

      <section className="surface p-6 md:p-8">
        <form onSubmit={handleGenerate} className="grid gap-5">
          <div>
            <label className="label" htmlFor="workbench-file">
              Kaynak dosyalar
            </label>
            <label
              htmlFor="workbench-file"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-[color:var(--border-strong)] bg-[color:var(--bg-muted)] p-8 text-center transition hover:border-[color:var(--primary)]"
            >
              <span className="text-base font-semibold">Dosyaları buraya bırak</span>
              <span className="text-sm text-[color:var(--fg-muted)]">
                veya tıkla — TXT, MD, CSV, JSON, PDF, DOCX (≤ 8 MB / dosya)
              </span>
              <input
                ref={fileInputRef}
                id="workbench-file"
                type="file"
                multiple
                accept=".txt,.md,.csv,.json,.pdf,.docx"
                onChange={(e) => onPickFiles(e.target.files)}
                className="sr-only"
              />
              {selectedFiles.length > 0 ? (
                <ul className="mt-3 grid w-full max-w-xl gap-1 text-left">
                  {selectedFiles.map((f) => (
                    <li
                      key={`${f.name}-${f.size}`}
                      className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-elev)] px-3 py-1.5 text-xs"
                    >
                      <span className="truncate">{f.name}</span>
                      <span className="text-[color:var(--fg-muted)]">{formatBytes(f.size)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </label>
          </div>

          <div>
            <label className="label" htmlFor="workbench-focus">
              Odak (opsiyonel)
            </label>
            <textarea
              id="workbench-focus"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="Örn: Sınav tanımlarına odaklan ve benzer kavramları karşılaştır."
              className="textarea"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={isGenerating} className="btn btn-primary btn-lg">
              {isGenerating ? "Analiz ediliyor…" : "Çalışma setini oluştur"}
            </button>
            {selectedFiles.length > 0 ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSelectedFiles([]);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Temizle
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-[var(--radius-md)] border border-[color:color-mix(in_oklab,var(--danger)_30%,transparent)] bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2 text-sm text-[color:var(--danger)]">
              {error}
            </p>
          ) : null}
        </form>
      </section>

      {result ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="surface-muted p-4">
              <p className="text-xs uppercase tracking-wide text-[color:var(--fg-subtle)]">Kaynak</p>
              <p className="mt-1 text-base font-semibold">{result.sourceFiles.length} dosya</p>
            </div>
            <div className="surface-muted p-4">
              <p className="text-xs uppercase tracking-wide text-[color:var(--fg-subtle)]">Boyut</p>
              <p className="mt-1 text-base font-semibold">{formatBytes(result.sizeBytes)}</p>
            </div>
            <div className="surface-muted p-4">
              <p className="text-xs uppercase tracking-wide text-[color:var(--fg-subtle)]">Karakter</p>
              <p className="mt-1 text-base font-semibold">{result.extractedChars.toLocaleString("tr-TR")}</p>
            </div>
            <div className="surface-muted p-4">
              <p className="text-xs uppercase tracking-wide text-[color:var(--fg-subtle)]">Model</p>
              <p className="mt-1 truncate text-base font-semibold" title={result.usedAiModel}>
                {result.usedAiModel}
              </p>
              {isHeuristicModel(result.usedAiModel) ? (
                <p className="mt-1 text-xs text-[color:var(--warning)]">
                  Yerel sezgisel motor — daha kaliteli sonuç için AI anahtarı ekle.
                </p>
              ) : null}
            </div>
          </section>

          {result.warnings.length ? (
            <div className="rounded-[var(--radius-md)] border border-[color:color-mix(in_oklab,var(--warning)_30%,transparent)] bg-[color:color-mix(in_oklab,var(--warning)_10%,transparent)] px-3 py-2 text-sm text-[color:var(--warning)]">
              {result.warnings.join(" ")}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="tabs-strip">
              {tabLabels.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab${activeTab === tab.id ? " active" : ""}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={setTitle}
                onChange={(e) => setSetTitle(e.target.value)}
                placeholder="Set başlığı"
                className="input"
                style={{ maxWidth: "16rem" }}
              />
              <button
                type="button"
                onClick={handleCreateSet}
                disabled={isCreatingSet}
                className="btn btn-primary btn-sm"
              >
                {isCreatingSet ? "Oluşturuluyor…" : "Set olarak kaydet"}
              </button>
            </div>
          </div>

          {createSetError ? (
            <p className="rounded-[var(--radius-md)] border border-[color:color-mix(in_oklab,var(--danger)_30%,transparent)] bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2 text-sm text-[color:var(--danger)]">
              {createSetError}
            </p>
          ) : null}
          {createdSetId ? (
            <Link href={`/set/${createdSetId}`} className="btn btn-secondary self-start">
              Oluşturulan seti aç →
            </Link>
          ) : null}

          {activeTab === "summary" ? (
            <section className="surface space-y-5 p-6 md:p-8">
              <h3 className="h-display text-2xl">{result.toolkit.title}</h3>
              <p className="text-base">{result.toolkit.conciseSummary}</p>
              <p className="text-sm leading-relaxed text-[color:var(--fg-muted)]">
                {result.toolkit.deepSummary}
              </p>
              <div>
                <p className="label">Anahtar içgörüler</p>
                <ul className="grid gap-2 md:grid-cols-2">
                  {result.toolkit.keyInsights.map((insight, i) => (
                    <li
                      key={i}
                      className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-muted)] px-3 py-2 text-sm"
                    >
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="label">Sözlük</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {result.toolkit.glossary.slice(0, 12).map((g) => (
                    <article key={g.term} className="card">
                      <h4 className="text-sm font-semibold">{g.term}</h4>
                      <p className="mt-1 text-sm">{g.definition}</p>
                      <p className="mt-2 text-xs text-[color:var(--fg-muted)]">{g.example}</p>
                    </article>
                  ))}
                </div>
              </div>
              <div>
                <p className="label">Alıntılar</p>
                <ul className="grid gap-2">
                  {result.toolkit.citations.slice(0, 8).map((c, i) => (
                    <li key={i} className="card">
                      <p className="text-xs font-semibold text-[color:var(--fg-muted)]">{c.source}</p>
                      <p className="mt-1 text-sm">{c.quote}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          {activeTab === "flashcards" ? (
            <section className="surface space-y-4 p-6 md:p-8">
              <div className="flex items-center justify-between">
                <h3 className="h-display text-2xl">Flashcardlar</h3>
                <span className="chip">{result.toolkit.flashcards.length} kart</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {result.toolkit.flashcards.slice(0, 40).map((card, i) => (
                  <article key={i} className="card">
                    <h4 className="text-sm font-semibold">{card.term}</h4>
                    <p className="mt-2 text-sm text-[color:var(--fg-muted)]">{card.definition}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === "quiz" ? (
            <section className="surface space-y-4 p-6 md:p-8">
              <h3 className="h-display text-2xl">Quiz</h3>
              <div className="grid gap-3">
                {result.toolkit.quiz.slice(0, 12).map((q, i) => (
                  <QuizCard key={i} q={q} index={i} />
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === "guide" ? (
            <section className="surface space-y-5 p-6 md:p-8">
              <h3 className="h-display text-2xl">Çalışma rehberi</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="label">Önce ezberle</p>
                  <ul className="grid gap-2">
                    {result.toolkit.studyGuide.memorizeFirst.map((s, i) => (
                      <li key={i} className="surface-muted p-3 text-sm">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="label">Sık yapılan hatalar</p>
                  <ul className="grid gap-2">
                    {result.toolkit.studyGuide.commonTraps.map((s, i) => (
                      <li key={i} className="surface-muted p-3 text-sm">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="label">Sınav tarzı sorular</p>
                  <ul className="grid gap-2">
                    {result.toolkit.studyGuide.examStylePrompts.map((s, i) => (
                      <li key={i} className="surface-muted p-3 text-sm">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <p className="label">Yazma soruları</p>
                <ul className="grid gap-2 md:grid-cols-2">
                  {result.toolkit.writingPrompts.map((s, i) => (
                    <li key={i} className="surface-muted p-3 text-sm">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          {activeTab === "timeline" ? (
            <section className="surface space-y-4 p-6 md:p-8">
              <h3 className="h-display text-2xl">Zaman çizelgesi</h3>
              <ol className="relative ml-4 grid gap-4 border-l border-[color:var(--border)] pl-6">
                {result.toolkit.timeline.map((t, i) => (
                  <li key={i} className="relative">
                    <span
                      className="absolute -left-[31px] top-2 inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: "var(--primary)" }}
                    />
                    <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--fg-muted)]">
                      {t.label}
                    </p>
                    <p className="text-sm">{t.detail}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="surface space-y-4 p-6 md:p-8">
            <div>
              <h3 className="h-display text-2xl">Kaynaklara sor</h3>
              <p className="text-sm text-[color:var(--fg-muted)]">
                Yüklediğin tüm kaynaklar üzerinden alıntılı cevap al.
              </p>
            </div>
            <form onSubmit={handleAskSource} className="grid gap-3">
              <textarea
                value={chatQuestion}
                onChange={(e) => setChatQuestion(e.target.value)}
                placeholder="Örn: Sınavda en sık çıkan 3 kavramı özetler misin?"
                className="textarea"
              />
              <div>
                <button type="submit" disabled={isChatting} className="btn btn-primary">
                  {isChatting ? "Aranıyor…" : "Sor"}
                </button>
              </div>
            </form>
            {chatError ? (
              <p className="rounded-[var(--radius-md)] border border-[color:color-mix(in_oklab,var(--danger)_30%,transparent)] bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2 text-sm text-[color:var(--danger)]">
                {chatError}
              </p>
            ) : null}
            {chatAnswer ? (
              <div className="grid gap-3">
                <article className="surface-muted whitespace-pre-wrap p-4 text-sm">{chatAnswer}</article>
                {chatSources.length ? (
                  <ul className="grid gap-2">
                    {chatSources.map((s, i) => (
                      <li key={i} className="card text-xs text-[color:var(--fg-muted)]">
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}