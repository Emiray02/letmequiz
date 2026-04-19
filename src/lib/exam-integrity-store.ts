import { emitRealtimeSync } from "@/lib/realtime-sync";

export type ExamIntegrityEventType =
  | "tab-hidden"
  | "window-blur"
  | "copy-attempt"
  | "paste-attempt"
  | "context-menu"
  | "fullscreen-exit";

export type ExamIntegrityEvent = {
  type: ExamIntegrityEventType;
  at: string;
};

export type ExamIntegritySession = {
  id: string;
  setId: string;
  startedAt: string;
  endedAt?: string;
  events: ExamIntegrityEvent[];
};

const EXAM_INTEGRITY_SESSIONS_KEY = "letmequiz.exam.integrity.sessions";
const EXAM_INTEGRITY_ACTIVE_KEY = "letmequiz.exam.integrity.active";

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
    // Ignore localStorage failures.
  }
  emitRealtimeSync("exam-integrity");
}

function getSessions(): ExamIntegritySession[] {
  return safeRead<ExamIntegritySession[]>(EXAM_INTEGRITY_SESSIONS_KEY, [])
    .filter((item) => Boolean(item?.id && item?.setId && item?.startedAt))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 120);
}

function saveSessions(sessions: ExamIntegritySession[]) {
  safeWrite(EXAM_INTEGRITY_SESSIONS_KEY, sessions.slice(0, 120));
}

function getActiveSessionId(): string {
  return safeRead<string>(EXAM_INTEGRITY_ACTIVE_KEY, "");
}

function setActiveSessionId(sessionId: string) {
  safeWrite(EXAM_INTEGRITY_ACTIVE_KEY, sessionId);
}

export function startExamIntegritySession(setId: string): ExamIntegritySession {
  const next: ExamIntegritySession = {
    id: crypto.randomUUID(),
    setId,
    startedAt: new Date().toISOString(),
    events: [],
  };

  saveSessions([next, ...getSessions()]);
  setActiveSessionId(next.id);
  return next;
}

export function recordExamIntegrityEvent(type: ExamIntegrityEventType) {
  const activeId = getActiveSessionId();
  if (!activeId) {
    return;
  }

  const next = getSessions().map((session) => {
    if (session.id !== activeId || session.endedAt) {
      return session;
    }

    return {
      ...session,
      events: [
        {
          type,
          at: new Date().toISOString(),
        },
        ...session.events,
      ].slice(0, 300),
    };
  });
  saveSessions(next);
}

export function endExamIntegritySession(): ExamIntegritySession | null {
  const activeId = getActiveSessionId();
  if (!activeId) {
    return null;
  }

  let ended: ExamIntegritySession | null = null;
  const next = getSessions().map((session) => {
    if (session.id !== activeId || session.endedAt) {
      return session;
    }

    ended = {
      ...session,
      endedAt: new Date().toISOString(),
    };
    return ended;
  });

  saveSessions(next);
  setActiveSessionId("");
  return ended;
}

export function getLatestExamIntegritySummary(setId: string) {
  const session = getSessions().find((item) => item.setId === setId) ?? null;
  if (!session) {
    return {
      session,
      warningCount: 0,
      riskScore: 0,
      byType: {} as Record<ExamIntegrityEventType, number>,
    };
  }

  const byType = {} as Record<ExamIntegrityEventType, number>;
  for (const event of session.events) {
    byType[event.type] = (byType[event.type] ?? 0) + 1;
  }

  const warningCount = session.events.length;
  const riskScore = Math.max(0, Math.min(100, warningCount * 12));

  return {
    session,
    warningCount,
    riskScore,
    byType,
  };
}
