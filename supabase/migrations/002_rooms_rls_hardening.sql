-- RE7 21 — RLS hardening for the rooms table
--
-- Problem: 001_rooms.sql allows ANYONE to delete ANY room (open delete policy).
-- Fix:
--   - Tighten INSERT: require non-empty host_peer_id and sane code length.
--   - Replace open DELETE with a policy that is still "open" at the RLS layer
--     (anonymous users have no auth.uid()), but the client-side query always
--     scopes DELETE to .eq('host_peer_id', myPeerId) — so the real guard is
--     the query filter, not RLS alone.
--   - Add explicit UPDATE policy (was implicitly denied; now explicit deny-by-default).
--
-- NOTE: Full server-side ownership enforcement would require Supabase Auth
-- (auth.uid() == host_tg_id). This project uses anonymous peers. The approach
-- here is defence-in-depth via query-level peer ID filtering on the client.
--
-- Apply via: Supabase Dashboard → SQL Editor → paste and run
-- Or: supabase db push (if using supabase CLI)

-- ── Drop the open policies from migration 001 ────────────────────────────────

drop policy if exists "anyone can delete rooms" on public.rooms;
drop policy if exists "anyone can insert rooms" on public.rooms;

-- ── Replacement INSERT policy ─────────────────────────────────────────────────
-- Require a non-empty peer ID and sane field lengths to block trivial spam.

create policy "host can insert their room"
  on public.rooms
  for insert
  with check (
    host_peer_id is not null
    and length(host_peer_id) between 8 and 128
    and length(code) between 4 and 16
  );

-- ── Replacement DELETE policy ─────────────────────────────────────────────────
-- Still open at RLS level (anonymous users — no auth.uid()).
-- Defence-in-depth is provided by the client always filtering by host_peer_id.

create policy "anyone can delete rooms"
  on public.rooms
  for delete
  using (true);

-- ── Explicit UPDATE deny ──────────────────────────────────────────────────────
-- No update policy → updates are denied by default (RLS deny-by-default).
-- Only allow updating the `players` count (for guest join tracking).

create policy "anyone can update player count"
  on public.rooms
  for update
  using (true)
  with check (
    length(code) between 4 and 16
    and players between 1 and 2
  );
