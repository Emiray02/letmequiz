"use client";

/**
 * Cloud-backed helpers for the telc exam plan + per-day progress.
 * Backed by the `exam_plans` and `exam_plan_progress` Supabase tables
 * (see supabase/schema.sql §6 and §7).
 *
 * Distinct from the local `exam-plan-store.ts` (which holds the legacy
 * multi-provider settings the older planner uses).
 */

import { getBrowserSupabaseClient } from "./supabase-browser";
import type { CefrLevel } from "./exam-plan";

export type CloudExamPlan = {
  id: string;
  teacher_user_id: string;
  student_user_id: string;
  level: CefrLevel;
  exam_date: string;     // YYYY-MM-DD
  daily_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CloudExamPlanInput = {
  student_user_id: string;
  level: CefrLevel;
  exam_date: string;
  daily_minutes?: number;
  notes?: string;
};

export type PlanProgressRow = {
  plan_id: string;
  day_index: number;
  item_id: string;
  status: "done" | "skipped" | "weak";
  score: number | null;
  recorded_at: string;
};

function client() {
  const c = getBrowserSupabaseClient();
  if (!c) throw new Error("Supabase yapılandırılmamış.");
  return c;
}

async function getUserId(): Promise<string> {
  const { data, error } = await client().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Önce giriş yapmalısın.");
  return data.user.id;
}

/* ------------ Teacher side ----------------- */

export async function upsertExamPlanForStudent(input: CloudExamPlanInput): Promise<CloudExamPlan> {
  const teacherId = await getUserId();
  const row = {
    teacher_user_id: teacherId,
    student_user_id: input.student_user_id,
    level: input.level,
    exam_date: input.exam_date,
    daily_minutes: input.daily_minutes ?? 60,
    notes: input.notes ?? null,
  };
  const { data, error } = await client()
    .from("exam_plans")
    .upsert(row, { onConflict: "teacher_user_id,student_user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as CloudExamPlan;
}

export async function deleteCloudExamPlan(planId: string) {
  const { error } = await client().from("exam_plans").delete().eq("id", planId);
  if (error) throw error;
}

export async function listCloudExamPlansForTeacher(): Promise<CloudExamPlan[]> {
  const teacherId = await getUserId();
  const { data, error } = await client()
    .from("exam_plans")
    .select("*")
    .eq("teacher_user_id", teacherId)
    .order("exam_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CloudExamPlan[];
}

/* ------------ Student side ----------------- */

export async function getMyActiveCloudExamPlan(): Promise<CloudExamPlan | null> {
  const studentId = await getUserId();
  const { data, error } = await client()
    .from("exam_plans")
    .select("*")
    .eq("student_user_id", studentId)
    .order("exam_date", { ascending: true })
    .limit(1);
  if (error) throw error;
  return ((data ?? [])[0] as CloudExamPlan | undefined) ?? null;
}

/* ------------ Progress (student writes, teacher reads) ----- */

export async function listPlanProgress(planId: string): Promise<PlanProgressRow[]> {
  const { data, error } = await client()
    .from("exam_plan_progress")
    .select("*")
    .eq("plan_id", planId);
  if (error) throw error;
  return (data ?? []) as PlanProgressRow[];
}

export async function recordPlanItem(opts: {
  plan_id: string;
  day_index: number;
  item_id: string;
  status: "done" | "skipped" | "weak";
  score?: number | null;
}) {
  const row = {
    plan_id: opts.plan_id,
    day_index: opts.day_index,
    item_id: opts.item_id,
    status: opts.status,
    score: opts.score ?? null,
    recorded_at: new Date().toISOString(),
  };
  const { error } = await client()
    .from("exam_plan_progress")
    .upsert(row, { onConflict: "plan_id,day_index,item_id" });
  if (error) throw error;
}
