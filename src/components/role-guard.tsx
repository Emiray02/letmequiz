"use client";

/**
 * Wraps a page so it only renders for the matching role.
 * Reads `user_profiles.role` once after mount.
 *
 *   <RoleGuard required="teacher">…</RoleGuard>
 *   <RoleGuard required="student">…</RoleGuard>
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyProfile, upsertMyProfile } from "@/lib/teacher-store";

export type Role = "student" | "teacher";

type State =
  | { kind: "loading" }
  | { kind: "anon" }
  | { kind: "ok"; role: Role }
  | { kind: "wrong"; role: Role }
  | { kind: "missing" };

export default function RoleGuard({
  required,
  children,
}: {
  required: Role;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await getMyProfile();
        if (cancelled) return;
        if (!p) { setState({ kind: "missing" }); return; }
        if (p.role === required) setState({ kind: "ok", role: p.role });
        else setState({ kind: "wrong", role: p.role });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        if (/giri\u015f/i.test(msg) || /authenticated/i.test(msg)) setState({ kind: "anon" });
        else setState({ kind: "missing" });
      }
    })();
    return () => { cancelled = true; };
  }, [required]);

  if (state.kind === "loading") {
    return <main className="app-main app-container pt-12"><p>Yükleniyor…</p></main>;
  }
  if (state.kind === "anon") {
    return (
      <main className="app-main app-container pt-12">
        <h1 className="h-display text-3xl">Önce giriş yap.</h1>
        <Link href="/auth" className="btn btn-primary mt-6 inline-block">Giriş yap / kayıt ol</Link>
      </main>
    );
  }
  if (state.kind === "missing") {
    return (
      <main className="app-main app-container pt-12 max-w-2xl">
        <span className="chip chip-warning">Profilin eksik</span>
        <h1 className="h-display mt-4 text-3xl">Önce hesap türünü seç.</h1>
        <p className="mt-3 text-[color:var(--fg-muted)]">
          Sistem hangi panelin sana açılacağını bilemiyor. Devam etmek için bir kez seç.
        </p>
        <div className="flex gap-3 mt-6">
          <button className="btn btn-primary" onClick={async () => {
            await upsertMyProfile({ role: "student" });
            window.location.reload();
          }}>🎓 Öğrenciyim</button>
          <button className="btn" onClick={async () => {
            await upsertMyProfile({ role: "teacher" });
            window.location.reload();
          }}>🧑‍🏫 Öğretmenim</button>
        </div>
      </main>
    );
  }
  if (state.kind === "wrong") {
    const otherHref = required === "teacher" ? "/heute" : "/teacher";
    const otherLabel = required === "teacher" ? "öğrenci ana ekranı" : "öğretmen paneli";
    return (
      <main className="app-main app-container pt-12 max-w-2xl">
        <span className="chip chip-warning">Erişim engellendi</span>
        <h1 className="h-display mt-4 text-3xl">Bu sayfa {required === "teacher" ? "öğretmenler" : "öğrenciler"} için.</h1>
        <p className="mt-3 text-[color:var(--fg-muted)]">
          Hesabın <strong>{state.role === "teacher" ? "öğretmen" : "öğrenci"}</strong> olarak ayarlanmış.
          {" "}Sana ait alana git:
        </p>
        <Link href={otherHref} className="btn btn-primary mt-6 inline-block">{otherLabel}'na git</Link>
      </main>
    );
  }
  return <>{children}</>;
}
