import { emitRealtimeSync } from "@/lib/realtime-sync";

export type AnalyticsEventName =
  | "study-session"
  | "quiz-finished"
  | "writing-attempt"
  | "task-completed"
  | "speaking-attempt"
  | "live-class-response"
  | "sync-merge"
  | "exam-warning"
  | "placement-complete"
  | "set-imported"
  | "set-exported";

export type AnalyticsEvent = {
  id: string;
  name: AnalyticsEventName;
  at: string;
  value?: number;
  metadata?: Record<string, string | number | boolean>;
};

export type AnalyticsSummary = {
  totalEvents: number;
  activeDays: number;
  byName: Array<{ name: AnalyticsEventName; count: number }>;
  last14Days: Array<{ date: string; events: number }>;
};

const ANALYTICS_KEY = "letmequiz.analytics.events";

function isBrowser() {
  return typeof window !== "undefined";
}

function safeRead<T>(key: string, fallback: T): T {
  if (!isBrowser()) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore localStorage write errors.
  }
  emitRealtimeSync("analytics");
}

function getEventsInternal(): AnalyticsEvent[] {
  return safeRead<AnalyticsEvent[]>(ANALYTICS_KEY, [])
    .filter((item) => Boolean(item?.id && item?.name && item?.at))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 1500);
}

function saveEvents(events: AnalyticsEvent[]) {
  safeWrite(ANALYTICS_KEY, events.slice(0, 1500));
}

export function trackAnalyticsEvent(input: {
  name: AnalyticsEventName;
  value?: number;
  metadata?: Record<string, string | number | boolean>;
}) {
  const next: AnalyticsEvent = {
    id: crypto.randomUUID(),
    name: input.name,
    at: new Date().toISOString(),
    value: typeof input.value === "number" ? Math.round(input.value) : undefined,
    metadata: input.metadata,
  };

  saveEvents([next, ...getEventsInternal()]);
}

export function getRecentAnalyticsEvents(limit = 40): AnalyticsEvent[] {
  return getEventsInternal().slice(0, limit);
}

export function getAnalyticsSummary(days = 30): AnalyticsSummary {
  const now = Date.now();
  const thresholdMs = now - days * 86_400_000;
  const scoped = getEventsInternal().filter((item) => new Date(item.at).getTime() >= thresholdMs);

  const byNameMap = new Map<AnalyticsEventName, number>();
  const byDayMap = new Map<string, number>();

  for (const event of scoped) {
    byNameMap.set(event.name, (byNameMap.get(event.name) ?? 0) + 1);
    const day = event.at.slice(0, 10);
    byDayMap.set(day, (byDayMap.get(day) ?? 0) + 1);
  }

  const byName = [...byNameMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const last14Days: Array<{ date: string; events: number }> = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const day = new Date(now - offset * 86_400_000).toISOString().slice(0, 10);
    last14Days.push({
      date: day,
      events: byDayMap.get(day) ?? 0,
    });
  }

  return {
    totalEvents: scoped.length,
    activeDays: byDayMap.size,
    byName,
    last14Days,
  };
}
