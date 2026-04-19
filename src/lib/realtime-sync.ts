const SYNC_EVENT_NAME = "letmequiz:sync";
const SYNC_PULSE_KEY = "letmequiz.sync.pulse";

type SyncDetail = {
  topic: string;
  at: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function safeParse(raw: string | null): SyncDetail | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SyncDetail;
    if (!parsed || typeof parsed.topic !== "string") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function emitRealtimeSync(topic: string) {
  if (!isBrowser()) {
    return;
  }

  const detail: SyncDetail = {
    topic,
    at: new Date().toISOString(),
  };

  window.dispatchEvent(new CustomEvent<SyncDetail>(SYNC_EVENT_NAME, { detail }));

  try {
    window.localStorage.setItem(SYNC_PULSE_KEY, JSON.stringify(detail));
  } catch {
    // Ignore localStorage write errors while still keeping in-tab sync.
  }
}

export function subscribeRealtimeSync(listener: (topic: string) => void): () => void {
  if (!isBrowser()) {
    return () => {
      // no-op
    };
  }

  const customHandler = (event: Event) => {
    const detail = (event as CustomEvent<SyncDetail>).detail;
    if (detail?.topic) {
      listener(detail.topic);
    }
  };

  const storageHandler = (event: StorageEvent) => {
    if (event.key !== SYNC_PULSE_KEY) {
      return;
    }

    const detail = safeParse(event.newValue);
    if (detail?.topic) {
      listener(detail.topic);
    }
  };

  window.addEventListener(SYNC_EVENT_NAME, customHandler as EventListener);
  window.addEventListener("storage", storageHandler);

  return () => {
    window.removeEventListener(SYNC_EVENT_NAME, customHandler as EventListener);
    window.removeEventListener("storage", storageHandler);
  };
}
