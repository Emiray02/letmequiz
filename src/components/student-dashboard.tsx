"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  addTask,
  completeTask,
  deleteTask,
  getStudentMetrics,
  getTasks,
  getWeeklyActivity,
  setDailyGoalMinutes,
} from "@/lib/student-store";
import {
  getParentReminders,
  markParentReminderDone,
  markParentReminderSeen,
  type ParentReminder,
} from "@/lib/parent-monitor-store";
import { getFamilyAccessState } from "@/lib/family-link-store";
import { subscribeRealtimeSync } from "@/lib/realtime-sync";
import { getActiveClassroomCode, submitClassProgress } from "@/lib/classroom-store";
import type { StudentMetrics, StudyTask, StudyTaskPriority } from "@/types/student";
import StudyReminder from "@/components/study-reminder";
import FamilyAccessPanel from "@/components/family-access-panel";
import SkillMap from "@/components/skill-map";
import MotivationPanel from "@/components/motivation-panel";
import WeeklyReportPanel from "@/components/weekly-report-panel";
import CefrPlacementTest from "@/components/cefr-placement-test";
import AdaptivePlannerV2Panel from "@/components/adaptive-planner-v2-panel";

type StudentDashboardProps = {
  setCount: number;
};

const priorityStyles: Record<StudyTaskPriority, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-rose-200 bg-rose-50 text-rose-700",
};

function weekdayLabel(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("tr-TR", {
    weekday: "short",
  });
}

export default function StudentDashboard({ setCount }: StudentDashboardProps) {
  const [metrics, setMetrics] = useState<StudentMetrics>(() => getStudentMetrics());
  const [tasks, setTasks] = useState<StudyTask[]>(() => getTasks());
  const [weekly, setWeekly] = useState<Array<{ date: string; studyMinutes: number; cardsReviewed: number }>>(
    () => getWeeklyActivity(7)
  );
  const [parentReminders, setParentReminders] = useState<ParentReminder[]>(() => getParentReminders());
  const [goalMinutes, setGoalMinutes] = useState(() => getStudentMetrics().dailyGoalMinutes);
  const [familyAccess, setFamilyAccess] = useState(() => getFamilyAccessState());
  const [classCode, setClassCode] = useState(() => getActiveClassroomCode());
  const [classStudentName, setClassStudentName] = useState(() => getFamilyAccessState().profile.displayName);
  const [classFeedback, setClassFeedback] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskSubject, setTaskSubject] = useState("General");
  const [taskDueDate, setTaskDueDate] = useState(() =>
    new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  );
  const [taskPriority, setTaskPriority] = useState<StudyTaskPriority>("medium");

  useEffect(() => {
    const unsubscribe = subscribeRealtimeSync((topic) => {
      if (topic.includes("student") || topic.includes("parent") || topic.includes("family")) {
        reloadState();
      }
    });

    const handle = window.setInterval(() => {
      setParentReminders(getParentReminders());
    }, 12_000);

    return () => {
      unsubscribe();
      window.clearInterval(handle);
    };
  }, []);

  function reloadState() {
    const loadedMetrics = getStudentMetrics();
    setMetrics(loadedMetrics);
    setGoalMinutes(loadedMetrics.dailyGoalMinutes);
    setTasks(getTasks());
    setWeekly(getWeeklyActivity(7));
    setParentReminders(getParentReminders());
    setFamilyAccess(getFamilyAccessState());
    setClassCode(getActiveClassroomCode());
  }

  const todayDateKey = new Date().toISOString().slice(0, 10);
  const todayMinutes = Math.round((metrics.activityByDate[todayDateKey]?.studySeconds ?? 0) / 60);
  const todayGoal = {
    currentMinutes: todayMinutes,
    goalMinutes: metrics.dailyGoalMinutes,
    percentage: Math.min(
      100,
      Math.max(0, Math.round((todayMinutes / Math.max(metrics.dailyGoalMinutes, 1)) * 100))
    ),
  };

  const totalAnswers =
    (metrics.totalCorrectAnswers ?? 0) + (metrics.totalWrongAnswers ?? 0);
  const overallAccuracy =
    totalAnswers === 0 ? 0 : Math.round((metrics.totalCorrectAnswers / totalAnswers) * 100);

  const completedTasks = tasks.filter((task) => task.completed).length;
  const pendingTasks = tasks.length - completedTasks;
  const maxWeeklyMinutes = Math.max(1, ...weekly.map((item) => item.studyMinutes));

  function updateGoal(nextValue: number) {
    setGoalMinutes(nextValue);
    setDailyGoalMinutes(nextValue);
    reloadState();
  }

  function onTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTasks(
      addTask({
        title: taskTitle,
        subject: taskSubject,
        dueDate: taskDueDate,
        priority: taskPriority,
      })
    );

    setTaskTitle("");
    setTaskSubject("General");
    setTaskPriority("medium");
    reloadState();
  }

  function onCompleteTask(taskId: string) {
    setTasks(completeTask(taskId));
    reloadState();
  }

  function onDeleteTask(taskId: string) {
    setTasks(deleteTask(taskId));
    reloadState();
  }

  function onReminderSeen(reminderId: string) {
    setParentReminders(markParentReminderSeen(reminderId));
  }

  function onReminderDone(reminderId: string) {
    setParentReminders(markParentReminderDone(reminderId));
  }

  function publishClassSnapshot() {
    const code = classCode.trim().toUpperCase();
    if (!code) {
      setClassFeedback("Class code is required.");
      return;
    }

    const total = metrics.totalCorrectAnswers + metrics.totalWrongAnswers;
    const accuracy = total > 0 ? Math.round((metrics.totalCorrectAnswers / total) * 100) : 0;
    const pending = tasks.filter((item) => !item.completed).length;

    const snapshot = submitClassProgress({
      classCode: code,
      studentName: classStudentName.trim() || "Student",
      accuracy,
      studyMinutes: Math.round(metrics.totalStudySeconds / 60),
      pendingTasks: pending,
      streakDays: metrics.streakDays,
    });

    if (!snapshot) {
      setClassFeedback("Progress could not be published.");
      return;
    }

    setClassFeedback("Progress published to teacher panel.");
  }

  return (
    <section className="mt-12 grid gap-5 lg:grid-cols-[1.25fr_0.95fr]">
      <article className="rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.9)] backdrop-blur md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl text-slate-900">Student Dashboard</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              {setCount} active set
            </span>
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
              familyAccess.canStudentReceive
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-amber-200 bg-amber-50 text-amber-700"
            }`}>
              {familyAccess.canStudentReceive ? "parent linked" : "not linked"}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Streak</p>
            <p className="mt-1 text-3xl font-semibold text-teal-900">{metrics.streakDays}</p>
            <p className="text-xs text-teal-700">days in a row</p>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Study Time</p>
            <p className="mt-1 text-3xl font-semibold text-sky-900">
              {Math.round((metrics.totalStudySeconds ?? 0) / 60)}
            </p>
            <p className="text-xs text-sky-700">minutes total</p>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Accuracy</p>
            <p className="mt-1 text-3xl font-semibold text-violet-900">%{overallAccuracy}</p>
            <p className="text-xs text-violet-700">quiz plus writing</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Tasks</p>
            <p className="mt-1 text-3xl font-semibold text-amber-900">{pendingTasks}</p>
            <p className="text-xs text-amber-700">pending homework</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800">Daily Goal</p>
            <p className="text-sm text-slate-600">
              {todayGoal.currentMinutes} / {todayGoal.goalMinutes} min
            </p>
          </div>

          <input
            type="range"
            min={15}
            max={180}
            step={5}
            value={goalMinutes}
            onChange={(event) => updateGoal(Number(event.target.value))}
            className="mt-3 w-full accent-slate-900"
          />

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-teal-500 transition-all"
              style={{ width: `${todayGoal.percentage}%` }}
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-800">7-Day Activity</p>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {weekly.map((entry) => {
              const height = Math.max(
                8,
                Math.round((entry.studyMinutes / Math.max(maxWeeklyMinutes, 1)) * 80)
              );

              return (
                <div key={entry.date} className="text-center">
                  <div className="mx-auto flex h-24 items-end justify-center rounded-xl bg-slate-100 px-1">
                    <div
                      className="w-full rounded-md bg-slate-900"
                      style={{ height: `${height}%` }}
                      title={`${entry.studyMinutes} min`}
                    />
                  </div>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {weekdayLabel(entry.date)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">Veli Hatirlatmalari</p>
            <p className="text-xs text-slate-500">{parentReminders.length} mesaj</p>
          </div>

          <div className="mt-3 space-y-2">
            {parentReminders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                Henuz veli hatirlatmasi yok.
              </p>
            ) : (
              parentReminders.slice(0, 5).map((reminder) => (
                <article key={reminder.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                        reminder.priority === "urgent"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {reminder.priority}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(reminder.createdAt).toLocaleString("tr-TR")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{reminder.message}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700">
                      {reminder.status}
                    </span>
                    {reminder.status === "new" ? (
                      <button
                        type="button"
                        onClick={() => onReminderSeen(reminder.id)}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Gordu olarak isaretle
                      </button>
                    ) : null}
                    {reminder.status !== "done" ? (
                      <button
                        type="button"
                        onClick={() => onReminderDone(reminder.id)}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Yaptim
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-800">Publish Progress to Teacher Panel</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              value={classCode}
              onChange={(event) => setClassCode(event.target.value.toUpperCase())}
              placeholder="Class code"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={classStudentName}
              onChange={(event) => setClassStudentName(event.target.value)}
              placeholder="Student name"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={publishClassSnapshot}
            className="mt-2 rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-700 transition hover:bg-cyan-100"
          >
            Publish Snapshot
          </button>
          {classFeedback ? <p className="mt-2 text-xs text-slate-600">{classFeedback}</p> : null}
        </div>

        <FamilyAccessPanel compact />

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <CefrPlacementTest />
          <AdaptivePlannerV2Panel />
        </div>

        <StudyReminder />

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <SkillMap metrics={metrics} />
          <MotivationPanel metrics={metrics} />
        </div>

        <div className="mt-6">
          <WeeklyReportPanel role="student" />
        </div>
      </article>

      <article className="rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.9)] backdrop-blur md:p-8">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-3xl text-slate-900">Planner</h3>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {completedTasks} done
          </p>
        </div>

        <form onSubmit={onTaskSubmit} className="mt-4 space-y-3">
          <input
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
            placeholder="Task title"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-teal-500 focus:ring"
            required
          />

          <div className="grid gap-2 sm:grid-cols-3">
            <input
              value={taskSubject}
              onChange={(event) => setTaskSubject(event.target.value)}
              placeholder="Subject"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-teal-500 focus:ring"
            />
            <input
              type="date"
              value={taskDueDate}
              onChange={(event) => setTaskDueDate(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-teal-500 focus:ring"
            />
            <select
              value={taskPriority}
              onChange={(event) => setTaskPriority(event.target.value as StudyTaskPriority)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-teal-500 focus:ring"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Add Task
          </button>
        </form>

        <div className="mt-5 space-y-2">
          {tasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              No tasks yet. Add homework and exam reminders.
            </p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${task.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
                    {task.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{task.subject}</span>
                    <span>Due {task.dueDate}</span>
                    {task.completedAt ? (
                      <span>Done {new Date(task.completedAt).toLocaleDateString("tr-TR")}</span>
                    ) : null}
                    <span
                      className={`rounded-full border px-2 py-0.5 font-semibold uppercase tracking-wide ${priorityStyles[task.priority]}`}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  {task.completed ? (
                    <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-center text-xs font-semibold text-emerald-700">
                      Tamamlandi
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCompleteTask(task.id)}
                      className="rounded-lg border border-cyan-300 bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
                    >
                      Tamamladim
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  );
}
