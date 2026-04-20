"use client";

import RoleGuard from "@/components/role-guard";
import { useEffect, useMemo, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import {
  listAssignmentsForStudent,
  listMyTeachers,
  redeemTeacherCode,
  unlinkTeacher,
  updateAssignmentStatus,
  upsertMyProfile,
  type Assignment,
  type LinkedTeacher,
} from "@/lib/teacher-store";

type AuthState =
  | { state: "loading" }
  | { state: "anon" }
  | { state: "ready"; userId: string; email: string | null };

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("tr-TR"); } catch { return iso; }
}

export default function StudentDashboardPage() {
  return (
    <RoleGuard required="student">
      <StudentDashboardInner />
    </RoleGuard>
  );
}

function StudentDashboardInner() {
  const [auth, setAuth] = useState<AuthState>({ state: "loading" });
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [teachers, setTeachers] = useState<LinkedTeacher[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    const c = getBrowserSupabaseClient();
    if (!c) { setAuth({ state: "anon" }); return; }
    (async () => {
      const { data } = await c.auth.getUser();
      if (data.user) setAuth({ state: "ready", userId: data.user.id, email: data.user.email ?? null });
      else setAuth({ state: "anon" });
    })();
    const { data: sub } = c.auth.onAuthStateChange((_e, session) => {
      if (session?.user) setAuth({ state: "ready", userId: session.user.id, email: session.user.email ?? null });
      else setAuth({ state: "anon" });
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  async function refresh() {
    if (auth.state !== "ready") return;
    setLoading(true);
    setErr(null);
    try {
      await upsertMyProfile({ role: "student" });
      const [t, a] = await Promise.all([listMyTeachers(), listAssignmentsForStudent()]);
      setTeachers(t);
      setAssignments(a);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (auth.state === "ready") void refresh(); }, [auth.state]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setRedeeming(true);
    setErr(null);
    try {
      await redeemTeacherCode(code.trim().toUpperCase());
      setOkMsg("Öğretmenine bağlandın.");
      setCode("");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRedeeming(false);
    }
  }

  async function onUnlink(teacherId: string) {
    if (!confirm("Bu öğretmenle bağlantını kesmek istediğine emin misin?")) return;
    try { await unlinkTeacher(teacherId); await refresh(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }

  async function onMark(id: string, status: Assignment["status"]) {
    try { await updateAssignmentStatus(id, status); await refresh(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }

  async function onSaveName() {
    if (!displayName.trim()) return;
    setSavingName(true);
    try {
      await upsertMyProfile({ display_name: displayName.trim(), role: "student" });
      setOkMsg("İsim kaydedildi. Öğretmenin artık seni bu isimle görür.");
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setSavingName(false); }
  }

  const teacherName = useMemo(() => {
    const map = new Map(teachers.map((t) => [t.teacher_user_id, t.display_name]));
    return (id: string) => map.get(id) ?? id.slice(0, 8);
  }, [teachers]);

  if (auth.state === "loading") {
    return <main className="app-main app-container pt-12"><p>Yükleniyor…</p></main>;
  }

  if (auth.state === "anon") {
    return (
      <main className="app-main app-container pt-12">
        <div className="max-w-2xl">
          <span className="chip chip-warning">Ödevlerim</span>
          <h1 className="h-display mt-4 text-3xl md:text-5xl">Önce hesabına giriş yap.</h1>
          <p className="mt-3 text-base text-[color:var(--fg-muted)]">
            Öğretmeninden aldığın davet kodunu girip onun verdiği ödevleri buradan takip edebilirsin.
          </p>
          <a href="/auth" className="btn btn-primary mt-6 inline-block">Giriş yap / kayıt ol</a>
        </div>
      </main>
    );
  }

  const open = assignments.filter((a) => a.status === "open");
  const archive = assignments.filter((a) => a.status !== "open");

  return (
    <main className="app-main app-container pt-8 md:pt-12">
      <div className="max-w-3xl">
        <span className="chip chip-success">Ödevlerim</span>
        <h1 className="h-display mt-4 text-3xl md:text-5xl">Öğretmeninle bağlan, ödevleri takip et.</h1>
        <p className="mt-3 text-base text-[color:var(--fg-muted)]">
          Öğretmeninin verdiği davet kodunu gir, sana atadığı ödevleri burada gör.
        </p>
      </div>

      {err && (
        <div className="surface mt-6 p-4" style={{ borderColor: "rgba(239,68,68,0.4)", color: "#dc2626" }}>
          {err}
        </div>
      )}
      {okMsg && (
        <div className="surface mt-6 p-4" style={{ borderColor: "rgba(34,197,94,0.4)", color: "#16a34a" }}>
          {okMsg}
        </div>
      )}

      <section className="surface mt-8 p-6">
        <h2 className="text-xl font-semibold">Görünen ismin</h2>
        <p className="mt-1 text-sm text-[color:var(--fg-muted)]">
          Öğretmenin seni bu isimle görür.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={auth.email ?? "Adın"}
            style={{ minWidth: 240 }}
          />
          <button className="btn btn-secondary" onClick={onSaveName} disabled={savingName || !displayName.trim()}>
            {savingName ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </section>

      <section className="surface mt-6 p-6">
        <h2 className="text-xl font-semibold">Öğretmen davet kodu</h2>
        <form onSubmit={onRedeem} className="mt-4 flex flex-wrap gap-3">
          <input
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ör. 4F7K2P"
            style={{ minWidth: 200, letterSpacing: "0.2em", fontFamily: "monospace" }}
            maxLength={12}
          />
          <button className="btn btn-primary" type="submit" disabled={redeeming || !code.trim()}>
            {redeeming ? "Bağlanıyor…" : "Bağlan"}
          </button>
        </form>
        {teachers.length > 0 && (
          <ul className="mt-5 grid gap-2">
            {teachers.map((t) => (
              <li key={t.teacher_user_id} className="flex items-center justify-between rounded-md border border-[color:var(--border)] p-3">
                <div>
                  <div className="font-semibold">{t.display_name ?? `Öğretmen ${t.teacher_user_id.slice(0, 6)}`}</div>
                  <div className="text-xs text-[color:var(--fg-muted)]">Bağlandı: {fmtDate(t.linked_at)}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => onUnlink(t.teacher_user_id)}>
                  Bağlantıyı kes
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface mt-6 p-6">
        <h2 className="text-xl font-semibold">Açık ödevler ({open.length})</h2>
        {loading && <p className="mt-2 text-sm text-[color:var(--fg-muted)]">Yükleniyor…</p>}
        {open.length === 0 ? (
          <p className="mt-4 text-sm text-[color:var(--fg-muted)]">Şu an sana atanmış açık bir ödev yok.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {open.map((a) => (
              <li key={a.id} className="rounded-md border border-[color:var(--border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{a.title}</div>
                    <div className="text-xs text-[color:var(--fg-muted)]">
                      {teacherName(a.teacher_user_id)} · son: {a.due_date ?? "—"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-primary btn-sm" onClick={() => onMark(a.id, "done")}>Tamamladım</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => onMark(a.id, "dismissed")}>Yok say</button>
                  </div>
                </div>
                {a.description && <p className="mt-2 text-sm whitespace-pre-wrap">{a.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {archive.length > 0 && (
        <section className="surface mt-6 p-6">
          <h2 className="text-xl font-semibold">Geçmiş ({archive.length})</h2>
          <ul className="mt-4 grid gap-2">
            {archive.map((a) => (
              <li key={a.id} className="rounded-md border border-[color:var(--border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{a.title}</div>
                    <div className="text-xs text-[color:var(--fg-muted)]">
                      {teacherName(a.teacher_user_id)} · {fmtDate(a.completed_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`chip ${a.status === "done" ? "chip-success" : "chip-warning"}`}>
                      {a.status === "done" ? "Tamamlandı" : "Yok sayıldı"}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => onMark(a.id, "open")}>Geri aç</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
