"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import RoleGuard from "@/components/role-guard";
import {
  upsertExamPlanForStudent,
  listCloudExamPlansForTeacher,
  deleteCloudExamPlan,
  type CloudExamPlan,
} from "@/lib/cloud-exam-plan";
import type { CefrLevel } from "@/lib/exam-plan";
import {
  createAssignment,
  createInviteCode,
  deleteAssignment,
  deleteInviteCode,
  fetchStudentSnapshot,
  listAssignmentsForTeacher,
  listMyInviteCodes,
  listMyStudents,
  unlinkStudent,
  upsertMyProfile,
  type Assignment,
  type LinkedStudent,
  type TeacherInviteCode,
} from "@/lib/teacher-store";

type AuthState =
  | { state: "loading" }
  | { state: "anon" }
  | { state: "ready"; userId: string; email: string | null };

type SnapshotPeek = {
  studentId: string;
  displayName: string | null;
  updatedAt: string | null;
  metrics: { label: string; value: string }[];
} | null;

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("tr-TR"); } catch { return iso; }
}

function safeJson<T>(s: string | undefined | null): T | null {
  if (!s) return null;
  try { return JSON.parse(s) as T; } catch { return null; }
}

function deriveMetrics(payload: Record<string, string>): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  const keys = Object.keys(payload);

  // Wortschatz / SRS
  const wort = keys.find((k) => /wortschatz/i.test(k) && /state|store|srs/i.test(k));
  const wortObj = wort ? safeJson<Record<string, unknown>>(payload[wort]) : null;
  if (wortObj) {
    const cards = (wortObj as { cards?: unknown[] }).cards;
    if (Array.isArray(cards)) out.push({ label: "Wortschatz kart", value: String(cards.length) });
  }

  // Tagesziel
  const tag = keys.find((k) => /tagesziel/i.test(k));
  const tagObj = tag ? safeJson<Record<string, unknown>>(payload[tag]) : null;
  if (tagObj) {
    const streak = (tagObj as { streak?: number }).streak;
    if (typeof streak === "number") out.push({ label: "Streak", value: `${streak} gün` });
  }

  // Fehlerheft
  const feh = keys.find((k) => /fehlerheft/i.test(k));
  const fehObj = feh ? safeJson<{ entries?: unknown[] }>(payload[feh]) : null;
  if (fehObj?.entries && Array.isArray(fehObj.entries)) {
    out.push({ label: "Hata defteri", value: `${fehObj.entries.length} kayıt` });
  }

  // Generic: total stored keys
  out.push({ label: "Veri parçası", value: String(keys.length) });

  return out;
}

export default function TeacherDashboardPage() {
  return (
    <RoleGuard required="teacher">
      <TeacherDashboardInner />
    </RoleGuard>
  );
}

function TeacherDashboardInner() {
  const [auth, setAuth] = useState<AuthState>({ state: "loading" });
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [codes, setCodes] = useState<TeacherInviteCode[]>([]);
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [peek, setPeek] = useState<SnapshotPeek>(null);

  // Assignment form state
  const [aStudent, setAStudent] = useState("");
  const [aTitle, setATitle] = useState("");
  const [aDesc, setADesc] = useState("");
  const [aDue, setADue] = useState("");

  // Exam-plan form state
  const [examPlans, setExamPlans] = useState<CloudExamPlan[]>([]);
  const [pStudent, setPStudent] = useState("");
  const [pLevel, setPLevel] = useState<CefrLevel>("A2");
  const [pDate, setPDate] = useState("");
  const [pMinutes, setPMinutes] = useState(60);
  const [pNotes, setPNotes] = useState("");

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
      await upsertMyProfile({ role: "teacher" });
      const [c1, c2, c3, c4] = await Promise.all([
        listMyInviteCodes(),
        listMyStudents(),
        listAssignmentsForTeacher(),
        listCloudExamPlansForTeacher(),
      ]);
      setCodes(c1);
      setStudents(c2);
      setAssignments(c3);
      setExamPlans(c4);
      if (!aStudent && c2.length > 0) setAStudent(c2[0].student_user_id);
      if (!pStudent && c2.length > 0) setPStudent(c2[0].student_user_id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (auth.state === "ready") void refresh(); }, [auth.state]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onCreateCode() {
    setErr(null);
    try {
      await createInviteCode();
      setOkMsg("Yeni davet kodu oluşturuldu.");
      await refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }

  async function onRevokeCode(code: string) {
    if (!confirm(`${code} kodunu silmek istediğine emin misin?`)) return;
    try { await deleteInviteCode(code); await refresh(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }

  async function onUnlink(studentId: string) {
    if (!confirm("Bu öğrencinin bağlantısını kaldırmak istediğine emin misin?")) return;
    try { await unlinkStudent(studentId); await refresh(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }

  async function onCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!aStudent || !aTitle.trim()) { setErr("Öğrenci ve başlık zorunlu."); return; }
    try {
      await createAssignment({
        student_user_id: aStudent,
        title: aTitle.trim(),
        description: aDesc.trim() || undefined,
        due_date: aDue || undefined,
      });
      setATitle(""); setADesc(""); setADue("");
      setOkMsg("Ödev gönderildi.");
      await refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }

  async function onDeleteAssignment(id: string) {
    if (!confirm("Bu ödevi silmek istediğine emin misin?")) return;
    try { await deleteAssignment(id); await refresh(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }

  async function onPeek(s: LinkedStudent) {
    setErr(null);
    try {
      const snap = await fetchStudentSnapshot(s.student_user_id);
      if (!snap) {
        setPeek({
          studentId: s.student_user_id,
          displayName: s.display_name,
          updatedAt: null,
          metrics: [{ label: "Durum", value: "Henüz bulut verisi yok" }],
        });
        return;
      }
      setPeek({
        studentId: s.student_user_id,
        displayName: s.display_name,
        updatedAt: snap.updated_at,
        metrics: deriveMetrics(snap.payload),
      });
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }

  async function onSaveName() {
    if (!displayName.trim()) return;
    setSavingName(true);
    try {
      await upsertMyProfile({ display_name: displayName.trim(), role: "teacher" });
      setOkMsg("İsim kaydedildi.");
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setSavingName(false); }
  }

  const studentName = useMemo(() => {
    const map = new Map(students.map((s) => [s.student_user_id, s.display_name]));
    return (id: string) => map.get(id) ?? id.slice(0, 8);
  }, [students]);

  /* --------- Render --------- */

  if (auth.state === "loading") {
    return <main className="app-main app-container pt-12"><p>Yükleniyor…</p></main>;
  }

  if (auth.state === "anon") {
    return (
      <main className="app-main app-container pt-12">
        <div className="max-w-2xl">
          <span className="chip chip-warning">Öğretmen paneli</span>
          <h1 className="h-display mt-4 text-3xl md:text-5xl">Önce hesabına giriş yap.</h1>
          <p className="mt-3 text-base text-[color:var(--fg-muted)]">
            Öğretmen paneli bulut hesabını kullanır. Davet kodu ver, öğrencilerinin gelişimini izle, ödev ata.
          </p>
          <a href="/auth" className="btn btn-primary mt-6 inline-block">Giriş yap / kayıt ol</a>
        </div>
      </main>
    );
  }

  return (
    <main className="app-main app-container pt-8 md:pt-12">
      <div className="max-w-3xl">
        <span className="chip chip-success">Öğretmen paneli</span>
        <h1 className="h-display mt-4 text-3xl md:text-5xl">Sınıfını yönet, öğrencilerini izle.</h1>
        <p className="mt-3 text-base text-[color:var(--fg-muted)]">
          Davet kodu paylaş, öğrencilerinin bulut özetlerini gör, ödev ata.
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
          Öğrencilerin seni bu isimle görür. Boş bırakırsan e-posta gözükür.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={auth.email ?? "Öğretmen adın"}
            style={{ minWidth: 240 }}
          />
          <button className="btn btn-secondary" onClick={onSaveName} disabled={savingName || !displayName.trim()}>
            {savingName ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </section>

      <section className="surface mt-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Davet kodları</h2>
          <button className="btn btn-primary btn-sm" onClick={onCreateCode}>+ Yeni kod</button>
        </div>
        <p className="mt-1 text-sm text-[color:var(--fg-muted)]">
          Bir öğrencini eklemek için bu kodu paylaş. Öğrenci, /student sayfasından kodu girip sana bağlanır.
        </p>
        {codes.length === 0 ? (
          <p className="mt-4 text-sm text-[color:var(--fg-muted)]">Henüz davet kodun yok.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {codes.map((c) => (
              <li key={c.code} className="flex items-center justify-between rounded-md border border-[color:var(--border)] p-3">
                <div className="flex items-center gap-3">
                  <code className="text-lg font-bold tracking-widest">{c.code}</code>
                  <span className="text-xs text-[color:var(--fg-muted)]">{fmtDate(c.created_at)}</span>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(c.code).then(() => setOkMsg("Kopyalandı."))}>
                    Kopyala
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => onRevokeCode(c.code)}>Sil</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface mt-6 p-6">
        <h2 className="text-xl font-semibold">Öğrencilerim ({students.length})</h2>
        {loading && <p className="mt-2 text-sm text-[color:var(--fg-muted)]">Yükleniyor…</p>}
        {students.length === 0 ? (
          <p className="mt-4 text-sm text-[color:var(--fg-muted)]">Henüz bağlı öğrencin yok. Bir davet kodu paylaş.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {students.map((s) => (
              <li key={s.student_user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[color:var(--border)] p-3">
                <div>
                  <div className="font-semibold">{s.display_name ?? `Öğrenci ${s.student_user_id.slice(0, 6)}`}</div>
                  <div className="text-xs text-[color:var(--fg-muted)]">
                    Bağlandı: {fmtDate(s.linked_at)} · Son senkron: {fmtDate(s.snapshot_updated_at)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-secondary btn-sm" onClick={() => onPeek(s)}>Gelişimini gör</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => onUnlink(s.student_user_id)}>Bağlantıyı kes</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {peek && (
          <div className="mt-4 rounded-md border border-[color:var(--border)] p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{peek.displayName ?? "Öğrenci"} — özet</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setPeek(null)}>Kapat</button>
            </div>
            <p className="mt-1 text-xs text-[color:var(--fg-muted)]">Son senkron: {fmtDate(peek.updatedAt)}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {peek.metrics.map((m) => (
                <div key={m.label} className="rounded-md bg-[color:var(--bg-soft)] p-3">
                  <div className="text-xs uppercase text-[color:var(--fg-muted)]">{m.label}</div>
                  <div className="text-lg font-semibold">{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="surface mt-6 p-6">
        <h2 className="text-xl font-semibold">telc planı</h2>
        <p className="mt-1 text-sm text-[color:var(--fg-muted)]">
          Öğrencinin seviyesini ve sınav tarihini gir. Sistem her günün ne çalışması gerektiğini
          otomatik olarak hazırlar (her 7. gün tekrar, her 2 haftada bir mock prüfung).
        </p>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!pStudent || !pDate) { setErr("Öğrenci ve tarih zorunlu."); return; }
          try {
            await upsertExamPlanForStudent({
              student_user_id: pStudent,
              level: pLevel,
              exam_date: pDate,
              daily_minutes: Math.max(15, Math.min(240, pMinutes)),
              notes: pNotes.trim() || undefined,
            });
            setOkMsg("Plan kaydedildi. Öğrenci /heute sayfasından başlayabilir.");
            setPNotes("");
            await refresh();
          } catch (ex) { setErr(ex instanceof Error ? ex.message : String(ex)); }
        }} className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Öğrenci</span>
            <select className="input" value={pStudent} onChange={(e) => setPStudent(e.target.value)} disabled={students.length === 0}>
              {students.length === 0 && <option value="">— Önce öğrenci ekle —</option>}
              {students.map((s) => (
                <option key={s.student_user_id} value={s.student_user_id}>
                  {s.display_name ?? `Öğrenci ${s.student_user_id.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1">
              <span className="text-sm font-medium">Seviye</span>
              <select className="input" value={pLevel} onChange={(e) => setPLevel(e.target.value as CefrLevel)}>
                <option value="A1">telc A1</option>
                <option value="A2">telc A2</option>
                <option value="B1">telc B1</option>
                <option value="B2">telc B2</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Sınav tarihi</span>
              <input className="input" type="date" value={pDate} onChange={(e) => setPDate(e.target.value)} required />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Günlük dakika</span>
              <input className="input" type="number" min={15} max={240} value={pMinutes}
                onChange={(e) => setPMinutes(Number(e.target.value))} />
            </label>
          </div>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Not (opsiyonel)</span>
            <textarea className="input" value={pNotes} onChange={(e) => setPNotes(e.target.value)} rows={2}
              placeholder="ör. Schreiben'e özellikle çalışalım." />
          </label>
          <div>
            <button className="btn btn-primary" type="submit" disabled={students.length === 0}>Planı kaydet</button>
          </div>
        </form>

        {examPlans.length > 0 && (
          <ul className="mt-6 grid gap-2">
            {examPlans.map((p) => (
              <li key={p.id} className="rounded-md border border-[color:var(--border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">
                      {studentName(p.student_user_id)} · telc {p.level}
                    </div>
                    <div className="text-xs text-[color:var(--fg-muted)]">
                      Sınav: {p.exam_date} · {p.daily_minutes} dk/gün · güncellendi: {fmtDate(p.updated_at)}
                    </div>
                    {p.notes && <div className="text-xs mt-1">{p.notes}</div>}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={async () => {
                    if (!confirm("Planı silmek istediğine emin misin?")) return;
                    try { await deleteCloudExamPlan(p.id); await refresh(); }
                    catch (ex) { setErr(ex instanceof Error ? ex.message : String(ex)); }
                  }}>Sil</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface mt-6 p-6">
        <h2 className="text-xl font-semibold">Ödev ata</h2>
        <form onSubmit={onCreateAssignment} className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Öğrenci</span>
            <select className="input" value={aStudent} onChange={(e) => setAStudent(e.target.value)} disabled={students.length === 0}>
              {students.length === 0 && <option value="">— Önce öğrenci ekle —</option>}
              {students.map((s) => (
                <option key={s.student_user_id} value={s.student_user_id}>
                  {s.display_name ?? `Öğrenci ${s.student_user_id.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Başlık</span>
            <input className="input" value={aTitle} onChange={(e) => setATitle(e.target.value)} placeholder="ör. 30 yeni kelime" required />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Açıklama (opsiyonel)</span>
            <textarea className="input" value={aDesc} onChange={(e) => setADesc(e.target.value)} rows={2} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Son tarih (opsiyonel)</span>
            <input className="input" type="date" value={aDue} onChange={(e) => setADue(e.target.value)} />
          </label>
          <div>
            <button className="btn btn-primary" type="submit" disabled={students.length === 0}>Ödevi gönder</button>
          </div>
        </form>
      </section>

      <section className="surface mt-6 p-6">
        <h2 className="text-xl font-semibold">Verdiğin ödevler ({assignments.length})</h2>
        {assignments.length === 0 ? (
          <p className="mt-4 text-sm text-[color:var(--fg-muted)]">Henüz ödev vermedin.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {assignments.map((a) => (
              <li key={a.id} className="rounded-md border border-[color:var(--border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{a.title}</div>
                    <div className="text-xs text-[color:var(--fg-muted)]">
                      {studentName(a.student_user_id)} · {fmtDate(a.created_at)} · son: {a.due_date ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`chip ${a.status === "done" ? "chip-success" : a.status === "dismissed" ? "chip-warning" : ""}`}>
                      {a.status === "open" ? "Açık" : a.status === "done" ? "Tamamlandı" : "Yok sayıldı"}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => onDeleteAssignment(a.id)}>Sil</button>
                  </div>
                </div>
                {a.description && <p className="mt-2 text-sm">{a.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
