/**
 * presence.js — peer presence tracking for the lobby.
 *
 * Monitors active sessions reported by Supabase Realtime and supplements
 * the room list when the live count is low, so the lobby always feels populated.
 * Sessions are seeded from a deterministic pool derived from the current UTC day
 * so the same "players" appear consistently across refreshes.
 */

import { generateRoomCode } from '../hooks/useLobby.js';

// Rotates every UTC day — different mix each day, same within a session
const DAY_SEED = Math.floor(Date.now() / 86_400_000);

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _FIRST = [
  'Mia','Ethan','Lucas','Jack','Zoe','Marcus','Vera','Cole','Iris','Damon',
  'Nora','Felix','Lena','Rook','Sasha','Diesel','Ada','Viktor','Hana','Rex',
  'Elara','Finn','Tara','Vale','Orion','Quinn','Beck','Lyra','Storm','Jace',
];
const _TAGS = [
  'shadow','ghost','blood','rust','grim','vile','dusk','ruin','bone','claw',
  'wolf','bile','gore','wraith','ash','void','reaper','iron','grave','thorn',
];

function _buildNick(rand) {
  const style = Math.floor(rand() * 3);
  if (style === 0) {
    return _FIRST[Math.floor(rand() * _FIRST.length)];
  }
  if (style === 1) {
    const tag = _TAGS[Math.floor(rand() * _TAGS.length)];
    const n = Math.floor(rand() * 90) + 10;
    return `${tag.charAt(0).toUpperCase() + tag.slice(1)}_${n}`;
  }
  const first = _FIRST[Math.floor(rand() * _FIRST.length)];
  const n = Math.floor(rand() * 99) + 1;
  return `${first}${n}`;
}

// Stable fake peer id — looks like a real PeerJS id
function _buildPeerId(rand) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) {
    id += chars[Math.floor(rand() * chars.length)];
  }
  return id;
}

/**
 * Generates a stable list of presence entries for the current day.
 * Each entry has the same shape as a Supabase `rooms` row.
 *
 * @param {number} realCount — number of currently live real rooms
 * @param {number} [target=75] — total desired lobby size
 * @returns {Array}
 */
export function getPresencePool(realCount, target = 75) {
  const need = Math.max(0, target - realCount);
  if (need === 0) return [];

  // Total pool size randomised per day between 50 and 100
  const rand = mulberry32(DAY_SEED ^ 0xdeadbeef);
  const poolSize = 50 + Math.floor(rand() * 51); // 50–100
  const count = Math.min(need, poolSize);

  const now = Date.now();
  const entries = [];

  for (let i = 0; i < count; i++) {
    const r = mulberry32(DAY_SEED ^ (i * 0x9e3779b9));
    const rnd = () => r();
    // Stagger created_at within the last 90 minutes so rooms look organic
    const ageMs = Math.floor(rnd() * 90 * 60 * 1000);
    entries.push({
      code: generateRoomCode(DAY_SEED ^ i),
      host_name: _buildNick(rnd),
      host_peer_id: _buildPeerId(rnd),
      players: 1,
      created_at: new Date(now - ageMs).toISOString(),
      // Internal marker — never rendered in UI, used only by join handler
      _shadow: true,
    });
  }

  return entries;
}
