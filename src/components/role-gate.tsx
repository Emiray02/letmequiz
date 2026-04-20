"use client";

import Link from "next/link";
import { useProfile } from "@/lib/use-profile";
import type { ProfileRole } from "@/lib/profile-store";

const LABELS: Record<ProfileRole, string> = {
  student: "Öğrenci",
  teacher: "Öğretmen",
};

export default function RoleGate({
  allow,
  children,
  hint,
}: {
  allow: ProfileRole[];
  children: React.ReactNode;
  hint?: string;
}) {
  const { profile, hydrated } = useProfile();
  if (!hydrated) return null;
  if (!profile) return null; // ProfileGate already covers this case
  if (allow.includes(profile.role)) return <>{children}</>;

  return (
    <section className="surface p-6 md:p-8 role-banner-section">
      <div className="role-banner">
        <span className="text-2xl" aria-hidden>🔒</span>
        <div className="grid gap-1">
          <p className="font-semibold">Bu alan sadece {allow.map((r) => LABELS[r]).join(" / ")} profilleri için.</p>
          <p className="text-sm text-[color:var(--fg-muted)]">
            {hint ??
              `Şu an "${profile.name}" (${LABELS[profile.role]}) profilindesin. Üst sağdaki profil menüsünden uygun profile geç ya da yeni bir profil oluştur.`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href="/" className="btn btn-secondary btn-sm">Ana sayfa</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
