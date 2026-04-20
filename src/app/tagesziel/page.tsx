"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getTagesZiel, getStreak, bumpTask, progressPercent, type TagesZiel, type Streak } from "@/lib/tagesziel-store";

export default function TagesZielPage() {
  const [z, setZ] = useState<TagesZiel | null>(null);
  const [s, setS] = useState<Streak | null>(null);

  useEffect(() => {
    setZ(getTagesZiel());
    setS(getStreak());
  }, []);

  if (!z || !s) {
    return <p className="text-sm text-[color:var(--fg-muted)]">Yükleniyor…</p>;
  }

  function tick(taskId: string, delta = 1) {
    const updated = bumpTask(taskId, delta);
    setZ({ ...updated });
    setS(getStreak());
  }

  const pct = progressPercent(z);
  const allDone = z.tasks.every(t => t.done >= t.target);

  return (
    <>
      <header className="mb-6">
        <span className="chip chip-primary"><span className="status-dot live" /> Bugünün hedefi</span>
        <h1 className="h-display mt-3 text-3xl md:text-4xl">Tagesziel</h1>
        <p className="section-subtitle">Her gün 3 mikro-görev. Tamamlarsan streak yanmaya devam eder.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-[1fr_18rem]">
        <div className="surface p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">İlerleme</p>
            <span className="text-sm font-semibold text-[color:var(--primary)]">{pct}%</span>
          </div>
          <div className="progress mt-2"><span style={{ width: `${pct}%` }} /></div>
          <ul className="mt-5 grid gap-3">
            {z.tasks.map(t => {
              const done = t.done >= t.target;
              return (
                <li key={t.id} className={`card-tight surface-soft flex items-center justify-between gap-3 ${done ? "opacity-70" : ""}`}>
                  <div>
                    <p className="font-semibold text-sm">{t.title}</p>
                    <p className="text-xs text-[color:var(--fg-muted)]">{t.done} / {t.target} {t.unit}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={t.href} className="btn btn-secondary btn-sm">Aç</Link>
                    <button type="button" className="btn btn-primary btn-sm" disabled={done} onClick={() => tick(t.id, 1)}>+1</button>
                  </div>
                </li>
              );
            })}
          </ul>
          {allDone ? (
            <p className="mt-5 chip chip-success animate-pop">🔥 Bugünü tamamladın! Streak: {s.current} gün</p>
          ) : null}
        </div>

        <aside className="surface p-5">
          <p className="eyebrow">Streak</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="streak-flame">🔥</span>
            <div>
              <p className="text-2xl font-bold leading-none">{s.current}</p>
              <p className="text-xs text-[color:var(--fg-muted)]">gün arka arkaya</p>
            </div>
          </div>
          <hr className="divider-soft" />
          <p className="text-xs text-[color:var(--fg-muted)]">En uzun: <strong>{s.longest}</strong> gün</p>
          <p className="mt-1 text-xs text-[color:var(--fg-muted)]">Bugünkü XP: <strong>{z.xp}</strong></p>
          <hr className="divider-soft" />
          <p className="eyebrow">Hızlı bağlantılar</p>
          <div className="mt-2 grid gap-1.5">
            <Link href="/wortschatz" className="link text-sm">→ Wortschatz</Link>
            <Link href="/skills/lesen" className="link text-sm">→ Lesen</Link>
            <Link href="/deutsch/diktat" className="link text-sm">→ Diktat</Link>
            <Link href="/fehlerheft" className="link text-sm">→ Hata defterim</Link>
          </div>
        </aside>
      </section>
    </>
  );
}
