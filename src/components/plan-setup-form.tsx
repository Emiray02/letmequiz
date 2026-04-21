"use client";

/**
 * Self-serve exam-plan setup form. Used on the home page hero and on /heute
 * when no plan exists yet. Stores plan locally (no account needed); cloud
 * (teacher) plan still wins over this when the user is signed in.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createLocalPlan,
  loadLocalPlan,
  type LocalExamPlan,
} from "@/lib/local-exam-plan";
import { suggestDailyMinutes, todayISO, type CefrLevel } from "@/lib/exam-plan";

const LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2"];

function defaultExamDate(): string {
  // 8 weeks from today — sensible default for a fresh learner.
  const d = new Date();
  d.setDate(d.getDate() + 56);
  return d.toISOString().slice(0, 10);
}

export default function PlanSetupForm({
  onSaved,
  redirectTo,
  compact = false,
}: {
  onSaved?: (plan: LocalExamPlan) => void;
  redirectTo?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [level, setLevel]       = useState<CefrLevel>("A2");
  const [examDate, setExamDate] = useState<string>(defaultExamDate());
  const [auto, setAuto]         = useState(true);
  const [minutes, setMinutes]   = useState(45);
  const [existing, setExisting] = useState<LocalExamPlan | null>(null);

  useEffect(() => {
    const cur = loadLocalPlan();
    if (cur) {
      setExisting(cur);
      setLevel(cur.level);
      setExamDate(cur.examDate);
      setMinutes(cur.dailyMinutes);
      setAuto(false);
    }
  }, []);

  const suggested = useMemo(() => {
    try {
      return suggestDailyMinutes({ level, examDate, startDate: todayISO() });
    } catch { return 45; }
  }, [level, examDate]);

  const effectiveMinutes = auto ? suggested : minutes;
  const today = todayISO();
  const validDate = examDate > today;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validDate) return;
    const plan = createLocalPlan({ level, examDate, dailyMinutes: effectiveMinutes });
    onSaved?.(plan);
    if (redirectTo) router.push(redirectTo);
  }

  return (
    <form onSubmit={submit} className={compact ? "grid gap-3" : "grid gap-4"}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="eyebrow">Hedef seviye</span>
          <select
            className="input"
            value={level}
            onChange={(e) => setLevel(e.target.value as CefrLevel)}
          >
            {LEVELS.map((l) => <option key={l} value={l}>telc {l}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="eyebrow">Sınav tarihi</span>
          <input
            type="date"
            className="input"
            value={examDate}
            min={today}
            onChange={(e) => setExamDate(e.target.value)}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
        <span>Günlük çalışma süresini sistem belirlesin (önerilen: <b>{suggested} dk</b>)</span>
      </label>

      {!auto && (
        <label className="grid gap-1">
          <span className="eyebrow">Günlük dakika ({minutes} dk)</span>
          <input
            type="range" min={15} max={240} step={5}
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
          />
        </label>
      )}

      {!validDate && (
        <p className="text-sm" style={{ color: "#dc2626" }}>
          Sınav tarihi bugünden ileri bir gün olmalı.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-primary" disabled={!validDate}>
          {existing ? "Planı güncelle" : "Plan oluştur"}
        </button>
        {existing && (
          <span className="text-xs text-[color:var(--fg-muted)]">
            Mevcut plan: telc {existing.level} · {existing.examDate} · {existing.dailyMinutes} dk
          </span>
        )}
      </div>
    </form>
  );
}
