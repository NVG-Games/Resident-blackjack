-- RE7 21 — Multiplayer lobby rooms table
--
-- Apply via: Supabase Dashboard → SQL Editor → paste and run
-- Or: supabase db push (if using supabase CLI)

create table if not exists public.rooms (
  code         text        primary key,
  host_peer_id text        not null,
  host_name    text,
  host_tg_id   bigint,
  players      int         not null default 1,
  created_at   timestamptz not null default now()
);

-- Auto-cleanup: remove rooms older than 2 hours to avoid stale entries
-- (requires pg_cron extension; skip if unavailable)
-- select cron.schedule('cleanup-rooms', '*/30 * * * *', $$
--   delete from public.rooms where created_at < now() - interval '2 hours';
-- $$);

alter table public.rooms enable row level security;

-- Anyone can read the room list (anonymous users browsing lobby)
create policy "anyone can read rooms"
  on public.rooms
  for select
  using (true);

-- Anyone can create a room (host announces their room)
create policy "anyone can insert rooms"
  on public.rooms
  for insert
  with check (true);

-- Anyone can delete a room (host removes their own room on leave)
-- In production you'd scope this to auth.uid() == host_tg_id
create policy "anyone can delete rooms"
  on public.rooms
  for delete
  using (true);

-- Enable Realtime for live lobby updates
alter publication supabase_realtime add table public.rooms;
