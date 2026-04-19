"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  connectStudentWithCode,
  createParentInviteCode,
  disconnectActiveFamilyLink,
  getFamilyAccessState,
  setFamilyRole,
  updateFamilyProfile,
} from "@/lib/family-link-store";
import { subscribeRealtimeSync } from "@/lib/realtime-sync";

type FamilyAccessPanelProps = {
  compact?: boolean;
};

export default function FamilyAccessPanel({ compact = false }: FamilyAccessPanelProps) {
  const [access, setAccess] = useState(() => getFamilyAccessState());
  const [displayName, setDisplayName] = useState(access.profile.displayName);
  const [joinCode, setJoinCode] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeRealtimeSync((topic) => {
      if (topic.includes("family")) {
        const next = getFamilyAccessState();
        setAccess(next);
        setDisplayName(next.profile.displayName);
      }
    });

    return unsubscribe;
  }, []);

  function reload() {
    const next = getFamilyAccessState();
    setAccess(next);
    setDisplayName(next.profile.displayName);
  }

  function switchRole(role: "parent" | "student") {
    setFamilyRole(role);
    setFeedback(role === "parent" ? "Parent mode selected." : "Student mode selected.");
    reload();
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateFamilyProfile({ displayName });
    setFeedback("Display name updated.");
    reload();
  }

  function createInvite() {
    const link = createParentInviteCode(displayName);
    setFeedback(`Invite code created: ${link.code}`);
    reload();
  }

  function joinWithCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const linked = connectStudentWithCode(joinCode, displayName);
    if (!linked) {
      setFeedback("Invalid code or parent has not generated invite yet.");
      return;
    }

    setFeedback("Connected to parent successfully.");
    setJoinCode("");
    reload();
  }

  function disconnect() {
    disconnectActiveFamilyLink();
    setFeedback("Family link was disconnected.");
    reload();
  }

  return (
    <section className={`rounded-[1.6rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.8)] backdrop-blur ${compact ? "" : "mt-6"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Family Access</p>
          <h3 className="mt-1 font-display text-2xl text-slate-900">Parent Student Link</h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => switchRole("student")}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              access.profile.role === "student"
                ? "border-cyan-400 bg-cyan-50 text-cyan-800"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            Student
          </button>
          <button
            type="button"
            onClick={() => switchRole("parent")}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              access.profile.role === "parent"
                ? "border-amber-400 bg-amber-50 text-amber-800"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            Parent
          </button>
        </div>
      </div>

      <form onSubmit={saveProfile} className="mt-4 flex flex-wrap gap-2">
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Display name"
          className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring"
        />
        <button
          type="submit"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Save
        </button>
      </form>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p>
          Current role: <span className="font-semibold">{access.profile.role}</span>
        </p>
        <p>
          Status: {access.activeLink ? `${access.activeLink.status} (${access.activeLink.code})` : "not linked"}
        </p>
      </div>

      {access.profile.role === "parent" ? (
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={createInvite}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Generate Invite Code
          </button>
          <p className="text-xs text-slate-500">
            Parent mode shows student data only when a student joins with your invite code.
          </p>
        </div>
      ) : (
        <form onSubmit={joinWithCode} className="mt-4 space-y-2">
          <input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            placeholder="Enter parent invite code"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm uppercase outline-none ring-cyan-500 focus:ring"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Connect to Parent
          </button>
        </form>
      )}

      {access.activeLink ? (
        <button
          type="button"
          onClick={disconnect}
          className="mt-3 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
        >
          Disconnect Link
        </button>
      ) : null}

      {feedback ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}
