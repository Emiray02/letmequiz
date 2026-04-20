"use client";

/**
 * Cloud-backed helpers for the teacher↔student model.
 * All calls require an authenticated Supabase session.
 */

import { getBrowserSupabaseClient } from "./supabase-browser";
import type { SyncPayload } from "./cloud-sync";

export type TeacherInviteCode = {
  code: string;
  teacher_user_id: string;
  created_at: string;
  revoked_at: string | null;
};

export type LinkedStudent = {
  student_user_id: string;
  display_name: string | null;
  linked_at: string;
  snapshot_updated_at: string | null;
};

export type LinkedTeacher = {
  teacher_user_id: string;
  display_name: string | null;
  linked_at: string;
};

export type Assignment = {
  id: string;
  teacher_user_id: string;
  student_user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: "open" | "done" | "dismissed";
  set_id: string | null;
  created_at: string;
  completed_at: string | null;
};

export type AssignmentInput = {
  student_user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  set_id?: string | null;
};

function client() {
  const c = getBrowserSupabaseClient();
  if (!c) throw new Error("Supabase yapılandırılmamış. Lütfen .env değişkenlerini ekleyin.");
  return c;
}

async function getUserId(): Promise<string> {
  const { data, error } = await client().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Önce giriş yapmalısın.");
  return data.user.id;
}

/* ---------------- Profile (display name + role) ----------------- */

export async function upsertMyProfile(input: { display_name?: string; role?: "student" | "teacher" }) {
  const userId = await getUserId();
  const { error } = await client()
    .from("user_profiles")
    .upsert(
      { user_id: userId, ...input },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}

export async function getMyProfile(): Promise<{ user_id: string; display_name: string | null; role: "student" | "teacher" } | null> {
  const userId = await getUserId();
  const { data, error } = await client()
    .from("user_profiles")
    .select("user_id, display_name, role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/* ---------------- Invite codes (teacher side) ------------------- */

function genCode(): string {
  // 6-char alphanumeric, no ambiguous chars
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i += 1) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export async function createInviteCode(): Promise<TeacherInviteCode> {
  const userId = await getUserId();
  // Try a few times to dodge collisions.
  for (let i = 0; i < 5; i += 1) {
    const code = genCode();
    const { data, error } = await client()
      .from("teacher_invite_codes")
      .insert({ code, teacher_user_id: userId })
      .select("*")
      .single();
    if (!error && data) return data as TeacherInviteCode;
    if (error && !/duplicate/i.test(error.message)) throw error;
  }
  throw new Error("Davet kodu üretilemedi, tekrar deneyin.");
}

export async function listMyInviteCodes(): Promise<TeacherInviteCode[]> {
  const userId = await getUserId();
  const { data, error } = await client()
    .from("teacher_invite_codes")
    .select("*")
    .eq("teacher_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TeacherInviteCode[];
}

export async function deleteInviteCode(code: string) {
  const { error } = await client().from("teacher_invite_codes").delete().eq("code", code);
  if (error) throw error;
}

/* ---------------- Links ----------------------------------------- */

export async function redeemTeacherCode(code: string): Promise<void> {
  const c = client();
  const { error } = await c.rpc("redeem_teacher_code", { p_code: code });
  if (error) throw error;
}

export async function listMyStudents(): Promise<LinkedStudent[]> {
  const userId = await getUserId();
  const c = client();
  const { data: links, error } = await c
    .from("teacher_links")
    .select("student_user_id, created_at")
    .eq("teacher_user_id", userId);
  if (error) throw error;
  if (!links || links.length === 0) return [];

  const ids = links.map((l) => l.student_user_id);
  const [profiles, snaps] = await Promise.all([
    c.from("user_profiles").select("user_id, display_name").in("user_id", ids),
    c.from("user_study_snapshots").select("user_id, updated_at").in("user_id", ids),
  ]);

  const nameMap = new Map<string, string | null>();
  (profiles.data ?? []).forEach((p) => nameMap.set(p.user_id, p.display_name));
  const snapMap = new Map<string, string>();
  (snaps.data ?? []).forEach((s) => snapMap.set(s.user_id, s.updated_at));

  return links.map((l) => ({
    student_user_id: l.student_user_id,
    display_name: nameMap.get(l.student_user_id) ?? null,
    linked_at: l.created_at,
    snapshot_updated_at: snapMap.get(l.student_user_id) ?? null,
  }));
}

export async function listMyTeachers(): Promise<LinkedTeacher[]> {
  const userId = await getUserId();
  const c = client();
  const { data: links, error } = await c
    .from("teacher_links")
    .select("teacher_user_id, created_at")
    .eq("student_user_id", userId);
  if (error) throw error;
  if (!links || links.length === 0) return [];

  const ids = links.map((l) => l.teacher_user_id);
  const { data: profiles } = await c
    .from("user_profiles")
    .select("user_id, display_name")
    .in("user_id", ids);

  const nameMap = new Map<string, string | null>();
  (profiles ?? []).forEach((p) => nameMap.set(p.user_id, p.display_name));

  return links.map((l) => ({
    teacher_user_id: l.teacher_user_id,
    display_name: nameMap.get(l.teacher_user_id) ?? null,
    linked_at: l.created_at,
  }));
}

export async function unlinkStudent(student_user_id: string) {
  const userId = await getUserId();
  const { error } = await client()
    .from("teacher_links")
    .delete()
    .eq("teacher_user_id", userId)
    .eq("student_user_id", student_user_id);
  if (error) throw error;
}

export async function unlinkTeacher(teacher_user_id: string) {
  const userId = await getUserId();
  const { error } = await client()
    .from("teacher_links")
    .delete()
    .eq("teacher_user_id", teacher_user_id)
    .eq("student_user_id", userId);
  if (error) throw error;
}

/* ---------------- Assignments ----------------------------------- */

export async function createAssignment(input: AssignmentInput): Promise<Assignment> {
  const userId = await getUserId();
  const { data, error } = await client()
    .from("assignments")
    .insert({
      teacher_user_id: userId,
      student_user_id: input.student_user_id,
      title: input.title,
      description: input.description ?? null,
      due_date: input.due_date ?? null,
      set_id: input.set_id ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Assignment;
}

export async function listAssignmentsForTeacher(): Promise<Assignment[]> {
  const userId = await getUserId();
  const { data, error } = await client()
    .from("assignments")
    .select("*")
    .eq("teacher_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Assignment[];
}

export async function listAssignmentsForStudent(): Promise<Assignment[]> {
  const userId = await getUserId();
  const { data, error } = await client()
    .from("assignments")
    .select("*")
    .eq("student_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Assignment[];
}

export async function updateAssignmentStatus(id: string, status: Assignment["status"]) {
  const { error } = await client()
    .from("assignments")
    .update({
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAssignment(id: string) {
  const { error } = await client().from("assignments").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Student snapshot (teacher view) --------------- */

export async function fetchStudentSnapshot(student_user_id: string): Promise<{
  payload: SyncPayload;
  updated_at: string | null;
} | null> {
  const { data, error } = await client()
    .from("user_study_snapshots")
    .select("payload, updated_at")
    .eq("user_id", student_user_id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    payload: (data.payload ?? {}) as SyncPayload,
    updated_at: data.updated_at,
  };
}
