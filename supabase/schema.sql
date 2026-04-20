-- LetMeQuiz Supabase schema
-- Paste this entire file into Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run; uses "if not exists" / "drop policy if exists" everywhere.

create extension if not exists "pgcrypto";

-- ============================================================
-- 1) Public study sets (shared catalog, no login required)
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
-- 2) Per-user cloud snapshot (entire localStorage payload)
-- ============================================================
-- Single jsonb row per authenticated user. Mirror of the device's
-- localStorage namespace ("lmq.*" + "letmequiz.*"). On login we
-- pull this and merge into localStorage; on changes we push it back.

create table if not exists public.user_study_snapshots (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  payload      jsonb not null default '{}'::jsonb,
  device_label text,
  updated_at   timestamptz not null default now()
);

alter table public.user_study_snapshots enable row level security;

drop policy if exists "snapshots select own" on public.user_study_snapshots;
drop policy if exists "snapshots insert own" on public.user_study_snapshots;
drop policy if exists "snapshots update own" on public.user_study_snapshots;
drop policy if exists "snapshots delete own" on public.user_study_snapshots;

create policy "snapshots select own" on public.user_study_snapshots
  for select using (auth.uid() = user_id);

create policy "snapshots insert own" on public.user_study_snapshots
  for insert with check (auth.uid() = user_id);

create policy "snapshots update own" on public.user_study_snapshots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "snapshots delete own" on public.user_study_snapshots
  for delete using (auth.uid() = user_id);

-- Auto-bump updated_at on every write.
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
