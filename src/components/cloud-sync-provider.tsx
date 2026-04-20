"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import {
  detectDeviceLabel,
  pullSnapshot,
  pushSnapshot,
  subscribeStorageChanged,
} from "@/lib/cloud-sync";

const PUSH_DEBOUNCE_MS = 3000;
const PATCH_FLAG = "__lmq_storage_patched__";

/**
 * Monkey-patch localStorage.setItem / removeItem once so same-tab writes also fire
 * a "lmq:storage-changed" event. Native "storage" only fires across tabs.
 */
function ensureStoragePatched() {
  if (typeof window === "undefined") return;
  const w = window as unknown as Record<string, unknown>;
  if (w[PATCH_FLAG]) return;
  w[PATCH_FLAG] = true;

  const proto = Storage.prototype;
  const origSet = proto.setItem;
  const origRem = proto.removeItem;
  const origClr = proto.clear;
  const fire = () => {
    try { window.dispatchEvent(new Event("lmq:storage-changed")); } catch { /* noop */ }
  };
  proto.setItem = function (k: string, v: string) {
    origSet.call(this, k, v);
    if (this === window.localStorage) fire();
  };
  proto.removeItem = function (k: string) {
    origRem.call(this, k);
    if (this === window.localStorage) fire();
  };
  proto.clear = function () {
    origClr.call(this);
    if (this === window.localStorage) fire();
  };
}

type Status =
  | { state: "off" }                 // no supabase or no session
  | { state: "idle" }
  | { state: "syncing"; dir: "push" | "pull" }
  | { state: "ok"; at: number }
  | { state: "error"; msg: string };

/**
 * Mounts under app-shell; runs background cloud sync when a Supabase session exists.
 * No UI by default. (AccountButton can read the same supabase session for display.)
 */
export default function CloudSyncProvider() {
  const [, setStatus] = useState<Status>({ state: "off" });
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialPullDone = useRef(false);

  useEffect(() => {
    ensureStoragePatched();
    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      setStatus({ state: "off" });
      return;
    }

    let active = true;

    async function doInitialPullIfSignedIn() {
      const { data } = await supabase!.auth.getUser();
      if (!active) return;
      if (!data.user) {
        setStatus({ state: "off" });
        return;
      }
      if (initialPullDone.current) return;
      initialPullDone.current = true;
      setStatus({ state: "syncing", dir: "pull" });
      const r = await pullSnapshot("replace");
      if (!active) return;
      if (r.ok) setStatus({ state: "ok", at: Date.now() });
      else setStatus({ state: "error", msg: r.error ?? "" });
    }

    doInitialPullIfSignedIn();

    const { data: sub } = supabase.auth.onAuthStateChange(async (evt) => {
      if (!active) return;
      if (evt === "SIGNED_OUT") {
        initialPullDone.current = false;
        setStatus({ state: "off" });
        return;
      }
      if (evt === "SIGNED_IN" || evt === "TOKEN_REFRESHED") {
        // SIGNED_IN happens after the /auth page already pulled — make this a no-op to
        // avoid wiping the local writes the auth flow may have just made.
        if (!initialPullDone.current) {
          initialPullDone.current = true;
          setStatus({ state: "syncing", dir: "pull" });
          const r = await pullSnapshot("replace");
          if (!active) return;
          if (r.ok) setStatus({ state: "ok", at: Date.now() });
          else setStatus({ state: "error", msg: r.error ?? "" });
        }
      }
    });

    function schedulePush() {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(async () => {
        const { data } = await supabase!.auth.getUser();
        if (!active || !data.user) return;
        setStatus({ state: "syncing", dir: "push" });
        const r = await pushSnapshot({ deviceLabel: detectDeviceLabel() });
        if (!active) return;
        if (r.ok) setStatus({ state: "ok", at: Date.now() });
        else setStatus({ state: "error", msg: r.error ?? "" });
      }, PUSH_DEBOUNCE_MS);
    }

    const unsubStorage = subscribeStorageChanged(schedulePush);

    return () => {
      active = false;
      if (pushTimer.current) clearTimeout(pushTimer.current);
      sub.subscription.unsubscribe();
      unsubStorage();
    };
  }, []);

  return null;
}
