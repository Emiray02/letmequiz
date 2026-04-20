"use client";

import { getBrowserSupabaseClient } from "./supabase-browser";

const KEY_PREFIXES = ["lmq.", "letmequiz."] as const;
const CHANGE_EVENT = "lmq:storage-changed";

export type SyncPayload = Record<string, string>;

export type SyncStatus =
  | { state: "off" }
  | { state: "idle" }
  | { state: "syncing"; direction: "push" | "pull" }
  | { state: "ok"; at: number }
  | { state: "error"; message: string; at: number };

let currentStatus: SyncStatus = { state: "off" };
const statusListeners = new Set<(s: SyncStatus) => void>();

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

export function setSyncStatus(s: SyncStatus) {
  currentStatus = s;
  statusListeners.forEach((cb) => {
    try { cb(s); } catch { /* noop */ }
  });
}

export function subscribeSyncStatus(cb: (s: SyncStatus) => void): () => void {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}

function isBrowser() {
  return typeof window !== "undefined";
}

function isSyncableKey(k: string): boolean {
  return KEY_PREFIXES.some((p) => k.startsWith(p));
}

/** Walk localStorage and collect all sync-eligible entries. */
export function collectLocalPayload(): SyncPayload {
  if (!isBrowser()) return {};
  const out: SyncPayload = {};
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const k = window.localStorage.key(i);
    if (!k || !isSyncableKey(k)) continue;
    const v = window.localStorage.getItem(k);
    if (v != null) out[k] = v;
  }
  return out;
}

/**
 * Apply a cloud payload to localStorage.
 *  - mode "replace": wipe local sync keys first, then write payload (cloud wins fully).
 *  - mode "merge":   only write keys that are missing locally (local wins on conflict).
 */
export function applyCloudPayload(
  payload: SyncPayload,
  mode: "replace" | "merge" = "replace",
): number {
  if (!isBrowser()) return 0;
  if (mode === "replace") {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && isSyncableKey(k)) toRemove.push(k);
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));
  }
  let n = 0;
  for (const [k, v] of Object.entries(payload)) {
    if (!isSyncableKey(k) || typeof v !== "string") continue;
    if (mode === "merge" && window.localStorage.getItem(k) != null) continue;
    window.localStorage.setItem(k, v);
    n += 1;
  }
  return n;
}

/** Manually emit a "storage changed" event to trigger a debounced cloud push. */
export function notifyStorageChanged() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Subscribe to storage-change events (cross-tab + in-tab). */
export function subscribeStorageChanged(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Get the current authenticated user, or null if anonymous / supabase disabled. */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function pushSnapshot(opts?: { deviceLabel?: string }): Promise<{ ok: boolean; error?: string; updatedAt?: string }> {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase yapılandırılmamış." };
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Önce giriş yap." };

  const payload = collectLocalPayload();
  const { data, error } = await supabase
    .from("user_study_snapshots")
    .upsert(
      {
        user_id: userId,
        payload,
        device_label: opts?.deviceLabel ?? null,
      },
      { onConflict: "user_id" },
    )
    .select("updated_at")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, updatedAt: data?.updated_at };
}

export async function pullSnapshot(
  mode: "replace" | "merge" = "replace",
): Promise<{ ok: boolean; error?: string; applied?: number; updatedAt?: string; empty?: boolean }> {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase yapılandırılmamış." };
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Önce giriş yap." };

  const { data, error } = await supabase
    .from("user_study_snapshots")
    .select("payload, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: true, applied: 0, empty: true };

  const payload = (data.payload ?? {}) as SyncPayload;
  const applied = applyCloudPayload(payload, mode);
  return { ok: true, applied, updatedAt: data.updated_at };
}

/** Detect a guess at this device for the snapshot label. */
export function detectDeviceLabel(): string {
  if (!isBrowser()) return "server";
  const ua = window.navigator.userAgent || "";
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  const platform = isMobile ? "Mobil" : "Masaüstü";
  let browser = "Tarayıcı";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";
  return `${platform} · ${browser}`;
}
