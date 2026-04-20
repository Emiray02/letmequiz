"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  EXAM_FORMATS,
  buildDynamicPlan,
  daysUntilExam,
  getExamSettings,
  listExamResults,
  saveExamSettings,
  type DynamicPlan,
  type ExamLevel,
  type ExamProvider,
  type ExamSettings,
  type ExamSimulationResult,
} from "@/lib/exam-plan-store";
import { LEARNING_PRINCIPLES } from "@/lib/scientific-methods";

const PROVIDERS: { id: ExamProvider; label: string }[] = [
  { id: "telc", label: "telc Deutsch" },
  { id: "goethe", label: "Goethe-Zertifikat" },
  { id: "oesd", label: "ÖSD" },
  { id: "testdaf", label: "TestDaF" },
  { id: "dsh", label: "DSH" },
  { id: "tuef-yds", label: "YDS / e-YDS" },
  { id: "diger", label: "Diğer" },
];

const LEVELS: ExamLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function ExamPlanPanel() {
  const [settings, setSettings] = useState<ExamSettings | null>(null);
  const [results, setResults] = useState<ExamSimulationResult[]>([]);
  const [editing, setEditing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydration after mount
    setSettings(getExamSettings());
    setResults(listExamResults());
    setHydrated(true);
  }, []);

  function handleSaved(next: ExamSettings) {
    setSettings(next);
    setEditing(false);
    // Re-read results in case profile-scoped key has updated.
    setResults(listExamResults());
  }

  if (!hydrated) return null;

  const plan: DynamicPlan = buildDynamicPlan(settings, results);
  const fmt = settings ? EXAM_FORMATS[settings.provider] : null;
  const days = daysUntilExam(settings);

  return (
    <section className="grid gap-5">
      {!settings || editing ? (
        <ExamSettingsForm initial={settings} onSaved={handleSaved} onCancel={() => setEditing(false)} />
      ) : (
        <div className="surface p-5 md:p-7 grid gap-4 animate-slide-up">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="eyebrow">Sınav planı</span>
              <h2 className="h-display text-2xl mt-1">
                {fmt?.label} · {settings.level}
              </h2>
              <p className="text-sm text-[color:var(--fg-muted)] mt-1">
                Sınav tarihi: <strong>{new Date(settings.examDate).toLocaleDateString("tr-TR")}</strong>
                {" · "}
                Hedef: <strong>günde {settings.hoursPerDay} sa</strong>
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-display font-bold">
                {days != null ? (days >= 0 ? `${days} gün` : `geçti`) : "—"}
              </div>
              <p className="text-xs text-[color:var(--fg-muted)]">sınava kaldı</p>
              <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => setEditing(true)}>
                Ayarları düzenle
              </button>
            </div>
          </header>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="stat stat-primary">
              <span className="stat-label">Sınav hazırlık</span>
              <span className="stat-value">%{plan.examReadinessPct}</span>
              <div className="progress mt-2"><div style={{ width: `${plan.examReadinessPct}%` }} /></div>
            </div>
            <div className="stat">
              <span className="stat-label">Bu hafta odak</span>
              <span className="stat-value text-base font-display leading-tight">
                {plan.weeklyFocus}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Zayıf nokta</span>
              <span className="stat-value text-base font-display leading-tight">
                {plan.weakestSkill ? plan.weakestSkill : "—"}
              </span>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Bugünün dinamik programı ({plan.dailyMinutes} dk)</h3>
            <ol className="grid gap-2">
              {plan.todayTasks.map((t, i) => (
                <li key={i} className="surface-muted p-3 flex flex-wrap items-center gap-3">
                  <span className="chip chip-primary">{t.durationMin} dk</span>
                  <span className="grid flex-1">
                    <strong>{t.title}</strong>
                    <span className="text-xs text-[color:var(--fg-muted)]">{t.reason}</span>
                  </span>
                  {t.href ? (
                    <Link href={t.href} className="btn btn-secondary btn-sm">Aç →</Link>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>

          {fmt ? (
            <div>
              <h3 className="font-semibold mb-2">{fmt.label} — sınav formatı</h3>
              <div className="grid gap-2 md:grid-cols-4">
                {(Object.entries(fmt.sections) as [keyof typeof fmt.sections, { minutes: number; weight: number }][]).map(([k, s]) => (
                  <div key={k} className="surface-muted p-3 text-sm">
                    <p className="eyebrow capitalize">{k}</p>
                    <p className="font-display text-lg mt-1">{s.minutes} dk</p>
                    <p className="text-xs text-[color:var(--fg-muted)]">ağırlık %{s.weight}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {results.length > 0 ? (
            <div>
              <h3 className="font-semibold mb-2">Son simülasyon sonuçları</h3>
              <ul className="grid gap-2">
                {results.slice(0, 5).map((r) => (
                  <li key={r.id} className="surface-muted p-3 text-sm flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <strong>%{r.overall}</strong>
                      <span className="text-[color:var(--fg-muted)]"> · {new Date(r.recordedAt).toLocaleString("tr-TR")}</span>
                    </span>
                    <span className="text-xs text-[color:var(--fg-muted)]">
                      L %{r.scores.lesen} · H %{r.scores.hoeren} · S %{r.scores.schreiben} · Sp %{r.scores.sprechen}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      <details className="surface p-4">
        <summary className="cursor-pointer font-semibold">Sistem hangi bilimsel ilkelere göre çalışıyor?</summary>
        <ul className="grid gap-2 mt-3">
          {LEARNING_PRINCIPLES.map((p) => (
            <li key={p.id} className="surface-muted p-3 text-sm">
              <p className="font-display text-base">{p.title}</p>
              <p className="text-[color:var(--fg-muted)] mt-1">{p.description}</p>
              <p className="text-xs mt-1"><em>{p.evidence}</em></p>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function ExamSettingsForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: ExamSettings | null;
  onSaved: (s: ExamSettings) => void;
  onCancel: () => void;
}) {
  const [provider, setProvider] = useState<ExamProvider>(initial?.provider ?? "telc");
  const [level, setLevel] = useState<ExamLevel>(initial?.level ?? "A2");
  const [examDate, setExamDate] = useState(initial?.examDate ?? "");
  const [hoursPerDay, setHoursPerDay] = useState(initial?.hoursPerDay ?? 1);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!examDate) return;
    const next = saveExamSettings({ provider, level, examDate, hoursPerDay, weakestSkill: initial?.weakestSkill ?? null });
    onSaved(next);
  }

  return (
    <form onSubmit={handleSubmit} className="surface p-5 md:p-7 grid gap-4 animate-slide-up">
      <header>
        <span className="eyebrow">Sınav ayarları</span>
        <h2 className="h-display text-2xl mt-1">Sınav hedefini belirle</h2>
        <p className="text-sm text-[color:var(--fg-muted)] mt-1">
          Sınav kurumunu, seviyeni ve tarihini gir; sistem buna göre günlük programını otomatik kursun.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="prov">Sınav kurumu</label>
          <select id="prov" className="input" value={provider} onChange={(e) => setProvider(e.target.value as ExamProvider)}>
            {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="lvl">Seviye (CEFR)</label>
          <select id="lvl" className="input" value={level} onChange={(e) => setLevel(e.target.value as ExamLevel)}>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="date">Sınav tarihi</label>
          <input id="date" type="date" className="input" value={examDate} onChange={(e) => setExamDate(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="hpd">Günde çalışma (saat)</label>
          <input id="hpd" type="number" min={0.25} max={8} step={0.25} className="input" value={hoursPerDay} onChange={(e) => setHoursPerDay(parseFloat(e.target.value) || 1)} />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        {initial ? (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Vazgeç</button>
        ) : null}
        <button type="submit" className="btn btn-primary">Planı oluştur</button>
      </div>
    </form>
  );
}
