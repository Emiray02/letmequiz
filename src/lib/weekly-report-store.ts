import { getFamilyScopeKey } from "@/lib/family-link-store";
import { emitRealtimeSync } from "@/lib/realtime-sync";
import { getSpeakingCoachStats } from "@/lib/speaking-coach-store";
import { getStudentMetrics, getTasks, getWeeklyActivity, getQuizMistakes } from "@/lib/student-store";
import { getTelcMockResults } from "@/lib/telc-a2-store";

export type WeeklyReportRole = "student" | "parent";

export type WeeklyReport = {
  id: string;
  weekKey: string;
  role: WeeklyReportRole;
  createdAt: string;
  summary: string;
  kpis: Array<{ label: string; value: string }>;
  nextSteps: string[];
};

const WEEKLY_REPORTS_KEY = "letmequiz.weekly.reports";

function isBrowser() {
  return typeof window !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function getWeekKey(date = new Date()): string {
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const day = Math.floor((date.getTime() - yearStart.getTime()) / 86_400_000) + 1;
  const week = Math.ceil(day / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function scopedKey(): string {
  const scope = getFamilyScopeKey();
  return `${WEEKLY_REPORTS_KEY}.${scope}`;
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

  emitRealtimeSync("weekly-report");
}

function getStoredReports(): WeeklyReport[] {
  return safeRead<WeeklyReport[]>(scopedKey(), [])
    .filter((item) => Boolean(item?.id && item?.weekKey && item?.role))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function saveStoredReports(reports: WeeklyReport[]) {
  safeWrite(scopedKey(), reports.slice(0, 80));
}

function buildReport(role: WeeklyReportRole): WeeklyReport {
  const metrics = getStudentMetrics();
  const weekly = getWeeklyActivity(7);
  const mistakes = getQuizMistakes();
  const tasks = getTasks();
  const speaking = getSpeakingCoachStats();
  const telc = getTelcMockResults(1)[0];

  const totalMinutes = weekly.reduce((sum, item) => sum + item.studyMinutes, 0);
  const totalCards = weekly.reduce((sum, item) => sum + item.cardsReviewed, 0);
  const completedTasks = tasks.filter((item) => item.completed).length;
  const pendingTasks = tasks.filter((item) => !item.completed).length;

  const answers = metrics.totalCorrectAnswers + metrics.totalWrongAnswers;
  const accuracy = answers > 0 ? Math.round((metrics.totalCorrectAnswers / answers) * 100) : 0;

  const summary =
    role === "student"
      ? `Bu hafta ${totalMinutes} dakika calisildi, ${totalCards} kart tekrarlandi. Accuracy ${accuracy}% seviyesinde.`
      : `Ogrenci bu hafta ${totalMinutes} dakika calisti ve ${totalCards} kart tekrar etti. Genel dogruluk ${accuracy}%.`;

  const nextSteps: string[] = [];
  if (accuracy < 70) {
    nextSteps.push("Dogruluk dusuk oldugu icin gunluk 20 dakika ek Smart Review planla.");
  }
  if (mistakes.length > 10) {
    nextSteps.push("Hata defterindeki en sik 10 hata icin mini recovery set ac.");
  }
  if (pendingTasks > 4) {
    nextSteps.push("Bekleyen task birikmesini azaltmak icin iki oncelikli gorevi hemen tamamla.");
  }
  if ((telc?.overall ?? 0) > 0) {
    nextSteps.push(`Son TELC deneme puani ${telc?.overall}. En dusuk section icin hedef tekrar planla.`);
  }
  if (speaking.attempts > 0 && speaking.avgPronunciation < 75) {
    nextSteps.push("Konusma kocunda shadowing tekrarini artir ve telaffuz puanini 75+ hedefle.");
  }
  if (nextSteps.length === 0) {
    nextSteps.push("Mevcut ritmi koru ve haftalik challenge hedeflerini bir ust seviyeye tasimayi dene.");
  }

  return {
    id: crypto.randomUUID(),
    weekKey: getWeekKey(),
    role,
    createdAt: nowIso(),
    summary,
    kpis: [
      { label: "Study Minutes", value: `${totalMinutes}` },
      { label: "Cards Reviewed", value: `${totalCards}` },
      { label: "Accuracy", value: `%${accuracy}` },
      { label: "Completed Tasks", value: `${completedTasks}` },
      { label: "Pending Tasks", value: `${pendingTasks}` },
      { label: "Speaking Score", value: `${speaking.latestScore}` },
    ],
    nextSteps: nextSteps.slice(0, 5),
  };
}

export function getOrCreateCurrentWeeklyReport(role: WeeklyReportRole): WeeklyReport {
  const currentWeek = getWeekKey();
  const existing = getStoredReports().find((item) => item.weekKey === currentWeek && item.role === role);
  if (existing) {
    return existing;
  }

  const created = buildReport(role);
  const next = [created, ...getStoredReports()];
  saveStoredReports(next);
  return created;
}

export function regenerateCurrentWeeklyReport(role: WeeklyReportRole): WeeklyReport {
  const currentWeek = getWeekKey();
  const filtered = getStoredReports().filter(
    (item) => !(item.weekKey === currentWeek && item.role === role)
  );

  const created = buildReport(role);
  saveStoredReports([created, ...filtered]);
  return created;
}

export function getWeeklyReportHistory(role: WeeklyReportRole, limit = 8): WeeklyReport[] {
  return getStoredReports()
    .filter((item) => item.role === role)
    .slice(0, limit);
}
