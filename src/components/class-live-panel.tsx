"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  closeLiveSession,
  createLiveSession,
  getActiveLiveSession,
  getLiveSessionStats,
  submitLiveResponse,
} from "@/lib/class-live-store";
import { subscribeRealtimeSync } from "@/lib/realtime-sync";
import { trackAnalyticsEvent } from "@/lib/analytics-store";

type ClassLivePanelProps = {
  classCode: string;
  defaultParticipantName: string;
};

export default function ClassLivePanel({ classCode, defaultParticipantName }: ClassLivePanelProps) {
  const [hostName, setHostName] = useState("Teacher");
  const [participantName, setParticipantName] = useState(defaultParticipantName || "Student");
  const [prompt, setPrompt] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctIndex, setCorrectIndex] = useState(0);
  const [durationSec, setDurationSec] = useState(60);
  const [feedback, setFeedback] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeRealtimeSync((topic) => {
      if (topic.includes("class-live") || topic.includes("classroom")) {
        setVersion((value) => value + 1);
      }
    });

    return unsubscribe;
  }, []);

  const active = useMemo(() => {
    void version;
    return getActiveLiveSession(classCode);
  }, [classCode, version]);

  const stats = useMemo(() => getLiveSessionStats(active), [active]);

  function onCreateSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = createLiveSession({
      classCode,
      hostName,
      prompt,
      optionA,
      optionB,
      optionC,
      optionD,
      correctIndex,
      durationSec,
    });

    if (!created) {
      setFeedback("Please fill all question and option fields.");
      return;
    }

    setPrompt("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setFeedback("Live mini quiz started.");
    setVersion((value) => value + 1);
  }

  function answer(optionId: string) {
    if (!active) {
      return;
    }

    const updated = submitLiveResponse({
      sessionId: active.id,
      participantName,
      optionId,
    });

    if (!updated) {
      setFeedback("Could not submit live response.");
      return;
    }

    trackAnalyticsEvent({
      name: "live-class-response",
      metadata: {
        classCode,
        sessionId: active.id,
      },
    });
    setFeedback("Response submitted to live session.");
    setVersion((value) => value + 1);
  }

  function endLive() {
    if (!active) {
      return;
    }

    closeLiveSession(active.id);
    setFeedback("Live session closed.");
    setVersion((value) => value + 1);
  }

  if (!classCode) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
        Select or join a class to use live class mode.
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live Class Session</p>
        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          {active ? "LIVE" : "Idle"}
        </span>
      </div>

      <form onSubmit={onCreateSession} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teacher Launch</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={hostName}
            onChange={(event) => setHostName(event.target.value)}
            placeholder="Host name"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          />
          <input
            type="number"
            min={15}
            max={300}
            step={5}
            value={durationSec}
            onChange={(event) => setDurationSec(Number(event.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          />
        </div>
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Question prompt"
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={optionA} onChange={(event) => setOptionA(event.target.value)} placeholder="Option A" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs" />
          <input value={optionB} onChange={(event) => setOptionB(event.target.value)} placeholder="Option B" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs" />
          <input value={optionC} onChange={(event) => setOptionC(event.target.value)} placeholder="Option C" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs" />
          <input value={optionD} onChange={(event) => setOptionD(event.target.value)} placeholder="Option D" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600">Correct</label>
          <select value={correctIndex} onChange={(event) => setCorrectIndex(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
            <option value={0}>A</option>
            <option value={1}>B</option>
            <option value={2}>C</option>
            <option value={3}>D</option>
          </select>
          <button type="submit" className="rounded-md bg-slate-900 px-2 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700">
            Start Live Quiz
          </button>
        </div>
      </form>

      {active ? (
        <div className="space-y-2 rounded-lg border border-cyan-200 bg-cyan-50 p-3">
          <p className="text-sm font-semibold text-cyan-900">{active.prompt}</p>
          <input
            value={participantName}
            onChange={(event) => setParticipantName(event.target.value)}
            placeholder="Participant name"
            className="w-full rounded-lg border border-cyan-200 bg-white px-2 py-1.5 text-xs"
          />
          <div className="space-y-1">
            {active.options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => answer(option.id)}
                className="w-full rounded-lg border border-cyan-200 bg-white px-2 py-1.5 text-left text-xs text-cyan-900 transition hover:bg-cyan-100"
              >
                {option.text}
              </button>
            ))}
          </div>
          <div className="grid gap-1 rounded-lg border border-cyan-200 bg-white p-2 text-xs text-cyan-900 sm:grid-cols-3">
            <p>Responses {stats.responseCount}</p>
            <p>Accuracy %{stats.accuracy}</p>
            <button type="button" onClick={endLive} className="rounded-md border border-cyan-300 px-2 py-1 font-semibold transition hover:bg-cyan-100">
              Close Live Session
            </button>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <p className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700">{feedback}</p>
      ) : null}
    </section>
  );
}
