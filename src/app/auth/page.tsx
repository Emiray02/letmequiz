"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import {
  detectDeviceLabel,
  getSyncStatus,
  pullSnapshot,
  pushSnapshot,
  subscribeSyncStatus,
  type SyncStatus,
} from "@/lib/cloud-sync";
import {
  createProfile,
  getActiveProfile,
  listProfiles,
  setActiveProfile,
} from "@/lib/profile-store";

type Mode = "signin" | "signup";

/** After a cloud sign-in, make sure there is at least one local profile so
 *  the ProfileGate dismisses. If the cloud snapshot already restored profiles,
 *  this is a no-op. Otherwise we create a default student profile from the email. */
function ensureLocalProfileFromCloud(email: string | null) {
  if (typeof window === "undefined") return;
  const all = listProfiles();
  if (all.length === 0) {
    const name = (email?.split("@")[0] ?? "Ben").slice(0, 24);
    createProfile({ name, role: "student" }, true);
    return;
  }
  // If profiles exist but none active (e.g. snapshot restored profiles but
  // active key was empty), pick the first one as active.
  if (!getActiveProfile()) {
    setActiveProfile(all[0].id);
  }
}

function relTime(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s} sn önce`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.round(h / 24)} gün önce`;
}

function StatusPill({ s }: { s: SyncStatus }) {
  if (s.state === "off") return null;
  let bg = "rgba(34,197,94,0.12)";
  let fg = "#16a34a";
  let dot = "#22c55e";
  let label = "Senkronize";
  let pulse = false;
  if (s.state === "syncing") {
    bg = "rgba(59,130,246,0.12)";
    fg = "#2563eb";
    dot = "#3b82f6";
    label = s.direction === "pull" ? "Buluttan indiriliyor…" : "Buluta yükleniyor…";
    pulse = true;
  } else if (s.state === "error") {
    bg = "rgba(239,68,68,0.12)";
    fg = "#dc2626";
    dot = "#ef4444";
    label = "Sync hatası";
  } else if (s.state === "ok") {
    label = `Senkronize · ${relTime(s.at)}`;
  } else if (s.state === "idle") {
    label = "Bekleniyor";
    dot = "#94a3b8";
    fg = "#64748b";
    bg = "rgba(148,163,184,0.12)";
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "0.3rem 0.7rem",
        borderRadius: 999,
        background: bg,
        color: fg,
        fontSize: "0.78rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: dot,
          boxShadow: pulse ? `0 0 0 0 ${dot}` : "none",
          animation: pulse ? "lmq-pulse 1.4s ease-out infinite" : undefined,
        }}
      />
      {label}
    </span>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "info" | "error" | "ok"; text: string } | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>(() => getSyncStatus());
  const [, force] = useState(0);

  // Live sync status
  useEffect(() => subscribeSyncStatus(setStatus), []);
  // Re-render every 30s so "x sn önce" stays fresh
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setHasSession(false);
      return;
    }
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setHasSession(!!data.user);
      setUserEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setHasSession(!!session?.user);
      setUserEmail(session?.user?.email ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setMsg({ kind: "error", text: "Supabase yapılandırılmamış." });
      return;
    }
    if (!email.trim() || password.length < 6) {
      setMsg({ kind: "error", text: "Geçerli e-posta ve en az 6 karakter şifre gerekir." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) {
          setMsg({
            kind: "info",
            text: "✉️ Kayıt oluşturuldu. E-postandaki doğrulama bağlantısına tıkla, sonra giriş yap.",
          });
          setMode("signin");
        } else {
          ensureLocalProfileFromCloud(email.trim());
          await pushSnapshot({ deviceLabel: detectDeviceLabel() });
          setMsg({ kind: "ok", text: "Hesap açıldı. Cihazındaki ilerleme buluta yüklendi." });
          setTimeout(() => router.push("/"), 700);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        const { data: who } = await supabase.auth.getUser();
        const userEmailNow = who.user?.email ?? email.trim();
        const res = await pullSnapshot("replace");
        if (!res.ok) {
          setMsg({ kind: "error", text: `Giriş yapıldı ama veri çekilemedi: ${res.error}` });
        } else if (res.empty) {
          ensureLocalProfileFromCloud(userEmailNow);
          await pushSnapshot({ deviceLabel: detectDeviceLabel() });
          setMsg({ kind: "ok", text: "Giriş yapıldı. Bu cihaz başlangıç oldu." });
        } else {
          ensureLocalProfileFromCloud(userEmailNow);
          setMsg({ kind: "ok", text: `Giriş yapıldı. ${res.applied} öğe buluttan geldi.` });
        }
        setTimeout(() => {
          if (typeof window !== "undefined") window.location.href = "/";
        }, 800);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMsg({ kind: "error", text: message });
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    try {
      await supabase.auth.signOut();
      setUserEmail(null);
      setHasSession(false);
      setMsg({ kind: "ok", text: "Çıkış yapıldı. Cihazdaki yerel veri korundu." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <style>{`
        @keyframes lmq-pulse {
          0%   { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
          70%  { box-shadow: 0 0 0 6px transparent; opacity: 0.6; }
          100% { box-shadow: 0 0 0 0 transparent; opacity: 1; }
        }
        .auth-wrap{
          min-height: calc(100vh - 12rem);
          display: grid; place-items: center;
          padding: 2rem 1rem;
          position: relative;
          isolation: isolate;
        }
        .auth-wrap::before{
          content: "";
          position: absolute; inset: -10% -10% auto -10%; height: 60%;
          background:
            radial-gradient(50% 60% at 30% 30%, rgba(99,102,241,0.18), transparent 60%),
            radial-gradient(40% 50% at 75% 20%, rgba(236,72,153,0.14), transparent 60%),
            radial-gradient(40% 60% at 50% 80%, rgba(34,197,94,0.10), transparent 60%);
          z-index: -1;
          filter: blur(20px);
          pointer-events: none;
        }
        .auth-card{
          width: 100%; max-width: 440px;
          background: var(--surface, #fff);
          border: 1px solid var(--border, rgba(0,0,0,0.08));
          border-radius: 20px;
          padding: 2rem;
          box-shadow:
            0 1px 2px rgba(0,0,0,0.04),
            0 24px 60px -20px rgba(15,23,42,0.18);
        }
        .auth-brand{
          display:flex; align-items:center; gap:.6rem;
          margin-bottom: 1.4rem;
        }
        .auth-brand .mark{
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display:grid; place-items:center; color:#fff; font-weight:800;
          box-shadow: 0 6px 20px -6px rgba(99,102,241,0.6);
        }
        .auth-title{ font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; margin: 0; }
        .auth-sub{ font-size: 0.88rem; color: var(--fg-muted, #64748b); margin-top: 0.35rem; }
        .auth-tabs{
          display: grid; grid-template-columns: 1fr 1fr; gap: 4px;
          padding: 4px;
          background: var(--surface-muted, rgba(0,0,0,0.04));
          border-radius: 12px;
          margin: 1.4rem 0 1.2rem;
        }
        .auth-tab{
          padding: .55rem .8rem;
          border-radius: 8px;
          border: 0; background: transparent;
          font-size: .88rem; font-weight: 600;
          color: var(--fg-muted, #64748b);
          cursor: pointer;
          transition: all .15s ease;
        }
        .auth-tab.active{
          background: var(--surface, #fff);
          color: var(--fg, #0f172a);
          box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
        }
        .auth-field{ display:grid; gap:.35rem; margin-bottom: .9rem; }
        .auth-label{
          font-size: .78rem; font-weight: 600;
          color: var(--fg-muted, #64748b);
          text-transform: uppercase; letter-spacing: .04em;
        }
        .auth-input{
          width: 100%;
          padding: .7rem .9rem;
          border-radius: 10px;
          border: 1px solid var(--border, rgba(0,0,0,0.12));
          background: var(--surface, #fff);
          font-size: .95rem;
          transition: all .15s ease;
        }
        .auth-input:focus{
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .auth-submit{
          width: 100%;
          padding: .8rem 1rem;
          border-radius: 10px;
          border: 0;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          font-weight: 600; font-size: .95rem;
          cursor: pointer;
          margin-top: .4rem;
          box-shadow: 0 6px 20px -6px rgba(99,102,241,0.5);
          transition: transform .1s ease, box-shadow .15s ease;
        }
        .auth-submit:hover:not(:disabled){ transform: translateY(-1px); box-shadow: 0 10px 24px -8px rgba(99,102,241,0.6); }
        .auth-submit:disabled{ opacity: .65; cursor: not-allowed; }
        .auth-msg{
          margin-top: 1rem;
          padding: .7rem .85rem;
          border-radius: 10px;
          font-size: .85rem;
          line-height: 1.4;
        }
        .auth-msg.error{ background: rgba(239,68,68,.08); color: #b91c1c; border: 1px solid rgba(239,68,68,.2); }
        .auth-msg.ok{ background: rgba(34,197,94,.08); color: #15803d; border: 1px solid rgba(34,197,94,.2); }
        .auth-msg.info{ background: rgba(59,130,246,.08); color: #1d4ed8; border: 1px solid rgba(59,130,246,.2); }
        .auth-foot{
          margin-top: 1.2rem;
          padding-top: 1.2rem;
          border-top: 1px dashed var(--border, rgba(0,0,0,0.1));
          font-size: .78rem; color: var(--fg-muted, #64748b);
          line-height: 1.5;
        }
        .auth-foot strong{ color: var(--fg, #0f172a); font-weight:600; }
        .session-row{
          display:flex; align-items:center; gap:.8rem;
          padding: .9rem 1rem;
          background: var(--surface-muted, rgba(99,102,241,.06));
          border-radius: 12px;
          margin: 1rem 0;
        }
        .session-avatar{
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #ec4899);
          color: #fff; font-weight: 700;
          display: grid; place-items: center;
          flex-shrink: 0;
        }
        .session-meta{ display:grid; min-width: 0; flex: 1; }
        .session-email{
          font-weight: 600; font-size: .9rem;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .signout-btn{
          width: 100%;
          padding: .7rem 1rem;
          border-radius: 10px;
          border: 1px solid rgba(239,68,68,.25);
          background: transparent;
          color: #dc2626;
          font-weight: 600; font-size: .88rem;
          cursor: pointer;
          transition: all .15s ease;
        }
        .signout-btn:hover:not(:disabled){ background: rgba(239,68,68,.08); }
      `}</style>

      <div className="auth-card">
        <div className="auth-brand">
          <div className="mark">L</div>
          <div>
            <h1 className="auth-title">
              {hasSession ? "Hesabın aktif" : mode === "signin" ? "Tekrar hoş geldin" : "Hesap aç"}
            </h1>
            <p className="auth-sub">
              {hasSession
                ? "Tüm değişiklikler otomatik olarak buluta yüklenir."
                : "Tek hesapla telefon + bilgisayar otomatik eşitlenir."}
            </p>
          </div>
        </div>

        {hasSession ? (
          <>
            <div className="session-row">
              <div className="session-avatar" aria-hidden>
                {(userEmail?.[0] ?? "?").toUpperCase()}
              </div>
              <div className="session-meta">
                <span className="session-email">{userEmail}</span>
                <span style={{ marginTop: 4 }}>
                  <StatusPill s={status} />
                </span>
              </div>
            </div>

            <button type="button" className="signout-btn" onClick={signOut} disabled={busy}>
              Çıkış yap
            </button>

            <div className="auth-foot">
              <strong>Otomatik sync nasıl çalışır?</strong>
              <br />
              Wortschatz, Fehlerheft, Tagesziel, profiller ve istatistikler — herhangi bir
              değişiklikten sonra ~3 saniye içinde buluta yüklenir. Diğer cihazından giriş
              yaparken son hâli otomatik iner. Çıkış yapsan da bu cihazdaki veri silinmez.
            </div>
          </>
        ) : (
          <>
            <div className="auth-tabs" role="tablist">
              <button
                type="button" role="tab"
                aria-selected={mode === "signin"}
                className={`auth-tab ${mode === "signin" ? "active" : ""}`}
                onClick={() => { setMode("signin"); setMsg(null); }}
              >
                Giriş yap
              </button>
              <button
                type="button" role="tab"
                aria-selected={mode === "signup"}
                className={`auth-tab ${mode === "signup" ? "active" : ""}`}
                onClick={() => { setMode("signup"); setMsg(null); }}
              >
                Hesap aç
              </button>
            </div>

            <form onSubmit={submit} noValidate>
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-email">E-posta</label>
                <input
                  id="auth-email"
                  className="auth-input"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@mail.com"
                />
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-pw">Şifre</label>
                <input
                  id="auth-pw"
                  className="auth-input"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                />
              </div>
              <button type="submit" className="auth-submit" disabled={busy}>
                {busy ? "Bekle…" : mode === "signin" ? "Giriş yap" : "Hesabı oluştur"}
              </button>
            </form>

            <div className="auth-foot">
              {mode === "signin"
                ? <>Henüz hesabın yok mu? Yukarıdan <strong>Hesap aç</strong>&apos;a geç.</>
                : <>Hesap olmadan da kullanmaya devam edebilirsin — veriler bu cihazda kalır.</>
              }
            </div>
          </>
        )}

        {msg ? (
          <div className={`auth-msg ${msg.kind}`}>{msg.text}</div>
        ) : null}
      </div>
    </div>
  );
}
