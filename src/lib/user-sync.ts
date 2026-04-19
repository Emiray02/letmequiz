import { trackAnalyticsEvent } from "@/lib/analytics-store";
import { emitRealtimeSync } from "@/lib/realtime-sync";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

const SYNC_PREFIX = "letmequiz.";
const TIMESTAMP_KEYS = [
  "updatedAt",
  "updated_at",
  "lastUpdatedAt",
  "last_updated_at",
  "createdAt",
  "created_at",
  "at",
  "date",
];
const MAX_MERGED_ITEMS = 1500;

type SyncPayload = Record<string, string>;

export type SyncMergePreference = "local" | "cloud" | "newest";
export type SyncPullMode = "replace" | "merge";

export type PullCloudSnapshotOptions = {
  mode?: SyncPullMode;
  preference?: SyncMergePreference;
};

export type SyncPushResult = {
  uploadedKeys: number;
};

export type SyncPullResult = {
  mode: SyncPullMode;
  preference: SyncMergePreference;
  totalKeys: number;
  writtenKeys: number;
  keptLocal: number;
  keptCloud: number;
  mergedKeys: number;
  conflictKeys: string[];
};

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("Sync is only available in browser.");
  }
}

function collectLocalPayload(): SyncPayload {
  ensureBrowser();

  const payload: SyncPayload = {};
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(SYNC_PREFIX)) {
      continue;
    }

    const value = window.localStorage.getItem(key);
    if (typeof value === "string") {
      payload[key] = value;
    }
  }

  return payload;
}

function restoreLocalPayload(payload: SyncPayload, clearExisting = false) {
  ensureBrowser();

  if (clearExisting) {
    const keysToRemove: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith(SYNC_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  }

  for (const [key, value] of Object.entries(payload)) {
    if (!key.startsWith(SYNC_PREFIX)) {
      continue;
    }
    window.localStorage.setItem(key, value);
  }

  emitRealtimeSync("student");
  emitRealtimeSync("analytics");
  emitRealtimeSync("sync");
}

function normalizeTimestampValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 10_000_000_000) {
      return value;
    }
    if (value > 1_000_000_000) {
      return value * 1000;
    }
    return 0;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getTimestampFromUnknown(value: unknown, depth = 0): number {
  if (depth > 3 || value == null) {
    return 0;
  }

  const primitiveTimestamp = normalizeTimestampValue(value);
  if (primitiveTimestamp > 0) {
    return primitiveTimestamp;
  }

  if (Array.isArray(value)) {
    let max = 0;
    for (const item of value.slice(0, 300)) {
      max = Math.max(max, getTimestampFromUnknown(item, depth + 1));
    }
    return max;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    let max = 0;

    for (const key of TIMESTAMP_KEYS) {
      max = Math.max(max, normalizeTimestampValue(record[key]));
    }

    if (max > 0) {
      return max;
    }

    for (const nested of Object.values(record)) {
      max = Math.max(max, getTimestampFromUnknown(nested, depth + 1));
    }

    return max;
  }

  return 0;
}

function parsePayloadJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function getPayloadValueTimestamp(raw: string): number {
  const parsed = parsePayloadJson(raw);
  if (parsed == null) {
    return 0;
  }
  return getTimestampFromUnknown(parsed);
}

function getArrayItemIdentity(item: unknown): string {
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    if (typeof record.id === "string" && record.id) {
      return `id:${record.id}`;
    }
    if (typeof record.cardId === "string" && typeof record.createdAt === "string") {
      return `card:${record.cardId}:${record.createdAt}`;
    }
  }

  try {
    return JSON.stringify(item);
  } catch {
    return String(item);
  }
}

function tryMergeStructuredValues(localValue: string, cloudValue: string): string | null {
  const localParsed = parsePayloadJson(localValue);
  const cloudParsed = parsePayloadJson(cloudValue);

  if (localParsed == null || cloudParsed == null) {
    return null;
  }

  if (Array.isArray(localParsed) && Array.isArray(cloudParsed)) {
    const combined = [...localParsed, ...cloudParsed];
    const deduped: unknown[] = [];
    const seen = new Set<string>();

    for (const item of combined) {
      const identity = getArrayItemIdentity(item);
      if (seen.has(identity)) {
        continue;
      }
      seen.add(identity);
      deduped.push(item);
    }

    deduped.sort((a, b) => getTimestampFromUnknown(b) - getTimestampFromUnknown(a));

    try {
      return JSON.stringify(deduped.slice(0, MAX_MERGED_ITEMS));
    } catch {
      return null;
    }
  }

  if (
    typeof localParsed === "object" &&
    !Array.isArray(localParsed) &&
    typeof cloudParsed === "object" &&
    !Array.isArray(cloudParsed)
  ) {
    try {
      return JSON.stringify({
        ...(cloudParsed as Record<string, unknown>),
        ...(localParsed as Record<string, unknown>),
      });
    } catch {
      return null;
    }
  }

  return null;
}

function mergePayload(
  localPayload: SyncPayload,
  cloudPayload: SyncPayload,
  preference: SyncMergePreference
): SyncPullResult & { payload: SyncPayload } {
  const keys = new Set([...Object.keys(localPayload), ...Object.keys(cloudPayload)]);
  const payload: SyncPayload = {};

  let keptLocal = 0;
  let keptCloud = 0;
  let mergedKeys = 0;
  let writtenKeys = 0;
  const conflictKeys: string[] = [];

  for (const key of keys) {
    const localValue = localPayload[key];
    const cloudValue = cloudPayload[key];

    if (typeof localValue !== "string" && typeof cloudValue === "string") {
      payload[key] = cloudValue;
      keptCloud += 1;
      writtenKeys += 1;
      continue;
    }

    if (typeof cloudValue !== "string" && typeof localValue === "string") {
      payload[key] = localValue;
      keptLocal += 1;
      writtenKeys += 1;
      continue;
    }

    if (typeof localValue !== "string" || typeof cloudValue !== "string") {
      continue;
    }

    if (localValue === cloudValue) {
      payload[key] = localValue;
      mergedKeys += 1;
      writtenKeys += 1;
      continue;
    }

    conflictKeys.push(key);

    if (preference === "local") {
      payload[key] = localValue;
      keptLocal += 1;
      writtenKeys += 1;
      continue;
    }

    if (preference === "cloud") {
      payload[key] = cloudValue;
      keptCloud += 1;
      writtenKeys += 1;
      continue;
    }

    const merged = tryMergeStructuredValues(localValue, cloudValue);
    if (merged != null) {
      payload[key] = merged;
      mergedKeys += 1;
      writtenKeys += 1;
      continue;
    }

    const localTimestamp = getPayloadValueTimestamp(localValue);
    const cloudTimestamp = getPayloadValueTimestamp(cloudValue);

    if (localTimestamp >= cloudTimestamp) {
      payload[key] = localValue;
      keptLocal += 1;
    } else {
      payload[key] = cloudValue;
      keptCloud += 1;
    }

    writtenKeys += 1;
  }

  return {
    payload,
    mode: "merge",
    preference,
    totalKeys: keys.size,
    writtenKeys,
    keptLocal,
    keptCloud,
    mergedKeys,
    conflictKeys: conflictKeys.slice(0, 10),
  };
}

async function getAuthenticatedUserId(): Promise<string> {
  const client = getBrowserSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user?.id) {
    throw new Error("Please sign in first.");
  }

  return user.id;
}

export async function pushLocalSnapshotToCloud(): Promise<SyncPushResult> {
  const client = getBrowserSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const userId = await getAuthenticatedUserId();
  const payload = collectLocalPayload();

  const { error } = await client.from("user_study_snapshots").upsert({
    user_id: userId,
    payload,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message || "Cloud upload failed.");
  }

  return {
    uploadedKeys: Object.keys(payload).length,
  };
}

export async function pullCloudSnapshotToLocal(
  options: PullCloudSnapshotOptions = {}
): Promise<SyncPullResult> {
  const client = getBrowserSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const userId = await getAuthenticatedUserId();
  const { data, error } = await client
    .from("user_study_snapshots")
    .select("payload")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Cloud download failed.");
  }

  if (!data?.payload || typeof data.payload !== "object") {
    throw new Error("No cloud snapshot found for this account.");
  }

  const cloudPayload = data.payload as SyncPayload;
  const mode = options.mode ?? "merge";
  const preference = options.preference ?? "newest";

  if (mode === "replace") {
    restoreLocalPayload(cloudPayload, true);
    trackAnalyticsEvent({
      name: "sync-merge",
      metadata: {
        mode,
        preference,
        totalKeys: Object.keys(cloudPayload).length,
        writtenKeys: Object.keys(cloudPayload).length,
        keptCloud: Object.keys(cloudPayload).length,
        keptLocal: 0,
        mergedKeys: 0,
        conflicts: 0,
      },
    });

    return {
      mode,
      preference,
      totalKeys: Object.keys(cloudPayload).length,
      writtenKeys: Object.keys(cloudPayload).length,
      keptLocal: 0,
      keptCloud: Object.keys(cloudPayload).length,
      mergedKeys: 0,
      conflictKeys: [],
    };
  }

  const localPayload = collectLocalPayload();
  const merged = mergePayload(localPayload, cloudPayload, preference);

  restoreLocalPayload(merged.payload);

  const { error: upsertError } = await client.from("user_study_snapshots").upsert({
    user_id: userId,
    payload: merged.payload,
    updated_at: new Date().toISOString(),
  });

  if (upsertError) {
    throw new Error(upsertError.message || "Cloud merge save failed.");
  }

  trackAnalyticsEvent({
    name: "sync-merge",
    value: merged.conflictKeys.length,
    metadata: {
      mode,
      preference,
      totalKeys: merged.totalKeys,
      writtenKeys: merged.writtenKeys,
      keptLocal: merged.keptLocal,
      keptCloud: merged.keptCloud,
      mergedKeys: merged.mergedKeys,
      conflicts: merged.conflictKeys.length,
    },
  });

  return merged;
}
