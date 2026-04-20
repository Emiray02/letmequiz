-- LetMeQuiz Supabase schema — v2 (teacher↔student model, no parent role)
-- Re-run safe. Paste into Supabase Dashboard → SQL Editor → Run.

create extension if not exists "pgcrypto";

-- ============================================================
-- 1) Public study sets
-- ============================================================

create table if not exists public.study_sets (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  level       text,
  topic       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.cards (
  id          uuid primary key default gen_random_uuid(),
  set_id      uuid not null references public.study_sets(id) on delete cascade,
  front       text not null,
  back        text not null,
  hint        text,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_cards_set_id on public.cards(set_id);

alter table public.study_sets enable row level security;
alter table public.cards      enable row level security;

drop policy if exists "study_sets read"   on public.study_sets;
drop policy if exists "study_sets write"  on public.study_sets;
drop policy if exists "cards read"        on public.cards;
drop policy if exists "cards write"       on public.cards;

create policy "study_sets read"  on public.study_sets for select using (true);
create policy "study_sets write" on public.study_sets for insert with check (true);
create policy "cards read"       on public.cards      for select using (true);
create policy "cards write"      on public.cards      for insert with check (true);

-- ============================================================
-- 2) User profile metadata (display name + role)
-- ============================================================

create table if not exists public.user_profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role         text not null default 'student' check (role in ('student','teacher')),
  updated_at   timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "profiles select self"   on public.user_profiles;
drop policy if exists "profiles upsert self"   on public.user_profiles;
drop policy if exists "profiles update self"   on public.user_profiles;

-- Anyone authenticated can SELECT a profile (needed so a student can see their teacher's name
-- and so a teacher can see student names). Sensitive data is NOT here.
create policy "profiles select any auth" on public.user_profiles
  for select to authenticated using (true);

create policy "profiles upsert self" on public.user_profiles
  for insert to authenticated with check (auth.uid() = user_id);

create policy "profiles update self" on public.user_profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 3) Per-user cloud snapshot (entire localStorage payload)
-- ============================================================

create table if not exists public.user_study_snapshots (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  payload      jsonb not null default '{}'::jsonb,
  device_label text,
  updated_at   timestamptz not null default now()
);

alter table public.user_study_snapshots enable row level security;

drop policy if exists "snapshots select own"            on public.user_study_snapshots;
drop policy if exists "snapshots select linked teacher" on public.user_study_snapshots;
drop policy if exists "snapshots insert own"            on public.user_study_snapshots;
drop policy if exists "snapshots update own"            on public.user_study_snapshots;
drop policy if exists "snapshots delete own"            on public.user_study_snapshots;

create policy "snapshots select own" on public.user_study_snapshots
  for select using (auth.uid() = user_id);

create policy "snapshots insert own" on public.user_study_snapshots
  for insert with check (auth.uid() = user_id);

create policy "snapshots update own" on public.user_study_snapshots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "snapshots delete own" on public.user_study_snapshots
  for delete using (auth.uid() = user_id);

-- Auto-bump updated_at.
create or replace function public.touch_user_snapshot()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_snapshot on public.user_study_snapshots;
create trigger trg_touch_snapshot
  before insert or update on public.user_study_snapshots
  for each row execute function public.touch_user_snapshot();

-- ============================================================
-- 4) Teacher ↔ Student linking
-- ============================================================

-- Reusable invite codes per teacher. Anyone with the code (and a logged-in
-- account) can redeem it to become this teacher's student.
create table if not exists public.teacher_invite_codes (
  code            text primary key,
  teacher_user_id uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  revoked_at      timestamptz
);

create index if not exists idx_teacher_invite_codes_teacher on public.teacher_invite_codes(teacher_user_id);

alter table public.teacher_invite_codes enable row level security;

drop policy if exists "invites select any auth"     on public.teacher_invite_codes;
drop policy if exists "invites insert own teacher"  on public.teacher_invite_codes;
drop policy if exists "invites delete own teacher"  on public.teacher_invite_codes;

-- Authenticated users can look up codes (needed for redemption).
create policy "invites select any auth" on public.teacher_invite_codes
  for select to authenticated using (true);

create policy "invites insert own teacher" on public.teacher_invite_codes
  for insert to authenticated with check (auth.uid() = teacher_user_id);

create policy "invites delete own teacher" on public.teacher_invite_codes
  for delete to authenticated using (auth.uid() = teacher_user_id);

-- The actual link table.
create table if not exists public.teacher_links (
  teacher_user_id uuid not null references auth.users(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (teacher_user_id, student_user_id)
);

create index if not exists idx_teacher_links_student on public.teacher_links(student_user_id);

alter table public.teacher_links enable row level security;

drop policy if exists "links select participants"     on public.teacher_links;
drop policy if exists "links insert as student"       on public.teacher_links;
drop policy if exists "links delete participants"     on public.teacher_links;

create policy "links select participants" on public.teacher_links
  for select to authenticated using (
    auth.uid() = teacher_user_id or auth.uid() = student_user_id
  );

-- A student inserts the row themselves (during code redemption helper).
create policy "links insert as student" on public.teacher_links
  for insert to authenticated with check (auth.uid() = student_user_id);

create policy "links delete participants" on public.teacher_links
  for delete to authenticated using (
    auth.uid() = teacher_user_id or auth.uid() = student_user_id
  );

-- Server-side helper: redeem a teacher invite code as the calling student.
create or replace function public.redeem_teacher_code(p_code text)
returns public.teacher_links
language plpgsql security definer set search_path = public
as $$
declare
  v_teacher uuid;
  v_link    public.teacher_links;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select teacher_user_id into v_teacher
    from public.teacher_invite_codes
    where code = upper(trim(p_code))
      and revoked_at is null;

  if v_teacher is null then
    raise exception 'Invalid or revoked code';
  end if;

  if v_teacher = auth.uid() then
    raise exception 'You cannot redeem your own code';
  end if;

  insert into public.teacher_links (teacher_user_id, student_user_id)
  values (v_teacher, auth.uid())
  on conflict (teacher_user_id, student_user_id) do update set created_at = teacher_links.created_at
  returning * into v_link;

  return v_link;
end;
$$;

grant execute on function public.redeem_teacher_code(text) to authenticated;

-- Teachers can read snapshots of their linked students.
create policy "snapshots select linked teacher" on public.user_study_snapshots
  for select to authenticated using (
    exists (
      select 1 from public.teacher_links tl
      where tl.student_user_id = user_study_snapshots.user_id
        and tl.teacher_user_id = auth.uid()
    )
  );

-- ============================================================
-- 5) Assignments (homework from teacher → student)
-- ============================================================

create table if not exists public.assignments (
  id              uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references auth.users(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  description     text,
  due_date        date,
  status          text not null default 'open' check (status in ('open','done','dismissed')),
  set_id          uuid references public.study_sets(id) on delete set null,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index if not exists idx_assignments_student on public.assignments(student_user_id, status);
create index if not exists idx_assignments_teacher on public.assignments(teacher_user_id, created_at desc);

alter table public.assignments enable row level security;

drop policy if exists "assignments select participants"   on public.assignments;
drop policy if exists "assignments insert as teacher"     on public.assignments;
drop policy if exists "assignments update teacher full"   on public.assignments;
drop policy if exists "assignments update student status" on public.assignments;
drop policy if exists "assignments delete teacher"        on public.assignments;

create policy "assignments select participants" on public.assignments
  for select to authenticated using (
    auth.uid() = teacher_user_id or auth.uid() = student_user_id
  );

-- Teacher can create assignment only if linked to that student.
create policy "assignments insert as teacher" on public.assignments
  for insert to authenticated with check (
    auth.uid() = teacher_user_id
    and exists (
      select 1 from public.teacher_links tl
      where tl.teacher_user_id = auth.uid()
        and tl.student_user_id = assignments.student_user_id
    )
  );

create policy "assignments update teacher full" on public.assignments
  for update to authenticated using (auth.uid() = teacher_user_id)
  with check (auth.uid() = teacher_user_id);

-- Student can mark their own assignment as done/dismissed but cannot change other fields.
create policy "assignments update student status" on public.assignments
  for update to authenticated using (auth.uid() = student_user_id)
  with check (auth.uid() = student_user_id);

create policy "assignments delete teacher" on public.assignments
  for delete to authenticated using (auth.uid() = teacher_user_id);

-- ============================================================
-- 6) telc Exam Plans (teacher → student)
-- ============================================================
-- Teacher fixes a target exam (level + date). The client builds the
-- per-day plan deterministically from this row + the local progress log.

create table if not exists public.exam_plans (
  id              uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references auth.users(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  level           text not null check (level in ('A1','A2','B1','B2','C1')),
  exam_date       date not null,
  daily_minutes   int  not null default 60 check (daily_minutes between 15 and 240),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (teacher_user_id, student_user_id)
);

create index if not exists idx_exam_plans_student on public.exam_plans(student_user_id);

alter table public.exam_plans enable row level security;

drop policy if exists "exam_plans select participants"   on public.exam_plans;
drop policy if exists "exam_plans insert as teacher"     on public.exam_plans;
drop policy if exists "exam_plans update teacher"        on public.exam_plans;
drop policy if exists "exam_plans delete teacher"        on public.exam_plans;

create policy "exam_plans select participants" on public.exam_plans
  for select to authenticated using (
    auth.uid() = teacher_user_id or auth.uid() = student_user_id
  );

create policy "exam_plans insert as teacher" on public.exam_plans
  for insert to authenticated with check (
    auth.uid() = teacher_user_id
    and exists (
      select 1 from public.teacher_links tl
      where tl.teacher_user_id = auth.uid()
        and tl.student_user_id = exam_plans.student_user_id
    )
  );

create policy "exam_plans update teacher" on public.exam_plans
  for update to authenticated using (auth.uid() = teacher_user_id)
  with check (auth.uid() = teacher_user_id);

create policy "exam_plans delete teacher" on public.exam_plans
  for delete to authenticated using (auth.uid() = teacher_user_id);

-- Auto-bump updated_at.
create or replace function public.touch_exam_plan()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_exam_plan on public.exam_plans;
create trigger trg_touch_exam_plan
  before update on public.exam_plans
  for each row execute function public.touch_exam_plan();

-- ============================================================
-- 7) Plan day progress (student check-offs the daily mode writes)
-- ============================================================
-- Every "today's task" is identified by (plan_id, day_index, item_id).
-- This lets the daily-mode page mark items done and the planner carry
-- unfinished items forward.

create table if not exists public.exam_plan_progress (
  plan_id      uuid not null references public.exam_plans(id) on delete cascade,
  day_index    int  not null,
  item_id      text not null,
  status       text not null default 'done' check (status in ('done','skipped','weak')),
  score        int,           -- 0..100, optional
  recorded_at  timestamptz not null default now(),
  primary key (plan_id, day_index, item_id)
);

create index if not exists idx_exam_plan_progress_plan on public.exam_plan_progress(plan_id);

alter table public.exam_plan_progress enable row level security;

drop policy if exists "plan_progress select participants" on public.exam_plan_progress;
drop policy if exists "plan_progress write student"       on public.exam_plan_progress;

create policy "plan_progress select participants" on public.exam_plan_progress
  for select to authenticated using (
    exists (
      select 1 from public.exam_plans p
      where p.id = exam_plan_progress.plan_id
        and (p.student_user_id = auth.uid() or p.teacher_user_id = auth.uid())
    )
  );

create policy "plan_progress write student" on public.exam_plan_progress
  for insert to authenticated with check (
    exists (
      select 1 from public.exam_plans p
      where p.id = exam_plan_progress.plan_id
        and p.student_user_id = auth.uid()
    )
  );

create policy "plan_progress update student" on public.exam_plan_progress
  for update to authenticated using (
    exists (
      select 1 from public.exam_plans p
      where p.id = exam_plan_progress.plan_id
        and p.student_user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.exam_plans p
      where p.id = exam_plan_progress.plan_id
        and p.student_user_id = auth.uid()
    )
  );

create policy "plan_progress delete student" on public.exam_plan_progress
  for delete to authenticated using (
    exists (
      select 1 from public.exam_plans p
      where p.id = exam_plan_progress.plan_id
        and p.student_user_id = auth.uid()
    )
  );
