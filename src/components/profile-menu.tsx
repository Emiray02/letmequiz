"use client";

import { useEffect, useRef, useState } from "react";
import { deleteProfile, setActiveProfile } from "@/lib/profile-store";
import { useProfile } from "@/lib/use-profile";

export default function ProfileMenu() {
  const { profile, profiles, hydrated } = useProfile();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!hydrated || !profile) return null;

  return (
    <div className="profile-menu" ref={ref}>
      <button
        type="button"
        className="profile-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${profile.name} · ${profile.role}`}
      >
        <span className="profile-avatar-sm" aria-hidden>{profile.avatar}</span>
        <span className="hidden sm:inline text-sm font-semibold truncate max-w-[10ch]">
          {profile.name}
        </span>
      </button>
      {open ? (
        <div className="profile-pop surface" role="menu">
          <div className="px-3 py-3 border-b border-[color:var(--border)]">
            <p className="text-xs uppercase tracking-wide text-[color:var(--fg-subtle)]">
              Etkin profil
            </p>
            <p className="font-semibold mt-0.5">{profile.name}</p>
            <p className="text-xs text-[color:var(--fg-muted)]">
              {profile.role === "student" ? "Öğrenci" : "Öğretmen"}
              {profile.goal ? ` · ${profile.goal}` : ""}
            </p>
          </div>

          {profiles.length > 1 ? (
            <div className="px-2 py-2 border-b border-[color:var(--border)]">
              <p className="px-1 text-xs uppercase tracking-wide text-[color:var(--fg-subtle)] mb-1">
                Profil değiştir
              </p>
              <ul className="grid gap-0.5">
                {profiles
                  .filter((p) => p.id !== profile.id)
                  .map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="profile-row"
                        onClick={() => {
                          setActiveProfile(p.id);
                          setOpen(false);
                        }}
                      >
                        <span className="profile-avatar-sm" aria-hidden>{p.avatar}</span>
                        <span className="grid text-left">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-[10px] text-[color:var(--fg-muted)]">
                            {p.role === "student" ? "Öğrenci" : "Öğretmen"}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          <div className="px-2 py-2 grid gap-0.5">
            <button
              type="button"
              className="profile-row"
              onClick={() => {
                setActiveProfile(null);
                setOpen(false);
              }}
            >
              <span aria-hidden>➕</span>
              <span>Yeni profil ekle</span>
            </button>
            <button
              type="button"
              className="profile-row danger"
              onClick={() => {
                if (
                  confirm(
                    `${profile.name} profilini ve bu cihazdaki çalışmalarını silmek istediğine emin misin?`,
                  )
                ) {
                  deleteProfile(profile.id);
                  setOpen(false);
                }
              }}
            >
              <span aria-hidden>🗑️</span>
              <span>Bu profili sil</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
