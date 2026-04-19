import { emitRealtimeSync } from "@/lib/realtime-sync";

export type LiveSessionOption = {
  id: string;
  text: string;
};

export type LiveSessionResponse = {
  id: string;
  sessionId: string;
  participantName: string;
  optionId: string;
  createdAt: string;
};

export type LiveClassSession = {
  id: string;
  classCode: string;
  hostName: string;
  prompt: string;
  options: LiveSessionOption[];
  correctOptionId?: string;
  durationSec: number;
  createdAt: string;
  status: "live" | "closed";
  responses: LiveSessionResponse[];
};

const LIVE_SESSIONS_KEY = "letmequiz.classroom.live-sessions";

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
    // Ignore write failures.
  }
  emitRealtimeSync("class-live");
}

function getAllSessions(): LiveClassSession[] {
  return safeRead<LiveClassSession[]>(LIVE_SESSIONS_KEY, [])
    .filter((item) => Boolean(item?.id && item?.classCode && item?.prompt))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 80);
}

function saveAllSessions(sessions: LiveClassSession[]) {
  safeWrite(LIVE_SESSIONS_KEY, sessions.slice(0, 80));
}

export function getLiveSessions(classCode: string): LiveClassSession[] {
  const normalized = classCode.trim().toUpperCase();
  if (!normalized) {
    return [];
  }

  return getAllSessions().filter((item) => item.classCode === normalized);
}

export function getActiveLiveSession(classCode: string): LiveClassSession | null {
  return getLiveSessions(classCode).find((item) => item.status === "live") ?? null;
}

export function createLiveSession(input: {
  classCode: string;
  hostName: string;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctIndex?: number;
  durationSec?: number;
}): LiveClassSession | null {
  const classCode = input.classCode.trim().toUpperCase();
  const prompt = input.prompt.trim();
  const hostName = input.hostName.trim() || "Teacher";
  if (!classCode || !prompt) {
    return null;
  }

  const optionsRaw = [input.optionA, input.optionB, input.optionC, input.optionD].map((item) =>
    item.trim()
  );
  if (optionsRaw.some((item) => !item)) {
    return null;
  }

  const options = optionsRaw.map((text, index) => ({
    id: `opt-${index + 1}`,
    text,
  }));
  const correctOptionId =
    typeof input.correctIndex === "number" && input.correctIndex >= 0 && input.correctIndex < options.length
      ? options[input.correctIndex].id
      : undefined;

  const existing = getAllSessions().map((session) =>
    session.classCode === classCode && session.status === "live"
      ? { ...session, status: "closed" as const }
      : session
  );

  const next: LiveClassSession = {
    id: crypto.randomUUID(),
    classCode,
    hostName,
    prompt,
    options,
    correctOptionId,
    durationSec: Math.max(15, Math.min(300, Math.round(input.durationSec ?? 60))),
    createdAt: new Date().toISOString(),
    status: "live",
    responses: [],
  };

  saveAllSessions([next, ...existing]);
  return next;
}

export function closeLiveSession(sessionId: string): LiveClassSession | null {
  let closed: LiveClassSession | null = null;
  const next = getAllSessions().map((session) => {
    if (session.id !== sessionId) {
      return session;
    }
    closed = {
      ...session,
      status: "closed",
    };
    return closed;
  });

  saveAllSessions(next);
  return closed;
}

export function submitLiveResponse(input: {
  sessionId: string;
  participantName: string;
  optionId: string;
}): LiveClassSession | null {
  const participantName = input.participantName.trim() || "Student";
  let updated: LiveClassSession | null = null;

  const next = getAllSessions().map((session) => {
    if (session.id !== input.sessionId || session.status !== "live") {
      return session;
    }

    const already = session.responses.find(
      (item) => item.participantName.toLocaleLowerCase("tr-TR") === participantName.toLocaleLowerCase("tr-TR")
    );

    if (already) {
      updated = {
        ...session,
        responses: session.responses.map((item) =>
          item.id === already.id
            ? {
                ...item,
                optionId: input.optionId,
                createdAt: new Date().toISOString(),
              }
            : item
        ),
      };
      return updated;
    }

    const response: LiveSessionResponse = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      participantName,
      optionId: input.optionId,
      createdAt: new Date().toISOString(),
    };

    updated = {
      ...session,
      responses: [response, ...session.responses],
    };
    return updated;
  });

  saveAllSessions(next);
  return updated;
}

export function getLiveSessionStats(session: LiveClassSession | null) {
  if (!session) {
    return {
      responseCount: 0,
      accuracy: 0,
      byOption: {} as Record<string, number>,
    };
  }

  const byOption: Record<string, number> = {};
  for (const option of session.options) {
    byOption[option.id] = 0;
  }

  for (const response of session.responses) {
    byOption[response.optionId] = (byOption[response.optionId] ?? 0) + 1;
  }

  const responseCount = session.responses.length;
  const correctCount = session.correctOptionId
    ? session.responses.filter((item) => item.optionId === session.correctOptionId).length
    : 0;

  return {
    responseCount,
    accuracy: responseCount > 0 ? Math.round((correctCount / responseCount) * 100) : 0,
    byOption,
  };
}
