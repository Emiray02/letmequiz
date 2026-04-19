import { emitRealtimeSync } from "@/lib/realtime-sync";
import type {
  Classroom,
  ClassroomAssignment,
  ClassroomMember,
  ClassroomMemberRole,
  ClassroomProgressSnapshot,
  ClassroomTeacherSummary,
} from "@/types/classroom";

const CLASSROOMS_KEY = "letmequiz.classrooms";
const CLASSROOM_ASSIGNMENTS_KEY = "letmequiz.classroom.assignments";
const ACTIVE_CLASSROOM_KEY = "letmequiz.classroom.active";
const CLASSROOM_MEMBERS_KEY = "letmequiz.classroom.members";
const CLASSROOM_PROGRESS_KEY = "letmequiz.classroom.progress";

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
    // Ignore storage quota errors.
  }

  emitRealtimeSync("classroom");
}

function generateClassCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function defaultDueDate(): string {
  return new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
}

export function getClassrooms(): Classroom[] {
  const items = safeRead<Classroom[]>(CLASSROOMS_KEY, []);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getClassroomAssignments(classCode?: string): ClassroomAssignment[] {
  const items = safeRead<ClassroomAssignment[]>(CLASSROOM_ASSIGNMENTS_KEY, []);
  const sorted = items
    .map((item) => ({
      ...item,
      dueDate: item.dueDate || defaultDueDate(),
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || b.createdAt.localeCompare(a.createdAt));
  if (!classCode) {
    return sorted;
  }

  return sorted.filter((item) => item.classCode === classCode);
}

export function createClassroom(name: string): Classroom | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return null;
  }

  const next: Classroom = {
    id: crypto.randomUUID(),
    name: trimmed,
    code: generateClassCode(),
    createdAt: new Date().toISOString(),
  };

  const classrooms = [next, ...getClassrooms()];
  safeWrite(CLASSROOMS_KEY, classrooms);
  setActiveClassroom(next.code);
  addClassroomMember({
    classCode: next.code,
    name: "Teacher",
    role: "teacher",
  });
  return next;
}

export function joinClassroom(code: string): Classroom | null {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  const found = getClassrooms().find((item) => item.code === normalized) ?? null;
  if (!found) {
    return null;
  }

  setActiveClassroom(found.code);
  return found;
}

export function setActiveClassroom(code: string) {
  safeWrite(ACTIVE_CLASSROOM_KEY, code);
}

export function getActiveClassroomCode(): string {
  return safeRead<string>(ACTIVE_CLASSROOM_KEY, "");
}

export function assignSetToClass(input: {
  classCode: string;
  setId: string;
  setTitle: string;
  dueDate?: string;
}): ClassroomAssignment | null {
  const classCode = input.classCode.trim().toUpperCase();
  if (!classCode || !input.setId.trim() || !input.setTitle.trim()) {
    return null;
  }

  const dueDate = input.dueDate?.trim() || defaultDueDate();
  const currentAssignments = getClassroomAssignments();

  const existing = currentAssignments.find(
    (item) => item.classCode === classCode && item.setId === input.setId
  );
  if (existing) {
    const updated = currentAssignments.map((item) =>
      item.id === existing.id
        ? {
            ...item,
            dueDate,
          }
        : item
    );
    safeWrite(CLASSROOM_ASSIGNMENTS_KEY, updated);
    return getClassroomAssignments(classCode).find((item) => item.id === existing.id) ?? null;
  }

  const next: ClassroomAssignment = {
    id: crypto.randomUUID(),
    classCode,
    setId: input.setId,
    setTitle: input.setTitle,
    dueDate,
    createdAt: new Date().toISOString(),
  };

  const assignments = [next, ...currentAssignments];
  safeWrite(CLASSROOM_ASSIGNMENTS_KEY, assignments);
  return next;
}

export function getClassroomMembers(classCode?: string): ClassroomMember[] {
  const members = safeRead<ClassroomMember[]>(CLASSROOM_MEMBERS_KEY, []);
  const filtered = classCode
    ? members.filter((item) => item.classCode === classCode)
    : members;

  return filtered
    .filter((item) => Boolean(item.id && item.classCode && item.name))
    .sort((a, b) =>
      a.role === b.role
        ? a.name.localeCompare(b.name)
        : a.role === "teacher"
          ? -1
          : 1
    );
}

export function addClassroomMember(input: {
  classCode: string;
  name: string;
  role?: ClassroomMemberRole;
}): ClassroomMember | null {
  const classCode = input.classCode.trim().toUpperCase();
  const name = input.name.trim();
  if (!classCode || !name) {
    return null;
  }

  const members = getClassroomMembers();
  const existing = members.find(
    (item) =>
      item.classCode === classCode &&
      item.name.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR")
  );
  if (existing) {
    return existing;
  }

  const next: ClassroomMember = {
    id: crypto.randomUUID(),
    classCode,
    name,
    role: input.role ?? "student",
    joinedAt: new Date().toISOString(),
  };

  safeWrite(CLASSROOM_MEMBERS_KEY, [next, ...members]);
  return next;
}

export function getClassProgressSnapshots(classCode?: string): ClassroomProgressSnapshot[] {
  const snapshots = safeRead<ClassroomProgressSnapshot[]>(CLASSROOM_PROGRESS_KEY, []);
  const filtered = classCode
    ? snapshots.filter((item) => item.classCode === classCode)
    : snapshots;

  return filtered
    .filter((item) => Boolean(item.id && item.classCode && item.studentName && item.submittedAt))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function submitClassProgress(input: {
  classCode: string;
  studentName: string;
  accuracy: number;
  studyMinutes: number;
  pendingTasks: number;
  streakDays: number;
}): ClassroomProgressSnapshot | null {
  const classCode = input.classCode.trim().toUpperCase();
  const studentName = input.studentName.trim();
  if (!classCode || !studentName) {
    return null;
  }

  const next: ClassroomProgressSnapshot = {
    id: crypto.randomUUID(),
    classCode,
    studentName,
    accuracy: Math.max(0, Math.min(100, Math.round(input.accuracy))),
    studyMinutes: Math.max(0, Math.round(input.studyMinutes)),
    pendingTasks: Math.max(0, Math.round(input.pendingTasks)),
    streakDays: Math.max(0, Math.round(input.streakDays)),
    submittedAt: new Date().toISOString(),
  };

  const current = getClassProgressSnapshots();
  safeWrite(CLASSROOM_PROGRESS_KEY, [next, ...current].slice(0, 600));
  return next;
}

export function getClassroomTeacherSummary(classCode: string): ClassroomTeacherSummary {
  const normalized = classCode.trim().toUpperCase();
  const members = getClassroomMembers(normalized).filter((item) => item.role === "student");

  const snapshots = getClassProgressSnapshots(normalized);
  const latestByStudent = new Map<string, ClassroomProgressSnapshot>();

  for (const item of snapshots) {
    if (!latestByStudent.has(item.studentName)) {
      latestByStudent.set(item.studentName, item);
    }
  }

  const latestSnapshots = [...latestByStudent.values()];
  const averageAccuracy = latestSnapshots.length
    ? Math.round(latestSnapshots.reduce((sum, item) => sum + item.accuracy, 0) / latestSnapshots.length)
    : 0;
  const averageStudyMinutes = latestSnapshots.length
    ? Math.round(
        latestSnapshots.reduce((sum, item) => sum + item.studyMinutes, 0) /
          latestSnapshots.length
      )
    : 0;

  const riskAlerts = latestSnapshots.flatMap((item) => {
    const reasons: string[] = [];
    if (item.accuracy < 60) {
      reasons.push("accuracy below 60");
    }
    if (item.pendingTasks > 6) {
      reasons.push("too many pending tasks");
    }
    if (item.studyMinutes < 45) {
      reasons.push("low study minutes");
    }

    if (reasons.length === 0) {
      return [];
    }

    return [
      {
        studentName: item.studentName,
        reason: reasons.join(", "),
      },
    ];
  });

  return {
    classCode: normalized,
    memberCount: members.length,
    latestSnapshotCount: latestSnapshots.length,
    averageAccuracy,
    averageStudyMinutes,
    riskAlerts,
  };
}
