"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import {
  pullCloudSnapshotToLocal,
  pushLocalSnapshotToCloud,
} from "@/lib/user-sync";

export default function AccountSyncPanel() {
  const [email, setEmail] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function onSendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setMessage("Supabase config missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    if (!email.trim()) {
      setMessage("Please provide an email address.");
      return;
    }

    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage(error.message || "Failed to send login link.");
    } else {
      setMessage("Magic link sent. Open your email and continue.");
    }
    setBusy(false);
  }

  async function onSignOut() {
    if (!supabase) {
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    setMessage(error ? error.message : "Signed out.");
  }

  async function onPushCloud() {
    setBusy(true);
    setMessage("");

    try {
      const result = await pushLocalSnapshotToCloud();
      setMessage(`Local progress uploaded to cloud (${result.uploadedKeys} keys).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cloud upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onPullCloud() {
    setBusy(true);
    setMessage("");

    try {
      const result = await pullCloudSnapshotToLocal({
        mode: "merge",
        preference: "newest",
      });

      const conflictNote =
        result.conflictKeys.length > 0
          ? ` Conflicts resolved: ${result.conflictKeys.length}.`
          : " No conflicts detected.";

      setMessage(
        `Cloud sync completed (${result.mode}). Applied ${result.writtenKeys}/${result.totalKeys} keys.${conflictNote} Refresh pages to see changes.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cloud download failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.9)] backdrop-blur md:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">Account + Sync</p>
      <h3 className="mt-2 font-display text-3xl text-slate-900">Connect your account and sync progress</h3>

      {!supabase ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Supabase auth is not configured in this environment.
        </p>
      ) : null}

      {supabase && !session ? (
        <form onSubmit={onSendMagicLink} className="mt-4 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-cyan-500 focus:ring"
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {busy ? "Sending..." : "Connect Account (Magic Link)"}
          </button>
        </form>
      ) : null}

      {supabase && session && user ? (
        <div className="mt-4 space-y-3">
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Connected as {user.email ?? "user"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onPushCloud}
              disabled={busy}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Upload Local To Cloud
            </button>
            <button
              type="button"
              onClick={onPullCloud}
              disabled={busy}
              className="rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Download Cloud To Local
            </button>
            <button
              type="button"
              onClick={onSignOut}
              disabled={busy}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Sign Out
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {message}
        </p>
      ) : null}
    </section>
  );
}
