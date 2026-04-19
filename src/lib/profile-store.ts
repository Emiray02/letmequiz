"use client";

/**
 * Lightweight profile system stored in localStorage.
 * Allows multiple users (student / parent / teacher) to share the same device,
 * each with their own scoped progress data.
 */

export type ProfileRole = "student" | "parent" | "teacher";

export type Profile = {
  id: string;
  name: string;
  role: ProfileRole;
  avatar: string;
  level?: string;
  goal?: string;
  createdAt: string;
};

const PROFILES_KEY = "letmequiz.profiles.v1";
const ACTIVE_KEY = "letmequiz.profiles.active";
const CHANGE_EVENT = "lmq:profile-changed";

function isBrowser() {
  return typeof window !== "undefined";
}

function safeRead<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

export function listProfiles(): Profile[] {
  return safeRead<Profile[]>(PROFILES_KEY, []);
}

export function getActiveProfileId(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function getActiveProfile(): Profile | null {
  const id = getActiveProfileId();
  if (!id) return null;
  return listProfiles().find((p) => p.id === id) ?? null;
}

function emitChange() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeProfile(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(CHANGE_EVENT, cb);
  // Storage event fires across tabs.
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function setActiveProfile(id: string | null) {
  if (!isBrowser()) return;
  try {
    if (id) window.localStorage.setItem(ACTIVE_KEY, id);
    else window.localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
  emitChange();
}

function genId() {
  return `prof_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export type CreateProfileInput = {
  name: string;
  role: ProfileRole;
  avatar?: string;
  level?: string;
  goal?: string;
};

const DEFAULT_AVATARS: Record<ProfileRole, string> = {
  student: "🎓",
  parent: "👨‍👩‍👧",
  teacher: "🧑‍🏫",
};

export function createProfile(input: CreateProfileInput, makeActive = true): Profile {
  const profile: Profile = {
    id: genId(),
    name: input.name.trim() || "Misafir",
    role: input.role,
    avatar: input.avatar || DEFAULT_AVATARS[input.role],
    level: input.level,
    goal: input.goal,
    createdAt: new Date().toISOString(),
  };
  const all = listProfiles();
  all.push(profile);
  safeWrite(PROFILES_KEY, all);
  if (makeActive) setActiveProfile(profile.id);
  else emitChange();
  return profile;
}

export function updateProfile(id: string, patch: Partial<Omit<Profile, "id" | "createdAt">>) {
  const all = listProfiles().map((p) => (p.id === id ? { ...p, ...patch } : p));
  safeWrite(PROFILES_KEY, all);
  emitChange();
}

export function deleteProfile(id: string) {
  const all = listProfiles().filter((p) => p.id !== id);
  safeWrite(PROFILES_KEY, all);
  if (getActiveProfileId() === id) setActiveProfile(null);
  // Wipe scoped storage for that profile.
  if (isBrowser()) {
    try {
      const prefix = `lmq.profile:${id}::`;
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) toRemove.push(k);
      }
      toRemove.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }
  emitChange();
}

/**
 * Returns a localStorage key that is scoped to the currently active profile.
 * If no active profile, returns a "guest" key so existing code keeps working.
 */
export function profileScopedKey(baseKey: string): string {
  const id = getActiveProfileId() ?? "guest";
  return `lmq.profile:${id}::${baseKey}`;
}
