"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import type { StudySetSummary } from "@/types/study";
import {
  addClassroomMember,
  assignSetToClass,
  createClassroom,
  getActiveClassroomCode,
  getClassroomAssignments,
  getClassProgressSnapshots,
  getClassroomMembers,
  getClassroomTeacherSummary,
  getClassrooms,
  joinClassroom,
  submitClassProgress,
  setActiveClassroom,
} from "@/lib/classroom-store";
import { getStudentMetrics, getTasks } from "@/lib/student-store";
import ClassLivePanel from "@/components/class-live-panel";

type ClassroomHubProps = {
  sets: StudySetSummary[];
  initialSetId?: string;
};

const DEFAULT_ASSIGNMENT_DUE_DATE = (() => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
})();

export default function ClassroomHub({ sets, initialSetId }: ClassroomHubProps) {
  const [classes, setClasses] = useState(() => getClassrooms());
  const [activeCode, setActiveCode] = useState(() => getActiveClassroomCode() || classes[0]?.code || "");
  const [assignments, setAssignments] = useState(() => getClassroomAssignments(activeCode));
  const [members, setMembers] = useState(() => getClassroomMembers(activeCode));
  const [snapshots, setSnapshots] = useState(() => getClassProgressSnapshots(activeCode));
  const [teacherSummary, setTeacherSummary] = useState(() =>
    activeCode
      ? getClassroomTeacherSummary(activeCode)
      : {
          classCode: "",
          memberCount: 0,
          latestSnapshotCount: 0,
          averageAccuracy: 0,
          averageStudyMinutes: 0,
          riskAlerts: [],
        }
  );

  const [className, setClassName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [selectedSetId, setSelectedSetId] = useState(initialSetId ?? sets[0]?.id ?? "");
  const [assignmentDueDate, setAssignmentDueDate] = useState(DEFAULT_ASSIGNMENT_DUE_DATE);
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState<"teacher" | "student">("student");
  const [progressStudentName, setProgressStudentName] = useState("");
  const [feedback, setFeedback] = useState("");

  const selectedSet = useMemo(
    () => sets.find((item) => item.id === selectedSetId) ?? null,
    [selectedSetId, sets]
  );

  function refreshActive(code: string) {
    setActiveCode(code);
    setActiveClassroom(code);
    setAssignments(getClassroomAssignments(code));
    setMembers(getClassroomMembers(code));
    setSnapshots(getClassProgressSnapshots(code));
    setTeacherSummary(getClassroomTeacherSummary(code));
  }

  function onCreateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = createClassroom(className);
    if (!created) {
      setFeedback("Class name is required.");
      return;
    }

    const nextClasses = getClassrooms();
    setClasses(nextClasses);
    refreshActive(created.code);
    setClassName("");
    setFeedback(`Class created: ${created.name} (${created.code})`);
  }

  function onJoinClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const joined = joinClassroom(joinCode);
    if (!joined) {
      setFeedback("Class code not found in this device.");
      return;
    }

    refreshActive(joined.code);
    setJoinCode("");
    setFeedback(`Joined class: ${joined.name}`);
  }

  function onAssignSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeCode) {
      setFeedback("Select a class first.");
      return;
    }
    if (!selectedSet) {
      setFeedback("Select a set first.");
      return;
    }

    const created = assignSetToClass({
      classCode: activeCode,
      setId: selectedSet.id,
      setTitle: selectedSet.title,
      dueDate: assignmentDueDate,
    });
    if (!created) {
      setFeedback("Set assignment failed.");
      return;
    }

    setAssignments(getClassroomAssignments(activeCode));
    setFeedback(`Assigned ${selectedSet.title} to class ${activeCode}.`);
  }

  function onAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeCode) {
      setFeedback("Select a class first.");
      return;
    }

    const created = addClassroomMember({
      classCode: activeCode,
      name: memberName,
      role: memberRole,
    });
    if (!created) {
      setFeedback("Member name is required.");
      return;
    }

    setMemberName("");
    setMembers(getClassroomMembers(activeCode));
    setTeacherSummary(getClassroomTeacherSummary(activeCode));
    setFeedback(`Member added: ${created.name}`);
  }

  function submitCurrentStudentProgress() {
    if (!activeCode) {
      setFeedback("Select a class first.");
      return;
    }

    const metrics = getStudentMetrics();
    const tasks = getTasks();
    const totalAnswers = metrics.totalCorrectAnswers + metrics.totalWrongAnswers;
    const accuracy =
      totalAnswers > 0 ? Math.round((metrics.totalCorrectAnswers / totalAnswers) * 100) : 0;

    const studentName = progressStudentName.trim() || "Student";
    const snapshot = submitClassProgress({
      classCode: activeCode,
      studentName,
      accuracy,
      studyMinutes: Math.round(metrics.totalStudySeconds / 60),
      pendingTasks: tasks.filter((item) => !item.completed).length,
      streakDays: metrics.streakDays,
    });

    if (!snapshot) {
      setFeedback("Could not submit progress snapshot.");
      return;
    }

    setSnapshots(getClassProgressSnapshots(activeCode));
    setTeacherSummary(getClassroomTeacherSummary(activeCode));
    setFeedback(`Progress snapshot submitted for ${studentName}.`);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="space-y-4 rounded-[1.8rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
        <h2 className="font-display text-3xl text-slate-900">Class Mode</h2>
        <p className="text-sm text-slate-600">
          Create classes, assign sets with deadlines, and monitor class risk alerts.
        </p>

        <form onSubmit={onCreateClass} className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Create class</label>
          <div className="flex gap-2">
            <input
              value={className}
              onChange={(event) => setClassName(event.target.value)}
              placeholder="Example: English B1 Group"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring"
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Create
            </button>
          </div>
        </form>

        <form onSubmit={onJoinClass} className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Join by code</label>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="CLASS CODE"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm uppercase outline-none ring-cyan-500 focus:ring"
            />
            <button
              type="submit"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Join
            </button>
          </div>
        </form>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your classes</p>
          {classes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
              No class created yet.
            </p>
          ) : (
            <div className="space-y-2">
              {classes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => refreshActive(item.code)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                    activeCode === item.code
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <p className="font-semibold">{item.name}</p>
                  <p className={`text-xs ${activeCode === item.code ? "text-white/80" : "text-slate-500"}`}>
                    Code: {item.code}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-[1.8rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
        <h3 className="font-display text-3xl text-slate-900">Teacher Panel</h3>
        <p className="text-sm text-slate-600">Active class code: {activeCode || "Not selected"}</p>

        <form onSubmit={onAssignSet} className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assign set with due date</label>
          <select
            value={selectedSetId}
            onChange={(event) => setSelectedSetId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring"
          >
            {sets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={assignmentDueDate}
            onChange={(event) => setAssignmentDueDate(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Assign To Class
          </button>
        </form>

        {feedback ? (
          <p className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">{feedback}</p>
        ) : null}

        <form onSubmit={onAddMember} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add Member</p>
          <input
            value={memberName}
            onChange={(event) => setMemberName(event.target.value)}
            placeholder="Student or teacher name"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <select
            value={memberRole}
            onChange={(event) => setMemberRole(event.target.value as "teacher" | "student")}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
          >
            Add Member
          </button>
        </form>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submit Student Snapshot</p>
          <input
            value={progressStudentName}
            onChange={(event) => setProgressStudentName(event.target.value)}
            placeholder="Student name"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={submitCurrentStudentProgress}
            className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
          >
            Submit Current Device Metrics
          </button>
        </div>

        <ClassLivePanel classCode={activeCode} defaultParticipantName={progressStudentName || "Student"} />

        <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs uppercase tracking-wide text-slate-600 sm:grid-cols-3">
          <p>Students {teacherSummary.memberCount}</p>
          <p>Avg accuracy %{teacherSummary.averageAccuracy}</p>
          <p>Avg minutes {teacherSummary.averageStudyMinutes}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risk Alerts</p>
          {teacherSummary.riskAlerts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
              No active risk signals.
            </p>
          ) : (
            teacherSummary.riskAlerts.map((item, index) => (
              <article key={`${item.studentName}-${index}`} className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                <p className="font-semibold">{item.studentName}</p>
                <p className="mt-1 text-xs">{item.reason}</p>
              </article>
            ))
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assignment Calendar</p>
          {assignments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
              No assignments yet.
            </p>
          ) : (
            assignments.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">{item.setTitle}</p>
                <p className="mt-1 text-xs text-slate-500">Due: {item.dueDate}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/set/${item.setId}`}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Open Study Set
                  </Link>
                  <Link
                    href={`/quiz/${item.setId}`}
                    className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    Open Quiz
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Members</p>
          {members.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
              No members yet.
            </p>
          ) : (
            members.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                <p className="mt-1 text-xs text-slate-500">Role: {item.role}</p>
              </article>
            ))
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest Progress Snapshots</p>
          {snapshots.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
              No student snapshots submitted yet.
            </p>
          ) : (
            snapshots.slice(0, 8).map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{item.studentName}</p>
                <p className="mt-1 text-xs">Accuracy %{item.accuracy} | Minutes {item.studyMinutes}</p>
                <p className="text-xs">Pending {item.pendingTasks} | Streak {item.streakDays}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
