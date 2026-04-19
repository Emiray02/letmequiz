import { getPerformanceTimeline, getQuizMistakes, getStudentMetrics, getTasks } from "@/lib/student-store";
import { getFamilyAccessState, getFamilyScopeKey } from "@/lib/family-link-store";
import { emitRealtimeSync } from "@/lib/realtime-sync";

export type ParentReminderPriority = "normal" | "urgent";
export type ParentReminderStatus = "new" | "seen" | "done";

export type ParentReminder = {
  id: string;
  message: string;
  priority: ParentReminderPriority;
  status: ParentReminderStatus;
  createdAt: string;
  seenAt?: string;
  doneAt?: string;
};

const PARENT_REMINDERS_KEY = "letmequiz.parent.reminders";

function remindersKey(): string {
  return `${PARENT_REMINDERS_KEY}.${getFamilyScopeKey()}`;
}

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

  emitRealtimeSync("parent-monitor");
}

function sanitizeReminder(item: ParentReminder): ParentReminder {
  const priority: ParentReminderPriority = item.priority === "urgent" ? "urgent" : "normal";
  const status: ParentReminderStatus =
    item.status === "done" ? "done" : item.status === "seen" ? "seen" : "new";

  return {
    id: item.id,
    message: item.message,
    priority,
    status,
    createdAt: item.createdAt,
    seenAt: item.seenAt,
    doneAt: item.doneAt,
  };
}

export function getParentReminders(): ParentReminder[] {
  const reminders = safeRead<ParentReminder[]>(remindersKey(), []);
  return reminders
    .map(sanitizeReminder)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function saveParentReminders(reminders: ParentReminder[]) {
  safeWrite(remindersKey(), reminders);
}

export function addParentReminder(input: {
  message: string;
  priority?: ParentReminderPriority;
}): ParentReminder[] {
  const message = input.message.trim();
  if (!message) {
    return getParentReminders();
  }

  const next: ParentReminder = {
    id: crypto.randomUUID(),
    message,
    priority: input.priority ?? "normal",
    status: "new",
    createdAt: new Date().toISOString(),
  };

  const reminders = [next, ...getParentReminders()];
  saveParentReminders(reminders);
  return getParentReminders();
}

export function markParentReminderSeen(reminderId: string): ParentReminder[] {
  const reminders = getParentReminders().map((reminder) => {
    if (reminder.id !== reminderId || reminder.status !== "new") {
      return reminder;
    }

    return {
      ...reminder,
      status: "seen" as const,
      seenAt: new Date().toISOString(),
    };
  });

  saveParentReminders(reminders);
  return getParentReminders();
}

export function markParentReminderDone(reminderId: string): ParentReminder[] {
  const reminders = getParentReminders().map((reminder) => {
    if (reminder.id !== reminderId) {
      return reminder;
    }

    return {
      ...reminder,
      status: "done" as const,
      seenAt: reminder.seenAt ?? new Date().toISOString(),
      doneAt: new Date().toISOString(),
    };
  });

  saveParentReminders(reminders);
  return getParentReminders();
}

export function getParentMonitorSnapshot() {
  const access = getFamilyAccessState();
  const metrics = getStudentMetrics();
  const tasks = getTasks();
  const reminders = getParentReminders();
  const mistakes = getQuizMistakes();
  const timeline = getPerformanceTimeline(14);

  const completedTasks = tasks.filter((task) => task.completed);
  const pendingTasks = tasks.filter((task) => !task.completed);

  return {
    access,
    metrics,
    timeline,
    reminders,
    mistakesCount: mistakes.length,
    pendingTaskCount: pendingTasks.length,
    completedTaskCount: completedTasks.length,
    latestCompletedTasks: completedTasks
      .slice()
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .slice(0, 8),
    latestPendingTasks: pendingTasks
      .slice()
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 8),
  };
}
