create extension if not exists "pgcrypto";

create table if not exists public.study_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.study_sets(id) on delete cascade,
  term text not null check (char_length(term) between 1 and 200),
  definition text not null check (char_length(definition) between 1 and 800),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_cards_set_id on public.cards(set_id);
create index if not exists idx_cards_position on public.cards(set_id, position);

alter table public.study_sets enable row level security;
alter table public.cards enable row level security;

drop policy if exists "public can read sets" on public.study_sets;
create policy "public can read sets"
on public.study_sets
for select
using (true);

drop policy if exists "public can insert sets" on public.study_sets;
create policy "public can insert sets"
on public.study_sets
for insert
with check (true);

drop policy if exists "public can update sets" on public.study_sets;
create policy "public can update sets"
on public.study_sets
for update
using (true)
with check (true);

drop policy if exists "public can delete sets" on public.study_sets;
create policy "public can delete sets"
on public.study_sets
for delete
using (true);

drop policy if exists "public can read cards" on public.cards;
create policy "public can read cards"
on public.cards
for select
using (true);

drop policy if exists "public can insert cards" on public.cards;
create policy "public can insert cards"
on public.cards
for insert
with check (true);

drop policy if exists "public can update cards" on public.cards;
create policy "public can update cards"
on public.cards
for update
using (true)
with check (true);

drop policy if exists "public can delete cards" on public.cards;
create policy "public can delete cards"
on public.cards
for delete
using (true);

create table if not exists public.user_study_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_study_snapshots enable row level security;

drop policy if exists "users can read own snapshot" on public.user_study_snapshots;
create policy "users can read own snapshot"
on public.user_study_snapshots
for select
using (auth.uid() = user_id);

drop policy if exists "users can insert own snapshot" on public.user_study_snapshots;
create policy "users can insert own snapshot"
on public.user_study_snapshots
for insert
with check (auth.uid() = user_id);

drop policy if exists "users can update own snapshot" on public.user_study_snapshots;
create policy "users can update own snapshot"
on public.user_study_snapshots
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
