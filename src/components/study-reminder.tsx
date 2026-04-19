"use client";

import { useEffect, useState } from "react";

const REMINDER_KEY = "letmequiz.reminder.settings";

type ReminderSettings = {
  enabled: boolean;
  intervalMinutes: number;
};

function loadSettings(): ReminderSettings {
  if (typeof window === "undefined") {
    return {
      enabled: false,
      intervalMinutes: 45,
    };
  }

  try {
    const raw = window.localStorage.getItem(REMINDER_KEY);
    if (!raw) {
      return {
        enabled: false,
        intervalMinutes: 45,
      };
    }

    const parsed = JSON.parse(raw) as ReminderSettings;
    return {
      enabled: Boolean(parsed.enabled),
      intervalMinutes: Math.min(180, Math.max(15, Number(parsed.intervalMinutes) || 45)),
    };
  } catch {
    return {
      enabled: false,
      intervalMinutes: 45,
    };
  }
}

export default function StudyReminder() {
  const initial = loadSettings();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [intervalMinutes, setIntervalMinutes] = useState(initial.intervalMinutes);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      REMINDER_KEY,
      JSON.stringify({
        enabled,
        intervalMinutes,
      })
    );
  }, [enabled, intervalMinutes]);

  useEffect(() => {
    if (typeof window === "undefined" || !enabled) {
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    const handle = window.setInterval(() => {
      if (Notification.permission === "granted") {
        new Notification("LetMeQuiz Reminder", {
          body: "Quick session time. Review due cards and keep your streak.",
        });
      }
    }, intervalMs);

    return () => {
      window.clearInterval(handle);
    };
  }, [enabled, intervalMinutes]);

  async function requestPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setMessage("Notifications are not supported in this browser.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setMessage("Notification permission granted.");
    } else {
      setMessage("Notification permission denied.");
      setEnabled(false);
    }
  }

  function toggleReminder() {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted") {
      setMessage("Grant notification permission first.");
      return;
    }

    setEnabled((value) => !value);
    setMessage("");
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Study Reminder</p>
          <p className="text-xs text-slate-500">Keep sessions consistent with notification nudges.</p>
        </div>
        <button
          type="button"
          onClick={requestPermission}
          className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
        >
          Allow Notifications
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          Interval
          <input
            type="range"
            min={15}
            max={180}
            step={5}
            value={intervalMinutes}
            onChange={(event) => setIntervalMinutes(Number(event.target.value))}
            className="accent-slate-900"
          />
          <span className="w-10 text-right text-xs font-semibold">{intervalMinutes}m</span>
        </label>
        <button
          type="button"
          onClick={toggleReminder}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            enabled
              ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
          }`}
        >
          {enabled ? "Reminder On" : "Reminder Off"}
        </button>
      </div>

      {message ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {message}
        </p>
      ) : null}
    </section>
  );
}
