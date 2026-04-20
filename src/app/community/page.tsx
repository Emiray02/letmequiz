"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Buddy = { id: string; name: string; goalMinutes: number; days: number; createdAt: number };
type Challenge = { id: string; title: string; targetCards: number; deadline: string; progress: number };

const KEY_BUDDIES = "lmq.community.buddies.v1";
const KEY_CH = "lmq.community.challenges.v1";

function load<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const raw = localStorage.getItem(k); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function save<T>(k: string, v: T) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
function uid() { return Math.random().toString(36).slice(2, 9); }

const SEED_CH: Challenge[] = [
  { id: "ch-spring", title: "Frühling Sprint — 7 günde 70 kelime", targetCards: 70, deadline: "2026-04-27", progress: 0 },
  { id: "ch-doctor", title: "Doctor 100 — 100 cümle düzelt", targetCards: 100, deadline: "2026-05-10", progress: 0 },
  { id: "ch-letter", title: "Schreiben 10 — 10 mektup yaz", targetCards: 10, deadline: "2026-05-05", progress: 0 },
];

export default function CommunityPage() {
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(15);
  const [days, setDays] = useState(7);

  useEffect(() => {
    setBuddies(load<Buddy[]>(KEY_BUDDIES, []));
    const existing = load<Challenge[]>(KEY_CH, []);
    if (existing.length === 0) { save(KEY_CH, SEED_CH); setChallenges(SEED_CH); }
    else setChallenges(existing);
  }, []);

  function addBuddy() {
    if (!name.trim()) return;
    const next: Buddy = { id: uid(), name: name.trim(), goalMinutes: goal, days, createdAt: Date.now() };
    const all = [next, ...buddies];
    setBuddies(all); save(KEY_BUDDIES, all); setName("");
  }
  function removeBuddy(id: string) {
    const all = buddies.filter((b) => b.id !== id);
    setBuddies(all); save(KEY_BUDDIES, all);
  }
  function bump(id: string, delta: number) {
    const all = challenges.map((c) => c.id === id ? { ...c, progress: Math.max(0, Math.min(c.targetCards, c.progress + delta)) } : c);
    setChallenges(all); save(KEY_CH, all);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <section>
        <p className="eyebrow">Lerngemeinschaft</p>
        <h1 className="h-display text-2xl">Birlikte çalışmak motivasyondur</h1>
        <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
          Çalışma arkadaşları + topluluk meydan okumaları — her şey cihazında, hesap yok.
        </p>

        <div className="surface mt-5 p-5">
          <p className="eyebrow">Yeni çalışma arkadaşı (buddy)</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <input className="input" placeholder="İsim (örn. Ayşe)" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" type="number" min={5} max={120} value={goal} onChange={(e) => setGoal(Number(e.target.value))} placeholder="dk/gün" />
            <input className="input" type="number" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value))} placeholder="gün" />
            <button type="button" className="btn btn-primary" onClick={addBuddy}>Ekle</button>
          </div>

          <hr className="divider" />
          {buddies.length === 0 ? (
            <p className="text-sm text-[color:var(--fg-muted)]">Henüz arkadaş yok. İlkini ekle.</p>
          ) : (
            <ul className="grid gap-2">
              {buddies.map((b) => (
                <li key={b.id} className="surface-muted flex items-center justify-between p-3">
                  <div>
                    <div className="font-semibold">{b.name}</div>
                    <div className="text-xs text-[color:var(--fg-muted)]">{b.goalMinutes} dk/gün · {b.days} gün hedef</div>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeBuddy(b.id)}>Sil</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface mt-5 p-5">
          <p className="eyebrow">Topluluk meydan okumaları</p>
          <ul className="mt-3 grid gap-3">
            {challenges.map((c) => {
              const pct = c.targetCards === 0 ? 0 : Math.round((c.progress / c.targetCards) * 100);
              return (
                <li key={c.id} className="surface-muted p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{c.title}</div>
                      <div className="text-xs text-[color:var(--fg-muted)]">Bitiş: {c.deadline}</div>
                    </div>
                    <span className="chip chip-primary">{pct}%</span>
                  </div>
                  <div className="progress mt-2"><div className="progress-bar" style={{ width: `${pct}%` }} /></div>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => bump(c.id, +1)}>+1</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => bump(c.id, +5)}>+5</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => bump(c.id, -1)}>−1</button>
                    <span className="ml-auto text-xs text-[color:var(--fg-subtle)]">{c.progress} / {c.targetCards}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <aside className="surface p-5 h-fit">
        <p className="eyebrow">Buddy nasıl işler?</p>
        <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
          Her gün buddy&apos;ne mesaj atıp ne çalıştığını paylaşırsan istatistik 2 katı motivasyon yapar.
          Listeyi kendine göre tut.
        </p>
        <hr className="divider" />
        <p className="eyebrow">Hızlı eylem</p>
        <div className="mt-3 grid gap-2">
          <Link href="/tagesziel" className="btn btn-secondary btn-block">Bugünün hedefi</Link>
          <Link href="/woche" className="btn btn-secondary btn-block">Haftalık özet</Link>
        </div>
      </aside>
    </div>
  );
}
