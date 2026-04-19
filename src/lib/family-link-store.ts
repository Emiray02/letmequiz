import type {
  FamilyAccessState,
  FamilyLink,
  FamilyProfile,
  FamilyRole,
} from "@/types/family";
import { emitRealtimeSync } from "@/lib/realtime-sync";

const PROFILE_KEY = "letmequiz.family.profile";
const LINKS_KEY = "letmequiz.family.links";
const ACTIVE_LINK_ID_KEY = "letmequiz.family.active-link-id";

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
    // Ignore localStorage quota errors.
  }

  emitRealtimeSync("family-link");
}

function nowIso(): string {
  return new Date().toISOString();
}

function generateLinkCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function defaultProfile(): FamilyProfile {
  const now = nowIso();
  return {
    id: crypto.randomUUID(),
    role: "student",
    displayName: "Learner",
    createdAt: now,
    updatedAt: now,
  };
}

export function getOrCreateFamilyProfile(): FamilyProfile {
  const existing = safeRead<FamilyProfile | null>(PROFILE_KEY, null);
  if (existing && existing.id && (existing.role === "student" || existing.role === "parent")) {
    return existing;
  }

  const created = defaultProfile();
  safeWrite(PROFILE_KEY, created);
  return created;
}

export function updateFamilyProfile(patch: Partial<Pick<FamilyProfile, "displayName" | "role">>): FamilyProfile {
  const current = getOrCreateFamilyProfile();
  const next: FamilyProfile = {
    ...current,
    displayName: patch.displayName?.trim() || current.displayName,
    role: patch.role ?? current.role,
    updatedAt: nowIso(),
  };

  safeWrite(PROFILE_KEY, next);
  return next;
}

export function setFamilyRole(role: FamilyRole): FamilyProfile {
  return updateFamilyProfile({ role });
}

export function getFamilyLinks(): FamilyLink[] {
  return safeRead<FamilyLink[]>(LINKS_KEY, [])
    .filter((item) => Boolean(item.id && item.code && item.parentProfileId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function saveFamilyLinks(links: FamilyLink[]) {
  safeWrite(LINKS_KEY, links.slice(0, 60));
}

function setActiveLinkId(linkId: string) {
  safeWrite(ACTIVE_LINK_ID_KEY, linkId);
}

function getActiveLinkId(): string {
  return safeRead<string>(ACTIVE_LINK_ID_KEY, "");
}

export function createParentInviteCode(parentDisplayName?: string): FamilyLink {
  const parent = updateFamilyProfile({
    role: "parent",
    displayName: parentDisplayName?.trim() || "Parent",
  });

  const next: FamilyLink = {
    id: crypto.randomUUID(),
    code: generateLinkCode(),
    status: "pending",
    parentProfileId: parent.id,
    createdAt: nowIso(),
  };

  const all = [next, ...getFamilyLinks()];
  saveFamilyLinks(all);
  setActiveLinkId(next.id);
  return next;
}

export function connectStudentWithCode(code: string, studentDisplayName?: string): FamilyLink | null {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }

  const student = updateFamilyProfile({
    role: "student",
    displayName: studentDisplayName?.trim() || "Student",
  });

  const links = getFamilyLinks();
  const matched = links.find((item) => item.code === normalizedCode);
  if (!matched) {
    return null;
  }

  const linked: FamilyLink = {
    ...matched,
    status: "linked",
    studentProfileId: student.id,
    linkedAt: nowIso(),
  };

  const nextLinks = links.map((item) => (item.id === matched.id ? linked : item));

  saveFamilyLinks(nextLinks);
  setActiveLinkId(linked.id);
  return linked;
}

export function disconnectActiveFamilyLink(): FamilyLink[] {
  const profile = getOrCreateFamilyProfile();
  const active = getActiveFamilyLink(profile.id);
  if (!active) {
    return getFamilyLinks();
  }

  const links = getFamilyLinks().map((item) => {
    if (item.id !== active.id) {
      return item;
    }

    if (profile.role === "parent") {
      return {
        ...item,
        status: "pending" as const,
        studentProfileId: undefined,
        linkedAt: undefined,
      };
    }

    return {
      ...item,
      status: "pending" as const,
      studentProfileId: undefined,
      linkedAt: undefined,
    };
  });

  saveFamilyLinks(links);
  safeWrite(ACTIVE_LINK_ID_KEY, "");
  return getFamilyLinks();
}

export function getActiveFamilyLink(profileId?: string): FamilyLink | null {
  const actor = profileId ?? getOrCreateFamilyProfile().id;
  const links = getFamilyLinks();

  const activeId = getActiveLinkId();
  if (activeId) {
    const active = links.find((item) => item.id === activeId) ?? null;
    if (
      active &&
      (active.parentProfileId === actor || active.studentProfileId === actor)
    ) {
      return active;
    }
  }

  return (
    links.find(
      (item) => item.parentProfileId === actor || item.studentProfileId === actor
    ) ?? null
  );
}

export function getFamilyScopeKey(): string {
  const profile = getOrCreateFamilyProfile();
  const active = getActiveFamilyLink(profile.id);
  if (!active || active.status !== "linked") {
    return "default";
  }

  return active.id;
}

export function getFamilyAccessState(): FamilyAccessState {
  const profile = getOrCreateFamilyProfile();
  const activeLink = getActiveFamilyLink(profile.id);

  const canParentMonitor =
    profile.role === "parent" &&
    activeLink?.status === "linked" &&
    activeLink.parentProfileId === profile.id;

  const canStudentReceive =
    profile.role === "student" &&
    activeLink?.status === "linked" &&
    activeLink.studentProfileId === profile.id;

  return {
    profile,
    activeLink,
    canParentMonitor: Boolean(canParentMonitor),
    canStudentReceive: Boolean(canStudentReceive),
    scopeKey: getFamilyScopeKey(),
  };
}
