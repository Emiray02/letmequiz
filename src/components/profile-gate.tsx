"use client";

/**
 * Cloud-only auth gate.
 * The app is gated by a Supabase session; no "pick a local profile" UI.
 * After successful sign-in/sign-up we silently:
 *   - pull the cloud snapshot (which restores letmequiz.profiles.*),
 *   - or create a default local profile from the email if cloud is empty,
 *   - then push the snapshot so the next device sees it.
 */

import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import {
  detectDeviceLabel,
  pullSnapshot,
  pushSnapshot,
} from "@/lib/cloud-sync";
import {
  createProfile,
  getActiveProfile,
  listProfiles,
  setActiveProfile,
} from "@/lib/profile-store";

type Mode = "signin" | "signup";
type AuthState = "loading" | "anon" | "ready";

function ensureLocalProfile(email: string | null) {
  if (typeof window === "undefined") return;
  const all = listProfiles();
  if (all.length === 0) {
    const name = (email?.split("@")[0] ?? "Ben").slice(0, 24);
    createProfile({ name, role: "student" }, true);
    return;
  }
  if (!getActiveProfile()) setActiveProfile(all[0].id);
}

export default function ProfileGate({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [supaConfigured, setSupaConfigured] = useState(true);

  useEffect(() => {
    const c = getBrowserSupabaseClient();
    if (!c) { setSupaConfigured(false); setAuthState("ready"); return; }
    let cancelled = false;
    c.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setAuthState(data.user ? "ready" : "anon");
    });
    const { data: sub } = c.auth.onAuthStateChange((_e, session) => {
      setAuthState(session?.user ? "ready" : "anon");
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  if (authState === "loading") {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", color: "#64748b" }}>
        Yükleniyor…
      </div>
    );
  }

  if (!supaConfigured) {
    // Supabase env eksikse uygulama yine de açılsın.
    return <>{children}</>;
  }

  if (authState === "anon") {
    return <AuthScreen />;
  }

  return <>{children}</>;
}

function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "info" | "error" | "ok"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getBrowserSupabaseClient();
    if (!supabase) { setMsg({ kind: "error", text: "Supabase yapılandırılmamış." }); return; }
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
          ensureLocalProfile(email.trim());
          await pushSnapshot({ deviceLabel: detectDeviceLabel() });
          setMsg({ kind: "ok", text: "Hesap açıldı." });
          setTimeout(() => { window.location.reload(); }, 600);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        const { data: who } = await supabase.auth.getUser();
        const userEmailNow = who.user?.email ?? email.trim();
        const res = await pullSnapshot("replace");
        if (!res.ok) {
          setMsg({ kind: "error", text: `Giriş yapıldı ama veri çekilemedi: ${res.error}` });
        } else {
          ensureLocalProfile(userEmailNow);
          if (res.empty) await pushSnapshot({ deviceLabel: detectDeviceLabel() });
          setMsg({ kind: "ok", text: res.empty ? "Giriş yapıldı." : `Giriş yapıldı. ${res.applied} öğe buluttan geldi.` });
          setTimeout(() => { window.location.reload(); }, 600);
        }
      }
    } catch (err) {
      setMsg({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lmq-auth-wrap">
      <style>{`
        .lmq-auth-wrap{
          min-height: 100vh; display:grid; place-items:center;
          padding: 2rem 1rem;
          background:
            radial-gradient(50% 60% at 30% 25%, rgba(99,102,241,0.15), transparent 60%),
            radial-gradient(40% 50% at 75% 20%, rgba(236,72,153,0.12), transparent 60%),
            radial-gradient(40% 60% at 50% 85%, rgba(34,197,94,0.10), transparent 60%);
        }
        .lmq-auth-card{
          width:100%; max-width:440px;
          background: var(--surface, #fff);
          border: 1px solid var(--border, rgba(0,0,0,0.08));
          border-radius: 20px; padding: 2rem;
          box-shadow: 0 24px 60px -20px rgba(15,23,42,0.18);
        }
        .lmq-auth-brand{ display:flex; align-items:center; gap:.6rem; margin-bottom:1.4rem; }
        .lmq-auth-brand .mark{
          width:36px; height:36px; border-radius:10px;
          background: linear-gradient(135deg,#6366f1,#8b5cf6);
          display:grid; place-items:center; color:#fff; font-weight:800;
          box-shadow: 0 6px 20px -6px rgba(99,102,241,0.6);
        }
        .lmq-auth-title{ font-size:1.5rem; font-weight:700; letter-spacing:-0.02em; margin:0; }
        .lmq-auth-sub{ font-size:.88rem; color: var(--fg-muted, #64748b); margin-top:.35rem; }
        .lmq-auth-tabs{
          display:grid; grid-template-columns:1fr 1fr; gap:4px;
          padding:4px; background: var(--surface-muted, rgba(0,0,0,0.04));
          border-radius:12px; margin: 1.4rem 0 1.2rem;
        }
        .lmq-auth-tab{
          padding:.55rem .8rem; border-radius:8px; border:0; background:transparent;
          font-size:.88rem; font-weight:600; color: var(--fg-muted, #64748b); cursor:pointer;
          transition: all .15s ease;
        }
        .lmq-auth-tab.active{
          background: var(--surface, #fff); color: var(--fg, #0f172a);
          box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
        }
        .lmq-auth-field{ display:grid; gap:.35rem; margin-bottom:.9rem; }
        .lmq-auth-label{
          font-size:.78rem; font-weight:600; color: var(--fg-muted, #64748b);
          text-transform:uppercase; letter-spacing:.04em;
        }
        .lmq-auth-input{
          width:100%; padding:.7rem .9rem; border-radius:10px;
          border:1px solid var(--border, rgba(0,0,0,0.12));
          background: var(--surface, #fff); font-size:.95rem;
          transition: all .15s ease;
        }
        .lmq-auth-input:focus{ outline:none; border-color:#6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        .lmq-auth-submit{
          width:100%; padding:.8rem 1rem; border-radius:10px; border:0;
          background: linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
          font-weight:600; font-size:.95rem; cursor:pointer; margin-top:.4rem;
          box-shadow: 0 6px 20px -6px rgba(99,102,241,0.5);
          transition: transform .1s ease, box-shadow .15s ease;
        }
        .lmq-auth-submit:hover:not(:disabled){ transform: translateY(-1px); box-shadow: 0 10px 24px -8px rgba(99,102,241,0.6); }
        .lmq-auth-submit:disabled{ opacity:.65; cursor:not-allowed; }
        .lmq-auth-msg{ margin-top:1rem; padding:.7rem .85rem; border-radius:10px; font-size:.85rem; line-height:1.4; }
        .lmq-auth-msg.error{ background: rgba(239,68,68,.08); color:#b91c1c; border:1px solid rgba(239,68,68,.2); }
        .lmq-auth-msg.ok{ background: rgba(34,197,94,.08); color:#15803d; border:1px solid rgba(34,197,94,.2); }
        .lmq-auth-msg.info{ background: rgba(59,130,246,.08); color:#1d4ed8; border:1px solid rgba(59,130,246,.2); }
        .lmq-auth-foot{
          margin-top:1.2rem; padding-top:1.2rem;
          border-top:1px dashed var(--border, rgba(0,0,0,0.1));
          font-size:.78rem; color: var(--fg-muted, #64748b); line-height:1.5;
        }
      `}</style>
      <div className="lmq-auth-card">
        <div className="lmq-auth-brand">
          <div className="mark">L</div>
          <div>
            <h1 className="lmq-auth-title">
              {mode === "signin" ? "Tekrar hoş geldin" : "Hesap aç"}
            </h1>
            <p className="lmq-auth-sub">
              Tek hesapla telefon + bilgisayar otomatik eşitlenir.
            </p>
          </div>
        </div>

        <div className="lmq-auth-tabs" role="tablist">
          <button
            type="button" role="tab"
            aria-selected={mode === "signin"}
            className={`lmq-auth-tab ${mode === "signin" ? "active" : ""}`}
            onClick={() => { setMode("signin"); setMsg(null); }}
          >
            Giriş yap
          </button>
          <button
            type="button" role="tab"
            aria-selected={mode === "signup"}
            className={`lmq-auth-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => { setMode("signup"); setMsg(null); }}
          >
            Kayıt ol
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="lmq-auth-field">
            <label className="lmq-auth-label" htmlFor="lmq-email">E-posta</label>
            <input
              id="lmq-email" type="email" className="lmq-auth-input"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@mail.com" autoComplete="email" required
            />
          </div>
          <div className="lmq-auth-field">
            <label className="lmq-auth-label" htmlFor="lmq-pass">Şifre</label>
            <input
              id="lmq-pass" type="password" className="lmq-auth-input"
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 6 karakter" minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
            />
          </div>
          <button type="submit" className="lmq-auth-submit" disabled={busy}>
            {busy ? "Bekleyin…" : mode === "signin" ? "Giriş yap" : "Hesap oluştur"}
          </button>
        </form>

        {msg && <div className={`lmq-auth-msg ${msg.kind}`}>{msg.text}</div>}

        <div className="lmq-auth-foot">
          Tüm verilerin (Wortschatz, Fehlerheft, Tagesziel, ödevler, istatistikler) bulutta saklanır.
          Hangi cihazdan girersen, son hâli senin olur.
        </div>
      </div>
    </div>
  );
}
