"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import { pullSnapshot, pushSnapshot, detectDeviceLabel } from "@/lib/cloud-sync";

type Mode = "signin" | "signup";

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
      setMsg({ kind: "error", text: "Supabase yapılandırılmamış. Yöneticiden NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY ekletin." });
      return;
    }
    if (!email.trim() || password.length < 6) {
      setMsg({ kind: "error", text: "Geçerli bir e-posta ve en az 6 karakterlik şifre gerekir." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        // Many Supabase projects require email confirmation; if the session is null after signUp,
        // tell the user to confirm. If session exists, we proceed to push current local data.
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) {
          setMsg({
            kind: "info",
            text: "✉️ Kayıt başarılı. E-postanı kontrol et ve doğrulama bağlantısına tıkla. Sonra burada giriş yap.",
          });
          setMode("signin");
        } else {
          // Brand new account → push whatever is already on this device as the seed.
          await pushSnapshot({ deviceLabel: detectDeviceLabel() });
          setMsg({ kind: "ok", text: "✓ Hesap açıldı ve cihazındaki ilerleme buluta yüklendi." });
          setTimeout(() => router.push("/"), 800);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        // Pull cloud snapshot and replace local data so this device matches the cloud.
        const res = await pullSnapshot("replace");
        if (!res.ok) {
          setMsg({ kind: "error", text: `Giriş yapıldı ama veri çekilemedi: ${res.error}` });
        } else if (res.empty) {
          // Cloud is empty for this user → push current device as seed.
          await pushSnapshot({ deviceLabel: detectDeviceLabel() });
          setMsg({ kind: "ok", text: "✓ Giriş yapıldı. Buluttaki veri boştu, bu cihaz başlangıç oldu." });
        } else {
          setMsg({ kind: "ok", text: `✓ Giriş yapıldı. ${res.applied} öğe buluttan yüklendi. Sayfa yenileniyor…` });
        }
        setTimeout(() => {
          router.push("/");
          router.refresh();
          if (typeof window !== "undefined") window.location.reload();
        }, 900);
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
      setMsg({ kind: "ok", text: "Çıkış yapıldı. Cihazdaki yerel veri korundu." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <section>
        <p className="eyebrow">Hesap</p>
        <h1 className="h-display text-2xl">
          {hasSession
            ? "Giriş yapıldı"
            : mode === "signin"
              ? "Tekrar hoş geldin"
              : "Hesap aç ve cihazlar arası sync"}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
          {hasSession
            ? "Telefonun ve bilgisayarın aynı hesapta olduğu sürece tüm Wortschatz, hata defteri, profiller ve istatistikler otomatik senkronize olur."
            : "E-posta + şifre ile hesap aç. Tüm ilerlemen (Wortschatz, Fehlerheft, Tagesziel, profiller, istatistikler) güvenli şekilde Supabase&apos;de saklanır ve giriş yaptığın her cihaza iner."}
        </p>

        <div className="surface mt-5 p-5">
          {hasSession ? (
            <div className="grid gap-3">
              <div>
                <p className="eyebrow">Aktif oturum</p>
                <p className="font-semibold mt-1">{userEmail}</p>
              </div>
              <hr className="divider" />
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={async () => {
                  setBusy(true); setMsg(null);
                  const r = await pullSnapshot("replace");
                  setBusy(false);
                  setMsg(r.ok
                    ? { kind: "ok", text: r.empty ? "Bulutta veri yok." : `✓ ${r.applied} öğe buluttan indirildi. Sayfayı yenile.` }
                    : { kind: "error", text: r.error ?? "Bilinmeyen hata" });
                }}>Buluttan indir</button>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={async () => {
                  setBusy(true); setMsg(null);
                  const r = await pushSnapshot({ deviceLabel: detectDeviceLabel() });
                  setBusy(false);
                  setMsg(r.ok
                    ? { kind: "ok", text: "✓ Bu cihaz buluta yüklendi." }
                    : { kind: "error", text: r.error ?? "Bilinmeyen hata" });
                }}>Buluta yükle</button>
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={signOut} style={{ marginLeft: "auto", color: "var(--danger, #c33)" }}>
                  Çıkış yap
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-3">
              <div className="flex gap-2">
                <button type="button" className={`btn ${mode === "signin" ? "btn-primary" : "btn-secondary"}`} onClick={() => setMode("signin")}>Giriş yap</button>
                <button type="button" className={`btn ${mode === "signup" ? "btn-primary" : "btn-secondary"}`} onClick={() => setMode("signup")}>Hesap aç</button>
              </div>
              <label className="grid gap-1 text-sm">
                <span>E-posta</span>
                <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@mail.com" />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Şifre</span>
                <input className="input" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="En az 6 karakter" />
              </label>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Bekle…" : mode === "signin" ? "Giriş yap" : "Hesap aç"}
              </button>
            </form>
          )}

          {msg ? (
            <div
              className="surface-muted mt-4 p-3 text-sm"
              style={{
                color:
                  msg.kind === "error"
                    ? "var(--danger, #c33)"
                    : msg.kind === "ok"
                      ? "var(--success, #2a8)"
                      : undefined,
              }}
            >
              {msg.text}
            </div>
          ) : null}
        </div>
      </section>

      <aside className="surface p-5 h-fit">
        <p className="eyebrow">Nasıl çalışır?</p>
        <ul className="mt-2 grid gap-2 text-sm text-[color:var(--fg-muted)]">
          <li>• Hesap olmadan da uygulama çalışır, veriler bu cihazda durur.</li>
          <li>• Giriş yapınca telefonundaki ilerleme bilgisayarına iner ve tersi.</li>
          <li>• Her değişiklikten ~3 sn sonra otomatik buluta yüklenir.</li>
          <li>• Çıkış yaptığında cihazdaki yerel veri silinmez.</li>
        </ul>
        <hr className="divider" />
        <Link href="/data" className="btn btn-secondary btn-block">JSON yedek al/içe aktar</Link>
      </aside>
    </div>
  );
}
