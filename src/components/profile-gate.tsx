"use client";

import Link from "next/link";
import { useState } from "react";
import {
  createProfile,
  setActiveProfile,
  type Profile,
  type ProfileRole,
} from "@/lib/profile-store";
import { useProfile } from "@/lib/use-profile";

const ROLE_LABELS: Record<ProfileRole, { title: string; subtitle: string; emoji: string }> = {
  student: {
    title: "Öğrenci",
    subtitle: "Almanca öğreniyorum / sınava hazırlanıyorum",
    emoji: "🎓",
  },
  teacher: {
    title: "Öğretmen",
    subtitle: "Öğrencilerime ödev veriyor, gelişimlerini izliyorum",
    emoji: "🧑‍🏫",
  },
};

const ROLE_KEYS: ProfileRole[] = ["student", "teacher"];

const AVATARS = ["🎓", "👨‍👩‍👧", "🧑‍🏫", "🦊", "🐼", "🐯", "🦄", "🚀", "⭐", "🇩🇪", "📚", "🧠"];

export default function ProfileGate({ children }: { children: React.ReactNode }) {
  const { profile, profiles, hydrated } = useProfile();

  if (!hydrated) {
    // Avoid hydration mismatch — don't gate until client knows the state.
    return <>{children}</>;
  }

  if (profile) return <>{children}</>;

  return (
    <>
      {children}
      <ProfileOnboarding initialProfiles={profiles} />
    </>
  );
}

function ProfileOnboarding({ initialProfiles }: { initialProfiles: Profile[] }) {
  const hasProfiles = initialProfiles.length > 0;
  const [mode, setMode] = useState<"choose" | "create">(hasProfiles ? "choose" : "create");
  const [name, setName] = useState("");
  const [role, setRole] = useState<ProfileRole>("student");
  const [avatar, setAvatar] = useState("🎓");
  const [goal, setGoal] = useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createProfile({ name, role, avatar, goal });
  }

  return (
    <div className="profile-gate">
      <div className="profile-gate-backdrop" />
      <div className="profile-gate-card surface animate-slide-up" role="dialog" aria-modal="true">
        <div className="flex items-center gap-3">
          <span className="chip chip-accent">DE</span>
          <div>
            <h2 className="text-xl font-display font-semibold tracking-tight">Hoş geldin!</h2>
            <p className="text-sm text-[color:var(--fg-muted)]">
              Çalışmalarının kaydedilmesi için bir profil seç ya da oluştur.
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-md border border-[color:var(--border)] p-3 text-sm">
          <span className="font-semibold">Zaten hesabın var mı?</span>{" "}
          <span className="text-[color:var(--fg-muted)]">
            Bulut hesabınla giriş yap; tüm verilerin otomatik gelir.
          </span>
          <div className="mt-2">
            <Link href="/auth" className="btn btn-primary btn-sm">Buluttan giriş yap</Link>
          </div>
        </div>

        {hasProfiles ? (
          <div className="mt-2 flex gap-2 border-b border-[color:var(--border)] pb-2">
            <button
              type="button"
              className={`tab${mode === "choose" ? " active" : ""}`}
              onClick={() => setMode("choose")}
            >
              Profil seç
            </button>
            <button
              type="button"
              className={`tab${mode === "create" ? " active" : ""}`}
              onClick={() => setMode("create")}
            >
              Yeni profil
            </button>
          </div>
        ) : null}

        {mode === "choose" && hasProfiles ? (
          <ul className="mt-4 grid gap-2">
            {initialProfiles.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setActiveProfile(p.id)}
                  className="profile-pick"
                >
                  <span className="profile-avatar" aria-hidden>{p.avatar}</span>
                  <span className="grid">
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-xs text-[color:var(--fg-muted)]">
                      {ROLE_LABELS[p.role].title}
                      {p.goal ? ` · ${p.goal}` : ""}
                    </span>
                  </span>
                  <span className="ml-auto text-[color:var(--fg-subtle)]">→</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {mode === "create" || !hasProfiles ? (
          <form onSubmit={handleCreate} className="mt-4 grid gap-4">
            <div>
              <label className="label" htmlFor="profile-name">Ad</label>
              <input
                id="profile-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn. Emir"
                autoFocus
                required
              />
            </div>

            <div>
              <p className="label">Rol</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {ROLE_KEYS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRole(r);
                      setAvatar(ROLE_LABELS[r].emoji);
                    }}
                    className={`role-card${role === r ? " selected" : ""}`}
                  >
                    <span className="text-2xl" aria-hidden>{ROLE_LABELS[r].emoji}</span>
                    <span className="font-semibold">{ROLE_LABELS[r].title}</span>
                    <span className="text-xs text-[color:var(--fg-muted)]">
                      {ROLE_LABELS[r].subtitle}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="label">Avatar</p>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={`avatar-pick${avatar === a ? " selected" : ""}`}
                    aria-label={`Avatar ${a}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {role === "student" ? (
              <div>
                <label className="label" htmlFor="profile-goal">Hedef (opsiyonel)</label>
                <input
                  id="profile-goal"
                  className="input"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Örn. telc A2 sınavı · Şubat"
                />
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              {hasProfiles ? (
                <button type="button" className="btn btn-ghost" onClick={() => setMode("choose")}>
                  Vazgeç
                </button>
              ) : null}
              <button type="submit" className="btn btn-primary">
                Profili oluştur
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
