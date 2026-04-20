"use client";

import { useEffect, useRef } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import {
  detectDeviceLabel,
  pullSnapshot,
  pushSnapshot,
  setSyncStatus,
  subscribeStorageChanged,
} from "@/lib/cloud-sync";

const PUSH_DEBOUNCE_MS = 3000;
const PATCH_FLAG = "__lmq_storage_patched__";

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

/** Background cloud sync. Renders nothing. Status broadcast via subscribeSyncStatus. */
export default function CloudSyncProvider() {
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialPullDone = useRef(false);

  useEffect(() => {
    ensureStoragePatched();
    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      setSyncStatus({ state: "off" });
      return;
    }

    let active = true;

    async function doInitialPullIfSignedIn() {
      const { data } = await supabase!.auth.getUser();
      if (!active) return;
      if (!data.user) {
        setSyncStatus({ state: "off" });
        return;
      }
      if (initialPullDone.current) return;
      initialPullDone.current = true;
      setSyncStatus({ state: "syncing", direction: "pull" });
      const r = await pullSnapshot("replace");
      if (!active) return;
      if (r.ok) setSyncStatus({ state: "ok", at: Date.now() });
      else setSyncStatus({ state: "error", message: r.error ?? "", at: Date.now() });
    }

    doInitialPullIfSignedIn();

    const { data: sub } = supabase.auth.onAuthStateChange(async (evt) => {
      if (!active) return;
      if (evt === "SIGNED_OUT") {
        initialPullDone.current = false;
        setSyncStatus({ state: "off" });
        return;
      }
      if (evt === "SIGNED_IN" || evt === "TOKEN_REFRESHED") {
        if (!initialPullDone.current) {
          initialPullDone.current = true;
          setSyncStatus({ state: "syncing", direction: "pull" });
          const r = await pullSnapshot("replace");
          if (!active) return;
          if (r.ok) setSyncStatus({ state: "ok", at: Date.now() });
          else setSyncStatus({ state: "error", message: r.error ?? "", at: Date.now() });
        }
      }
    });

    function schedulePush() {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(async () => {
        const { data } = await supabase!.auth.getUser();
        if (!active || !data.user) return;
        setSyncStatus({ state: "syncing", direction: "push" });
        const r = await pushSnapshot({ deviceLabel: detectDeviceLabel() });
        if (!active) return;
        if (r.ok) setSyncStatus({ state: "ok", at: Date.now() });
        else setSyncStatus({ state: "error", message: r.error ?? "", at: Date.now() });
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
