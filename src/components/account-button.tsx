"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import { getSyncStatus, subscribeSyncStatus, type SyncStatus } from "@/lib/cloud-sync";

/**
 * Compact cloud-account button for the app shell.
 * - No supabase env → renders nothing.
 * - Signed-out → "☁ Hesap aç" link to /auth.
 * - Signed-in → email + live sync dot, links to /auth.
 */
export default function AccountButton() {
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<SyncStatus>(() => getSyncStatus());

  useEffect(() => subscribeSyncStatus(setStatus), []);

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
        className="account-btn account-btn--cta"
        title="Giriş yap → cihazlar arası sync"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M17.5 19a4.5 4.5 0 1 0 0-9 6 6 0 0 0-11.5 2A4 4 0 0 0 7 19h10.5z"/>
        </svg>
        <span className="hidden sm:inline">Hesap aç</span>
      </Link>
    );
  }

  // dot color
  let dot = "#22c55e"; // ok
  let pulse = false;
  let title = `Giriş: ${email}`;
  if (status.state === "syncing") { dot = "#3b82f6"; pulse = true; title = "Senkronize ediliyor…"; }
  else if (status.state === "error") { dot = "#ef4444"; title = "Sync hatası — tıkla"; }
  else if (status.state === "off") { dot = "#94a3b8"; }

  const short = email.length > 20 ? email.slice(0, 18) + "…" : email;
  return (
    <>
      <Link href="/auth" className="account-btn account-btn--user" title={title}>
        <span className="account-dot" style={{ background: dot }} data-pulse={pulse ? "1" : "0"} aria-hidden />
        <span className="hidden sm:inline">{short}</span>
      </Link>
      <style jsx global>{`
        .account-btn{
          display:inline-flex; align-items:center; gap:.45rem;
          padding:.4rem .7rem;
          border-radius: 10px;
          font-size: .8rem; font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
          transition: all .15s ease;
        }
        .account-btn--cta{
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          box-shadow: 0 4px 12px -4px rgba(99,102,241,0.5);
        }
        .account-btn--cta:hover{ transform: translateY(-1px); box-shadow: 0 6px 16px -4px rgba(99,102,241,0.6); }
        .account-btn--user{
          background: var(--surface-muted, rgba(0,0,0,0.05));
          color: var(--fg, #0f172a);
          border: 1px solid var(--border, rgba(0,0,0,0.08));
        }
        .account-btn--user:hover{ background: var(--surface, #fff); border-color: rgba(99,102,241,.3); }
        .account-dot{
          width: 8px; height: 8px; border-radius: 50%;
          flex-shrink: 0;
        }
        .account-dot[data-pulse="1"]{
          animation: account-dot-pulse 1.4s ease-out infinite;
        }
        @keyframes account-dot-pulse{
          0%   { box-shadow: 0 0 0 0 currentColor; opacity:1; }
          70%  { box-shadow: 0 0 0 5px transparent; opacity:.5; }
          100% { box-shadow: 0 0 0 0 transparent; opacity:1; }
        }
      `}</style>
    </>
  );
}
