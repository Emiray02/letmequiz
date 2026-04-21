"use client";

/**
 * Home hero card: shows the active plan summary if one exists, otherwise a
 * compact setup form so the user can start in one step on the home page.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import PlanSetupForm from "@/components/plan-setup-form";
import { loadLocalPlan, type LocalExamPlan } from "@/lib/local-exam-plan";
import { daysBetween, todayISO } from "@/lib/exam-plan";

export default function HomePlanCard() {
  const [plan, setPlan] = useState<LocalExamPlan | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPlan(loadLocalPlan());
    setLoaded(true);
  }, []);

  if (!loaded) {
    return <div className="surface p-5 md:p-6"><p className="eyebrow">Plan</p></div>;
  }

  if (plan) {
    const daysLeft = Math.max(0, daysBetween(todayISO(), plan.examDate));
    return (
      <div className="surface p-5 md:p-6 animate-slide-up">
        <p className="eyebrow">Aktif sınav planın</p>
        <p className="mt-2 text-3xl font-bold">telc {plan.level}</p>
        <p className="mt-1 text-sm text-[color:var(--fg-muted)]">
          {plan.examDate} · sınava <b>{daysLeft} gün</b> · günlük <b>{plan.dailyMinutes} dk</b>
        </p>
        <div className="mt-4 grid gap-2">
          <Link href="/heute" className="btn btn-primary btn-block">▶ Bugünün planını aç</Link>
          <Link href="/heute/plan" className="btn btn-secondary btn-block">Planı düzenle</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="surface p-5 md:p-6 animate-slide-up">
      <p className="eyebrow">Sınav tarihini gir, plan otomatik gelsin</p>
      <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
        Seviyeni ve sınav tarihini ver — sistem her güne ne çalışacağını tek başına böler.
      </p>
      <div className="mt-4">
        <PlanSetupForm compact redirectTo="/heute" />
      </div>
    </div>
  );
}
