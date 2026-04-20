"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

// Ebbinghaus retention curve: R = e^(-t/S), S = stability (days).
// With each successful review at the optimal moment, S roughly doubles.

function curve(stability: number, days: number, samples = 60): Array<{ t: number; r: number }> {
  const out: Array<{ t: number; r: number }> = [];
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * days;
    const r = Math.exp(-t / stability);
    out.push({ t, r });
  }
  return out;
}

function reviewSchedule(initialStability = 1, reviews = 6): Array<{ rev: number; day: number; stability: number }> {
  const out: Array<{ rev: number; day: number; stability: number }> = [];
  let s = initialStability;
  let day = 0;
  out.push({ rev: 0, day: 0, stability: s });
  for (let i = 1; i <= reviews; i++) {
    day += s;
    s = s * 2;
    out.push({ rev: i, day: Math.round(day), stability: s });
  }
  return out;
}

export default function ForgettingCurvePage() {
  const [stability, setStability] = useState(1);
  const [days, setDays] = useState(30);
  const data = useMemo(() => curve(stability, days), [stability, days]);
  const schedule = useMemo(() => reviewSchedule(1, 6), []);

  // SVG dimensions
  const W = 600, H = 260, P = 36;
  const xScale = (t: number) => P + (t / days) * (W - 2 * P);
  const yScale = (r: number) => H - P - r * (H - 2 * P);
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(d.t).toFixed(1)} ${yScale(d.r).toFixed(1)}`).join(" ");

  const half = data.find((d) => d.r <= 0.5);
  const quarter = data.find((d) => d.r <= 0.25);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section>
        <p className="eyebrow">Unutma eğrisi</p>
        <h1 className="h-display text-2xl">Beyninde ne oluyor?</h1>
        <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
          Yeni bir kelime öğrendiğinde, hatırda tutma oranın saatler ve günler içinde düşer.
          Her başarılı tekrar, bu eğriyi yatırır — bilgi daha uzun kalır.
        </p>

        <div className="surface mt-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-[color:var(--fg-muted)]">
              Başlangıç stabilitesi (gün)
              <input className="input" type="number" min={0.25} step={0.25} max={20}
                value={stability} onChange={(e) => setStability(Math.max(0.25, Number(e.target.value)))} />
            </label>
            <label className="grid gap-1 text-xs text-[color:var(--fg-muted)]">
              Pencere (gün)
              <input className="input" type="number" min={1} max={365}
                value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value)))} />
            </label>
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="Unutma eğrisi grafiği">
            {/* axes */}
            <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="var(--border)" />
            <line x1={P} y1={P} x2={P} y2={H - P} stroke="var(--border)" />
            {/* grid: y = 0.25, 0.5, 0.75 */}
            {[0.25, 0.5, 0.75].map((r) => (
              <g key={r}>
                <line x1={P} y1={yScale(r)} x2={W - P} y2={yScale(r)} stroke="var(--border)" strokeDasharray="2 4" />
                <text x={P - 6} y={yScale(r)} textAnchor="end" dy="0.32em" fontSize="10" fill="var(--fg-subtle)">{Math.round(r * 100)}%</text>
              </g>
            ))}
            {/* curve */}
            <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2.5" />
            {/* x labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <text key={p} x={xScale(p * days)} y={H - P + 14} fontSize="10" textAnchor="middle" fill="var(--fg-subtle)">
                {Math.round(p * days)}g
              </text>
            ))}
            {half ? (
              <g>
                <circle cx={xScale(half.t)} cy={yScale(half.r)} r="4" fill="var(--primary)" />
                <text x={xScale(half.t) + 6} y={yScale(half.r) - 6} fontSize="10" fill="var(--primary)">%50 — {half.t.toFixed(1)}g</text>
              </g>
            ) : null}
          </svg>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="stat"><span className="stat-label">%50 düşüş</span><span className="stat-value">{half ? `${half.t.toFixed(1)}g` : "—"}</span></div>
            <div className="stat"><span className="stat-label">%25 düşüş</span><span className="stat-value">{quarter ? `${quarter.t.toFixed(1)}g` : "—"}</span></div>
          </div>
        </div>

        <div className="surface mt-5 p-5">
          <p className="eyebrow">Optimal tekrar takvimi</p>
          <p className="mt-1 text-sm text-[color:var(--fg-muted)]">
            Her başarılı tekrar stabiliteyi ~2× artırır (basit SRS yaklaşımı).
          </p>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-[color:var(--fg-subtle)]">
              <tr><th className="pb-2">Tekrar</th><th className="pb-2">Gün</th><th className="pb-2">Yeni stabilite</th></tr>
            </thead>
            <tbody>
              {schedule.map((s) => (
                <tr key={s.rev} className="border-t border-[color:var(--border)]">
                  <td className="py-2">#{s.rev}</td>
                  <td className="py-2">{s.day}</td>
                  <td className="py-2">{s.stability.toFixed(1)} g</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="surface p-5 h-fit">
        <p className="eyebrow">Özet</p>
        <ul className="mt-2 space-y-2 text-sm">
          <li>· Yeni kelime → 1 gün sonra hatırlat</li>
          <li>· Doğru → 2, 4, 8, 16, 32 gün</li>
          <li>· Yanlış → stabilite sıfırlanır</li>
        </ul>
        <hr className="divider" />
        <Link href="/wortschatz" className="btn btn-primary btn-block">Wortschatz&apos;a git</Link>
        <Link href="/tagesziel" className="btn btn-secondary btn-block mt-2">Bugünün hedefi</Link>
      </aside>
    </div>
  );
}
