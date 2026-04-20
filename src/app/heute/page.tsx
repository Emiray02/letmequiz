"use client";

/**
 * /heute — "Bugün çalış" daily study mode.
 *
 * Reads the student's active telc exam plan from Supabase, builds today's
 * deterministic schedule via `planForDay()`, and lets the student tick items
 * "yaptım", "zayıfladım" or "atla". State is persisted to `exam_plan_progress`
 * so the teacher sees it and tomorrow's plan can carry weak items forward.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/role-guard";
import {
  getMyActiveCloudExamPlan,
  listPlanProgress,
  recordPlanItem,
  type CloudExamPlan,
  type PlanProgressRow,
} from "@/lib/cloud-exam-plan";
import {
  daysBetween,
  planForDay,
  todayISO,
  type CefrLevel,
  type DailyAdaptation,
  type PlanDayItem,
} from "@/lib/exam-plan";

export default function HeutePage() {
  return (
    <RoleGuard required="student">
      <HeuteInner />
    </RoleGuard>
  );
}

type LoadState =
  | { kind: "loading" }
  | { kind: "no-plan" }
  | { kind: "ready"; plan: CloudExamPlan; rows: PlanProgressRow[] }
  | { kind: "error"; msg: string };

function HeuteInner() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const reload = useCallback(async () => {
    try {
      const plan = await getMyActiveCloudExamPlan();
      if (!plan) { setState({ kind: "no-plan" }); return; }
      const rows = await listPlanProgress(plan.id);
      setState({ kind: "ready", plan, rows });
    } catch (e) {
      setState({ kind: "error", msg: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  if (state.kind === "loading") {
    return <main className="app-main app-container pt-12"><p>Bugünkü plan hazırlanıyor…</p></main>;
  }
  if (state.kind === "error") {
    return (
      <main className="app-main app-container pt-12">
        <p style={{ color: "#dc2626" }}>{state.msg}</p>
      </main>
    );
  }
  if (state.kind === "no-plan") {
    return (
      <main className="app-main app-container pt-12 max-w-2xl">
        <span className="chip chip-warning">Plan yok</span>
        <h1 className="h-display mt-4 text-3xl md:text-5xl">Henüz bir sınav planın yok.</h1>
        <p className="mt-3 text-[color:var(--fg-muted)]">
          Öğretmenin telc seviyeni ve sınav tarihini panelden girince burada
          her güne özel hazır plan oluşur. Öğretmenine davet kodunu gir, o da
          plan atasın.
        </p>
        <div className="flex gap-3 mt-6">
          <Link href="/student" className="btn btn-primary">Öğretmene bağlan</Link>
          <Link href="/grammar/lessons" className="btn">Konu anlatımına git</Link>
        </div>
      </main>
    );
  }

  return <Today plan={state.plan} rows={state.rows} onChange={reload} />;
}

function Today({ plan, rows, onChange }: { plan: CloudExamPlan; rows: PlanProgressRow[]; onChange: () => void }) {
  const today = todayISO();
  const dayIndex = Math.max(0, daysBetween(plan.created_at.slice(0, 10), today));

  // Build adaptation maps from progress history (across ALL days so far).
  const adaptation: DailyAdaptation = useMemo(() => {
    const done = new Set<string>();
    const weak = new Set<string>();
    for (const r of rows) {
      if (r.day_index >= dayIndex) continue; // future/today not consumed
      if (r.status === "done" && (r.score == null || r.score >= 80)) done.add(r.item_id);
      if (r.status === "weak") weak.add(r.item_id);
      // If a previously-weak item was later marked done, drop from weak.
      if (r.status === "done") weak.delete(r.item_id);
    }
    return { done, weak };
  }, [rows, dayIndex]);

  const day = useMemo(() => planForDay({
    level: plan.level as CefrLevel,
    examDate: plan.exam_date,
    startDate: plan.created_at.slice(0, 10),
    dailyMinutes: plan.daily_minutes,
  }, dayIndex, adaptation), [plan, dayIndex, adaptation]);

  const todayRows = useMemo(() => {
    const m = new Map<string, PlanProgressRow>();
    for (const r of rows) if (r.day_index === dayIndex) m.set(r.item_id, r);
    return m;
  }, [rows, dayIndex]);

  const daysLeft = Math.max(0, daysBetween(today, plan.exam_date));

  async function mark(item: PlanDayItem, status: "done" | "skipped" | "weak") {
    try {
      await recordPlanItem({
        plan_id: plan.id,
        day_index: dayIndex,
        item_id: item.id,
        status,
        score: status === "done" ? 100 : status === "weak" ? 50 : null,
      });
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  const totalDone = day.items.filter((it) => todayRows.get(it.id)?.status === "done").length;
  const progressPct = day.items.length === 0 ? 0 : Math.round((totalDone / day.items.length) * 100);

  return (
    <main className="app-main app-container pt-8 md:pt-12">
      <div className="max-w-3xl">
        <div className="flex items-center gap-2">
          <span className="chip chip-primary">telc {plan.level}</span>
          {day.isMock && <span className="chip chip-warning">Mock prüfung</span>}
          {day.isReview && <span className="chip chip-success">Genel tekrar</span>}
          <span className="chip">Sınava {daysLeft} gün</span>
        </div>
        <h1 className="h-display mt-4 text-3xl md:text-5xl">
          Bugünün planı — {day.totalMinutes} dk
        </h1>
        <p className="mt-3 text-[color:var(--fg-muted)]">
          {day.isMock
            ? "Bugün tam sınav simülasyonu. Sessiz bir oda bul, telefonu kapat, kronometreyi başlat."
            : day.isReview
              ? "Bu hafta gördüğün her şeyin hızlı tekrarı. Karta bak, hatırlamadıklarını işaretle."
              : "Aşağıdaki maddeleri sırayla aç ve bitir. Sıkıştığın madde olursa “zayıfladım” de — yarın yeniden gelecek."}
        </p>

        {/* progress bar */}
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
          const row = todayRows.get(it.id);
          const isDone = row?.status === "done";
          const isWeak = row?.status === "weak";
          const isSkip = row?.status === "skipped";
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
        Plan, telc {plan.level} sınav tarihine ({plan.exam_date}) göre günlük {plan.daily_minutes} dk olarak
        otomatik bölündü. Eksik bıraktığın veya zayıf işaretlediğin maddeler sonraki günlere ekleniyor.
        Her 7. gün genel tekrar, her ikinci haftanın 6. günü mock sınavdır. Son hafta sıklıkla mock yaparsın.
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
