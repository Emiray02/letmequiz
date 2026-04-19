"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  addParentReminder,
  getParentMonitorSnapshot,
  markParentReminderSeen,
  type ParentReminderPriority,
} from "@/lib/parent-monitor-store";
import { subscribeRealtimeSync } from "@/lib/realtime-sync";
import FamilyAccessPanel from "@/components/family-access-panel";
import WeeklyReportPanel from "@/components/weekly-report-panel";
import SkillMap from "@/components/skill-map";
import ParentWeeklyNotificationCenter from "@/components/parent-weekly-notification-center";

function weekdayLabel(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("tr-TR", {
    weekday: "short",
  });
}

function shortDate(date: string): string {
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function ParentMonitorDashboard() {
  const [snapshot, setSnapshot] = useState(() => getParentMonitorSnapshot());
  const [reminderText, setReminderText] = useState("");
  const [priority, setPriority] = useState<ParentReminderPriority>("normal");
  const [feedback, setFeedback] = useState("");

  function reload() {
    setSnapshot(getParentMonitorSnapshot());
  }

  useEffect(() => {
    const unsubscribe = subscribeRealtimeSync((topic) => {
      if (topic.includes("student") || topic.includes("parent") || topic.includes("family")) {
        setSnapshot(getParentMonitorSnapshot());
      }
    });

    const handle = window.setInterval(() => {
      setSnapshot(getParentMonitorSnapshot());
    }, 12_000);

    return () => {
      unsubscribe();
      window.clearInterval(handle);
    };
  }, []);

  if (!snapshot.access?.canParentMonitor) {
    return (
      <section className="space-y-4">
        <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <p className="text-sm font-semibold uppercase tracking-wide">Parent Access Required</p>
          <p className="mt-2 text-sm">
            Parent monitoring is available only after invite-code linking with a student.
          </p>
        </div>
        <FamilyAccessPanel compact />
      </section>
    );
  }

  const totalAnswers = snapshot.metrics.totalCorrectAnswers + snapshot.metrics.totalWrongAnswers;
  const overallAccuracy =
    totalAnswers > 0
      ? Math.round((snapshot.metrics.totalCorrectAnswers / Math.max(totalAnswers, 1)) * 100)
      : 0;

  const maxMinutes = Math.max(1, ...snapshot.timeline.map((item) => item.studyMinutes));
  const maxTasks = Math.max(1, ...snapshot.timeline.map((item) => item.completedTasks));

  function onSendReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reminderText.trim()) {
      setFeedback("Hatirlatma metni bos olamaz.");
      return;
    }

    const reminders = addParentReminder({
      message: reminderText,
      priority,
    });

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification("Veli Hatirlatmasi Gonderildi", {
        body: reminderText.trim(),
      });
    }

    setReminderText("");
    setPriority("normal");
    setSnapshot((prev) => ({
      ...prev,
      reminders,
    }));
    setFeedback("Hatirlatma ogrenciye iletildi.");
  }

  function markAsSeen(reminderId: string) {
    const reminders = markParentReminderSeen(reminderId);
    setSnapshot((prev) => ({
      ...prev,
      reminders,
    }));
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Streak</p>
          <p className="mt-1 text-3xl font-semibold text-teal-900">{snapshot.metrics.streakDays}</p>
          <p className="text-xs text-teal-700">gun</p>
        </article>
        <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Toplam Calisma</p>
          <p className="mt-1 text-3xl font-semibold text-sky-900">
            {Math.round(snapshot.metrics.totalStudySeconds / 60)}
          </p>
          <p className="text-xs text-sky-700">dakika</p>
        </article>
        <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Genel Dogruluk</p>
          <p className="mt-1 text-3xl font-semibold text-violet-900">%{overallAccuracy}</p>
          <p className="text-xs text-violet-700">quiz + writing</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Bekleyen Task</p>
          <p className="mt-1 text-3xl font-semibold text-amber-900">{snapshot.pendingTaskCount}</p>
          <p className="text-xs text-amber-700">planlanan</p>
        </article>
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Hata Kaydi</p>
          <p className="mt-1 text-3xl font-semibold text-rose-900">{snapshot.mistakesCount}</p>
          <p className="text-xs text-rose-700">toplam</p>
        </article>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <article className="rounded-[1.8rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl text-slate-900">14 Gun Gelisim Grafikleri</h3>
            <button
              type="button"
              onClick={reload}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Yenile
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Calisma Dakikasi</p>
            <div className="mt-3 grid grid-cols-14 gap-1">
              {snapshot.timeline.map((item) => {
                const height = Math.max(
                  8,
                  Math.round((item.studyMinutes / Math.max(maxMinutes, 1)) * 80)
                );
                return (
                  <div key={`minutes-${item.date}`} className="text-center">
                    <div className="mx-auto flex h-24 items-end rounded-md bg-slate-100 px-[2px]">
                      <div
                        className="w-full rounded-sm bg-slate-900"
                        style={{ height: `${height}%` }}
                        title={`${item.studyMinutes} dk`}
                      />
                    </div>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {weekdayLabel(item.date)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gunluk Accuracy + Task</p>
            <div className="mt-2 space-y-2">
              {snapshot.timeline.map((item) => (
                <div key={`accuracy-${item.date}`} className="grid grid-cols-[68px_1fr_58px_58px] items-center gap-2">
                  <p className="text-xs font-semibold text-slate-600">{shortDate(item.date)}</p>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-cyan-500"
                      style={{ width: `${item.accuracy}%` }}
                    />
                  </div>
                  <p className="text-right text-xs font-semibold text-cyan-700">%{item.accuracy}</p>
                  <p className="text-right text-xs text-slate-600">T {item.completedTasks}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tamamlanan Task Dagilimi</p>
            <div className="mt-3 grid grid-cols-14 gap-1">
              {snapshot.timeline.map((item) => {
                const height = Math.max(
                  6,
                  Math.round((item.completedTasks / Math.max(maxTasks, 1)) * 70)
                );
                return (
                  <div key={`tasks-${item.date}`} className="text-center">
                    <div className="mx-auto flex h-16 items-end rounded-md bg-slate-100 px-[2px]">
                      <div
                        className="w-full rounded-sm bg-emerald-500"
                        style={{ height: `${height}%` }}
                        title={`${item.completedTasks} task`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </article>

        <article className="rounded-[1.8rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
          <h3 className="font-display text-2xl text-slate-900">Veli Hatirlatma Merkezi</h3>
          <p className="mt-1 text-sm text-slate-600">
            Veli buradan ogrenciye odak mesajlari gonderebilir; ogrenci gordugunde durum burada guncellenir.
          </p>

          <form onSubmit={onSendReminder} className="mt-4 space-y-3">
            <textarea
              value={reminderText}
              onChange={(event) => setReminderText(event.target.value)}
              placeholder="Ornek: Bugun 19:00'da 40 dk Lesen + 20 dk Schreiben calis."
              className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring"
            />
            <div className="flex items-center gap-2">
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as ParentReminderPriority)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Acil</option>
              </select>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Hatirlatma Gonder
              </button>
            </div>
          </form>

          {feedback ? (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {feedback}
            </p>
          ) : null}

          <div className="mt-4 space-y-2">
            {snapshot.reminders.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                Henuz veli hatirlatmasi yok.
              </p>
            ) : (
              snapshot.reminders.map((reminder) => (
                <article key={reminder.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                        reminder.priority === "urgent"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {reminder.priority}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(reminder.createdAt).toLocaleString("tr-TR")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{reminder.message}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-cyan-700">
                      durum: {reminder.status}
                    </span>
                    {reminder.status === "new" ? (
                      <button
                        type="button"
                        onClick={() => markAsSeen(reminder.id)}
                        className="rounded-md border border-slate-300 px-2 py-1 font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Goruldu Isaretle
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-[1.6rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
          <h4 className="text-lg font-semibold text-slate-900">Son Tamamlanan Tasklar</h4>
          <div className="mt-3 space-y-2">
            {snapshot.latestCompletedTasks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                Ogrenci henuz task tamamlamadi.
              </p>
            ) : (
              snapshot.latestCompletedTasks.map((task) => (
                <div key={task.id} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm font-semibold text-emerald-900">{task.title}</p>
                  <p className="mt-1 text-xs text-emerald-800">
                    {task.subject} | Tamamlandi: {task.completedAt ? new Date(task.completedAt).toLocaleString("tr-TR") : "-"}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-[1.6rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
          <h4 className="text-lg font-semibold text-slate-900">Bekleyen Tasklar</h4>
          <div className="mt-3 space-y-2">
            {snapshot.latestPendingTasks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                Bekleyen task yok.
              </p>
            ) : (
              snapshot.latestPendingTasks.map((task) => (
                <div key={task.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-900">{task.title}</p>
                  <p className="mt-1 text-xs text-amber-800">{task.subject} | Son tarih: {task.dueDate}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SkillMap metrics={snapshot.metrics} />
        <WeeklyReportPanel role="parent" />
      </div>

      <ParentWeeklyNotificationCenter />
    </section>
  );
}
