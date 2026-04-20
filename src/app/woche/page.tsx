"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStreak, type Streak } from "@/lib/tagesziel-store";
import { listEntries as listFehler } from "@/lib/fehlerheft-store";

type Stats = {
  streak: Streak;
  errors: number;
  errorsThisWeek: number;
  events: number;
  byDay: Array<{ d: string; n: number }>;
};

function loadAnalyticsEvents(): Array<{ at: string; name: string }> {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("letmequiz.analytics.events");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function WochePage() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    const streak = getStreak();
    const errors = listFehler();
    const events = loadAnalyticsEvents();
    const weekAgo = Date.now() - 7 * 86400000;
    const errorsThisWeek = errors.filter(e => new Date(e.at).getTime() >= weekAgo).length;

    const byDay: Array<{d:string;n:number}> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const n = events.filter(e => e.at.startsWith(d)).length;
      byDay.push({ d, n });
    }
    setS({ streak, errors: errors.length, errorsThisWeek, events: events.length, byDay });
  }, []);

  if (!s) return <p className="text-sm text-[color:var(--fg-muted)]">Yükleniyor…</p>;

  const max = Math.max(1, ...s.byDay.map(x => x.n));
  const totalThisWeek = s.byDay.reduce((a, b) => a + b.n, 0);

  return (
    <>
      <header className="mb-6">
        <span className="chip chip-primary">Wochenrückblick</span>
        <h1 className="h-display mt-3 text-3xl md:text-4xl">Haftalık özet</h1>
        <p className="section-subtitle">Bu hafta neler yaptın? Hangi gün boş kaldı?</p>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="stat"><span className="stat-label">Bu hafta</span><span className="stat-value">{totalThisWeek}</span><span className="text-xs text-[color:var(--fg-muted)]">olay</span></div>
        <div className="stat"><span className="stat-label">Streak</span><span className="stat-value">{s.streak.current}🔥</span><span className="text-xs text-[color:var(--fg-muted)]">en uzun {s.streak.longest}</span></div>
        <div className="stat"><span className="stat-label">Hata defteri</span><span className="stat-value">{s.errors}</span><span className="text-xs text-[color:var(--fg-muted)]">bu hafta +{s.errorsThisWeek}</span></div>
        <div className="stat"><span className="stat-label">Toplam olay</span><span className="stat-value">{s.events}</span></div>
      </section>

      <section className="mt-6 surface p-5">
        <p className="eyebrow">Aktivite (son 7 gün)</p>
        <div className="mt-4 flex items-end gap-2" style={{ height: "10rem" }}>
          {s.byDay.map(d => {
            const h = (d.n / max) * 100;
            const day = new Date(d.d).toLocaleDateString("tr-TR", { weekday: "short" });
            return (
              <div key={d.d} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold">{d.n || ""}</span>
                <div style={{
                  width: "100%", height: `${h}%`, minHeight: d.n > 0 ? 4 : 0,
                  background: d.n > 0 ? "var(--primary)" : "var(--bg-sunken)",
                  borderRadius: "0.5rem 0.5rem 0 0",
                }} />
                <span className="text-[10px] text-[color:var(--fg-subtle)]">{day}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        <Link href="/fehlerheft" className="tile card-hover">
          <span className="tile-title">Hata defterini gözden geçir</span>
          <span className="tile-desc">Bu haftaki hatalardan haftalık quiz oluştur.</span>
        </Link>
        <Link href="/tagesziel" className="tile card-hover">
          <span className="tile-title">Yarınki Tagesziel</span>
          <span className="tile-desc">3 mikro-görevi tamamla — streak büyüsün.</span>
        </Link>
        <Link href="/seviye" className="tile card-hover">
          <span className="tile-title">Seviye yeniden test</span>
          <span className="tile-desc">2 hafta geçtiyse adaptif yerleştirmeyi tekrarla.</span>
        </Link>
      </section>
    </>
  );
}
