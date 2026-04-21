"use client";

/**
 * /heute — "Bugün çalış" daily study mode.
 *
 * Plan source priority:
 *   1. Cloud plan assigned by a teacher (Supabase: exam_plans).
 *   2. Local self-serve plan (localStorage), set up on the home page.
 * If neither exists, render the setup form inline so the user can start in
 * one step.
 *
 * Adaptation: items the user marks "weak" today are re-injected into
 * tomorrow's plan as carry-over, until they're marked "done".
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PlanSetupForm from "@/components/plan-setup-form";
import {
  getMyActiveCloudExamPlan,
  listPlanProgress,
  recordPlanItem,
  type CloudExamPlan,
  type PlanProgressRow,
} from "@/lib/cloud-exam-plan";
import {
  adaptationFromLocalProgress,
  listLocalProgress,
  loadLocalPlan,
  recordLocalProgress,
  type LocalExamPlan,
  type LocalProgressEntry,
} from "@/lib/local-exam-plan";
import {
  daysBetween,
  planForDay,
  todayISO,
  type CefrLevel,
  type DailyAdaptation,
  type PlanDayItem,
} from "@/lib/exam-plan";

type Source =
  | { kind: "cloud"; plan: CloudExamPlan; rows: PlanProgressRow[] }
  | { kind: "local"; plan: LocalExamPlan; rows: LocalProgressEntry[] }
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "error"; msg: string };

export default function HeutePage() {
  const [source, setSource] = useState<Source>({ kind: "loading" });

  const reload = useCallback(async () => {
    // Cloud first (teacher-assigned wins).
    try {
      const plan = await getMyActiveCloudExamPlan();
      if (plan) {
        const rows = await listPlanProgress(plan.id);
        setSource({ kind: "cloud", plan, rows });
        return;
      }
    } catch { /* fall through to local */ }

    const local = loadLocalPlan();
    if (local) {
      setSource({ kind: "local", plan: local, rows: listLocalProgress() });
      return;
    }
    setSource({ kind: "none" });
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  if (source.kind === "loading") {
    return <main className="app-main app-container pt-12"><p>Bugünkü plan hazırlanıyor…</p></main>;
  }
  if (source.kind === "error") {
    return <main className="app-main app-container pt-12"><p style={{ color: "#dc2626" }}>{source.msg}</p></main>;
  }
  if (source.kind === "none") {
    return (
      <main className="app-main app-container pt-12 max-w-2xl">
        <span className="chip chip-warning">Plan yok</span>
        <h1 className="h-display mt-4 text-3xl md:text-5xl">Plan kur, hemen başla</h1>
        <p className="mt-3 text-[color:var(--fg-muted)]">
          Hedef seviyeni ve sınav tarihini gir; sistem her güne ne yapacağını bölsün.
          Hesap gerekmez — istersen sonra öğretmen kodu ile birleştirirsin.
        </p>
        <div className="surface p-5 mt-6">
          <PlanSetupForm onSaved={reload} />
        </div>
        <p className="mt-4 text-xs text-[color:var(--fg-muted)]">
          Öğretmenin sana plan atadıysa otomatik o gelir. <Link href="/student" className="underline">Öğretmene bağlan</Link>.
        </p>
      </main>
    );
  }

  return <Today source={source} onChange={reload} />;
}

function Today({ source, onChange }: { source: Extract<Source, { kind: "cloud" | "local" }>; onChange: () => void }) {
  const today = todayISO();

  const planMeta = useMemo(() => {
    if (source.kind === "cloud") {
      const p = source.plan;
      return {
        level: p.level as CefrLevel,
        examDate: p.exam_date,
        startDate: p.created_at.slice(0, 10),
        dailyMinutes: p.daily_minutes,
      };
    }
    const p = source.plan;
    return {
      level: p.level,
      examDate: p.examDate,
      startDate: p.startDate,
      dailyMinutes: p.dailyMinutes,
    };
  }, [source]);

  const dayIndex = Math.max(0, daysBetween(planMeta.startDate, today));

  const adaptation: DailyAdaptation = useMemo(() => {
    if (source.kind === "cloud") {
      const done = new Set<string>(); const weak = new Set<string>();
      for (const r of source.rows) {
        if (r.day_index >= dayIndex) continue;
        if (r.status === "done" && (r.score == null || r.score >= 80)) { done.add(r.item_id); weak.delete(r.item_id); }
        if (r.status === "weak") weak.add(r.item_id);
      }
      return { done, weak };
    }
    return adaptationFromLocalProgress(source.rows, dayIndex);
  }, [source, dayIndex]);

  const day = useMemo(() => planForDay({
    level: planMeta.level,
    examDate: planMeta.examDate,
    startDate: planMeta.startDate,
    dailyMinutes: planMeta.dailyMinutes,
  }, dayIndex, adaptation), [planMeta, dayIndex, adaptation]);

  const todayStatuses = useMemo(() => {
    const m = new Map<string, "done" | "skipped" | "weak">();
    if (source.kind === "cloud") {
      for (const r of source.rows) if (r.day_index === dayIndex) m.set(r.item_id, r.status);
    } else {
      for (const r of source.rows) if (r.dayIndex === dayIndex) m.set(r.itemId, r.status);
    }
    return m;
  }, [source, dayIndex]);

  const daysLeft = Math.max(0, daysBetween(today, planMeta.examDate));

  async function mark(item: PlanDayItem, status: "done" | "skipped" | "weak") {
    try {
      if (source.kind === "cloud") {
        await recordPlanItem({
          plan_id: source.plan.id,
          day_index: dayIndex,
          item_id: item.id,
          status,
          score: status === "done" ? 100 : status === "weak" ? 50 : null,
        });
      } else {
        recordLocalProgress({ dayIndex, itemId: item.id, status });
      }
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  const totalDone = day.items.filter((it) => todayStatuses.get(it.id) === "done").length;
  const progressPct = day.items.length === 0 ? 0 : Math.round((totalDone / day.items.length) * 100);

  return (
    <main className="app-main app-container pt-8 md:pt-12">
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="chip chip-primary">telc {planMeta.level}</span>
          {day.isMock && <span className="chip chip-warning">Mock prüfung</span>}
          {day.isReview && <span className="chip chip-success">Genel tekrar</span>}
          <span className="chip">Sınava {daysLeft} gün</span>
          {source.kind === "local" && <span className="chip">Kendi planın</span>}
        </div>
        <h1 className="h-display mt-4 text-3xl md:text-5xl">
          Bugünün planı — {day.totalMinutes} dk
        </h1>
        <p className="mt-3 text-[color:var(--fg-muted)]">
          {day.isMock
            ? "Bugün tam sınav simülasyonu. Sessiz bir oda bul, telefonu kapat, kronometreyi başlat."
            : day.isReview
              ? "Bu hafta gördüğün her şeyin hızlı tekrarı. Karta bak, hatırlamadıklarını işaretle."
              : "Aşağıdaki maddeleri sırayla aç ve bitir. Sıkıştığın madde olursa “zayıfım” de — yarın yeniden gelecek."}
        </p>

        <div style={{
          marginTop: 16, height: 8, borderRadius: 999,
          background: "rgba(99,102,241,0.1)", overflow: "hidden",
        }}>
          <div style={{
            width: `${progressPct}%`, height: "100%",
            background: "linear-gradient(90deg,#6366f1,#22c55e)",
            transition: "width .3s ease",
          }} />
        </div>
        <p className="mt-1 text-xs text-[color:var(--fg-muted)]">{totalDone}/{day.items.length} tamamlandı</p>
      </div>

      <section className="mt-8 grid gap-4">
        {day.items.map((it) => {
          const st = todayStatuses.get(it.id);
          const isDone = st === "done";
          const isWeak = st === "weak";
          const isSkip = st === "skipped";
          return (
            <article key={it.id} className="surface p-5"
              style={{
                opacity: isSkip ? 0.55 : 1,
                borderColor: isDone ? "rgba(34,197,94,0.4)" : isWeak ? "rgba(234,179,8,0.4)" : undefined,
              }}>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="chip" style={{ background: kindBg(it.kind) }}>{kindLabel(it.kind)}</span>
                {it.carriedOver && <span className="chip chip-warning">↺ tekrar</span>}
                <span className="text-xs text-[color:var(--fg-muted)]">~{it.minutes} dk</span>
              </div>
              <h2 className="mt-2 text-xl font-semibold">{it.title}</h2>
              <p className="mt-1 text-sm text-[color:var(--fg-muted)]">{it.desc}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={it.href} className="btn btn-primary">▶ Aç</Link>
                <button className="btn" disabled={isDone} onClick={() => mark(it, "done")}>
                  {isDone ? "✓ Yaptım" : "Yaptım"}
                </button>
                <button className="btn" disabled={isWeak} onClick={() => mark(it, "weak")}>
                  {isWeak ? "↺ İşaretlendi" : "Zayıfım, tekrar koy"}
                </button>
                <button className="btn" disabled={isSkip} onClick={() => mark(it, "skipped")}>
                  {isSkip ? "Atlandı" : "Atla"}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <footer className="mt-10 text-xs text-[color:var(--fg-muted)] max-w-3xl">
        Plan, telc {planMeta.level} sınav tarihine ({planMeta.examDate}) göre günlük {planMeta.dailyMinutes} dk olarak
        otomatik bölündü. Eksik bıraktığın veya zayıf işaretlediğin maddeler sonraki günlere ekleniyor.
        Her 7. gün genel tekrar, her ikinci haftanın 6. günü mock sınavdır. Son hafta sıklıkla mock yaparsın.
        {source.kind === "local" && (
          <> · <Link href="/heute/plan" className="underline">Planı değiştir</Link></>
        )}
      </footer>
    </main>
  );
}

function kindBg(k: PlanDayItem["kind"]): string {
  switch (k) {
    case "grammar": return "rgba(99,102,241,0.12)";
    case "vocab":   return "rgba(236,72,153,0.12)";
    case "skill":   return "rgba(14,165,233,0.12)";
    case "review":  return "rgba(34,197,94,0.12)";
    case "mock":    return "rgba(234,88,12,0.12)";
  }
}
function kindLabel(k: PlanDayItem["kind"]): string {
  switch (k) {
    case "grammar": return "Gramer";
    case "vocab":   return "Wortschatz";
    case "skill":   return "Beceri";
    case "review":  return "Tekrar";
    case "mock":    return "Mock";
  }
}
