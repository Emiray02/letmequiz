"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

/**
 * Compact cloud-account button rendered next to the local ProfileMenu in the shell.
 * - When supabase env is missing → renders nothing.
 * - When signed-out → "☁ Hesap aç" link to /auth.
 * - When signed-in → "☁ <email>" link to /auth (where you can sign out + manual sync).
 */
export default function AccountButton() {
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      setReady(true);
      return;
    }
    setEnabled(true);
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setEmail(data.user?.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setEmail(sess?.user?.email ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!ready || !enabled) return null;

  if (!email) {
    return (
      <Link
        href="/auth"
        className="btn btn-secondary"
        style={{ padding: "0.4rem 0.7rem", fontSize: "0.8rem", whiteSpace: "nowrap" }}
        title="Giriş yap → cihazlar arası sync"
      >
        <span aria-hidden>☁</span>
        <span className="hidden sm:inline" style={{ marginLeft: 6 }}>Hesap aç</span>
      </Link>
    );
  }

  const short = email.length > 18 ? email.slice(0, 16) + "…" : email;
  return (
    <Link
      href="/auth"
      className="btn btn-ghost"
      style={{ padding: "0.4rem 0.7rem", fontSize: "0.8rem", whiteSpace: "nowrap" }}
      title={`Giriş yapıldı: ${email}`}
    >
      <span aria-hidden>☁</span>
      <span className="hidden sm:inline" style={{ marginLeft: 6 }}>{short}</span>
    </Link>
  );
}
