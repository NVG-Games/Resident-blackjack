/**
 * useLobby — room discovery via Supabase Realtime.
 *
 * Replaces the old PeerJS broker approach. The `rooms` table in Supabase
 * acts as the lobby: hosts INSERT their room, guests SELECT and subscribe
 * to realtime changes.
 *
 * Falls back gracefully when Supabase env vars are not configured
 * (e.g. local dev without Supabase): returns an empty room list and
 * announce/remove become no-ops.
 *
 * Table schema: see supabase/migrations/001_rooms.sql
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase.js';
import { getPresencePool } from '../engine/presence.js';

const SUPABASE_CONFIGURED =
  Boolean(import.meta.env.VITE_SUPABASE_URL) &&
  Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);

const WORDS = ['WOLF', 'BILE', 'GORE', 'BONE', 'VILE', 'DUSK', 'RUST', 'GRIM', 'CLAW', 'RUIN'];

export function generateRoomCode(seed) {
  if (seed !== undefined) {
    // Deterministic path — used for pre-seeded entries
    const si = ((seed ^ 0xf1e2d3c4) >>> 0) % WORDS.length;
    const sn = String((((seed * 0x6c62272e) >>> 0) % 90) + 10);
    return `${WORDS[si]}-${sn}`;
  }
  const w = WORDS[Math.floor(Math.random() * WORDS.length)];
  const n = String(Math.floor(Math.random() * 90) + 10);
  return `${w}-${n}`;
}

/**
 * useLobby
 *
 * Returns:
 *   rooms    — current list of open rooms [{ code, host_peer_id, host_name, host_tg_id, players }]
 *   loading  — true while fetching initial list
 *   error    — string | null
 *   announce(room) — host: insert/upsert room into Supabase
 *   remove(code)   — host: delete room from Supabase
 *   refresh()      — manually re-fetch room list
 */
export function useLobby() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  const fetchRooms = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) return;
    setLoading(true);
    setError(null);
    // Only show rooms created in the last 2 hours — stale rooms from crashed sessions are hidden
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data, error: err } = await supabase
      .from('rooms')
      .select('*')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setRooms(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;

    fetchRooms();

    // Subscribe to realtime changes on the rooms table
    const channel = supabase
      .channel('lobby-rooms')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          setRooms((prev) => {
            if (eventType === 'INSERT') {
              // Avoid duplicates
              if (prev.some((r) => r.code === newRow.code)) return prev;
              return [newRow, ...prev];
            }
            if (eventType === 'DELETE') {
              return prev.filter((r) => r.code !== oldRow.code);
            }
            if (eventType === 'UPDATE') {
              return prev.map((r) => (r.code === newRow.code ? newRow : r));
            }
            return prev;
          });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRooms]);

  /**
   * announce — host publishes a room.
   * room: { code, host_peer_id, host_name, host_tg_id?, players? }
   */
  const announce = useCallback(async (room) => {
    if (!SUPABASE_CONFIGURED) {
      // Degrade gracefully: add room to local list only
      setRooms((prev) => {
        if (prev.some((r) => r.code === room.code)) return prev;
        return [{ ...room, created_at: new Date().toISOString() }, ...prev];
      });
      return;
    }

    const { error: err } = await supabase.from('rooms').upsert({
      code: room.code,
      host_peer_id: room.host_peer_id,
      host_name: room.host_name ?? null,
      host_tg_id: room.host_tg_id ?? null,
      players: room.players ?? 1,
    });

    if (err) setError(err.message);
  }, []);

  /**
   * remove — host deletes their room (on leave or game start).
   * @param {string} code - room code
   * @param {string} [hostPeerId] - peer ID of the host; used to scope the DELETE so
   *   only the row belonging to this peer is affected (defence-in-depth alongside RLS).
   */
  const remove = useCallback(async (code, hostPeerId) => {
    if (!SUPABASE_CONFIGURED) {
      setRooms((prev) => prev.filter((r) => r.code !== code));
      return;
    }

    let query = supabase.from('rooms').delete().eq('code', code);
    // Narrow the DELETE to the host's own row so a stale or replayed request
    // cannot delete someone else's room even if RLS is misconfigured.
    if (hostPeerId) {
      query = query.eq('host_peer_id', hostPeerId);
    }

    const { error: err } = await query;
    if (err) setError(err.message);
  }, []);

  const refresh = fetchRooms;

  // Presence pool is stable for the session (day-seeded), computed once.
  // Real rooms always appear first; presence entries pad the rest.
  const _presenceRef = useRef(null);
  const displayRooms = useMemo(() => {
    if (_presenceRef.current === null) {
      _presenceRef.current = getPresencePool(0, 75);
    }
    const pool = _presenceRef.current;
    // Exclude pool entries whose code collides with a real room
    const realCodes = new Set(rooms.map((r) => r.code));
    const filtered = pool.filter((p) => !realCodes.has(p.code));
    return [...rooms, ...filtered];
  }, [rooms]);

  return { rooms, displayRooms, loading, error, announce, remove, refresh };
}
