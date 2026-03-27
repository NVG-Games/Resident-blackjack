/**
 * AssistantMode — Real-life game tracker.
 *
 * You play with physical cards. This screen tracks:
 *  • Cards drawn by each player (tap to add/remove)
 *  • Active trump cards on the table
 *  • Current score, bust risk, and a hit/stand recommendation
 */
import { useState, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import { useRef } from 'react';
import { getHandTotal, isBust } from '../../engine/deck.js';
import { getEffectiveTarget } from '../../engine/trumpEngine.js';
import { TRUMP_TYPES, TRUMP_DEFINITIONS, PERMANENT_TRUMPS } from '../../engine/constants.js';
import { TRUMP_IMAGES } from '../../engine/trumpImages.js';

const ALL_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// Cards that are meaningful as table-trumps for a real game
const TABLE_TRUMP_OPTIONS = [
  TRUMP_TYPES.DEAD_SILENCE,
  TRUMP_TYPES.HARVEST,
  TRUMP_TYPES.GO_FOR_17,
  TRUMP_TYPES.GO_FOR_24,
  TRUMP_TYPES.GO_FOR_27,
  TRUMP_TYPES.TWENTY_ONE_UP,
  TRUMP_TYPES.SHIELD,
  TRUMP_TYPES.SHIELD_PLUS,
  TRUMP_TYPES.ONE_UP,
  TRUMP_TYPES.TWO_UP,
  TRUMP_TYPES.TWO_UP_PLUS,
  TRUMP_TYPES.DESTROY,
  TRUMP_TYPES.DESTROY_PLUS,
  TRUMP_TYPES.DESTROY_PLUS_PLUS,
  TRUMP_TYPES.MIND_SHIFT,
  TRUMP_TYPES.OBLIVION,
  TRUMP_TYPES.DESPERATION,
  TRUMP_TYPES.HAPPINESS,
  TRUMP_TYPES.CONJURE,
  TRUMP_TYPES.ESCAPE,
];

// Bust probability: fraction of remaining deck that would bust you
function bustProb(total, usedValues, target) {
  const remaining = ALL_VALUES.filter(v => !usedValues.includes(v));
  if (remaining.length === 0) return 0;
  const busting = remaining.filter(v => total + v > target);
  return busting.length / remaining.length;
}

// Recommendation
function getAdvice(myTotal, opponentTotal, usedValues, target, phase) {
  const prob = bustProb(myTotal, usedValues, target);
  const remaining = ALL_VALUES.filter(v => !usedValues.includes(v));

  if (myTotal > target) return { label: 'BUST', color: '#ef4444', emoji: '💀' };
  if (myTotal === target) return { label: 'STAND — perfect!', color: '#fbbf24', emoji: '✦' };

  const standThreshold = phase === 'FINGER' ? 16 : phase === 'SHOCK' ? 17 : 18;

  if (myTotal >= standThreshold && prob > 0.5) {
    return { label: 'STAND', color: '#94a3b8', emoji: '✋', reason: `${Math.round(prob * 100)}% bust risk` };
  }
  if (prob < 0.35 && myTotal < target - 2) {
    return { label: 'HIT', color: '#fbbf24', emoji: '👆', reason: `${Math.round(prob * 100)}% bust risk` };
  }
  if (myTotal >= standThreshold) {
    return { label: 'STAND', color: '#94a3b8', emoji: '✋', reason: `${myTotal} ≥ ${standThreshold} threshold` };
  }
  if (prob > 0.6) {
    return { label: 'STAND', color: '#94a3b8', emoji: '✋', reason: `${Math.round(prob * 100)}% bust risk — risky` };
  }
  return { label: 'HIT', color: '#fbbf24', emoji: '👆', reason: `${Math.round(prob * 100)}% bust risk` };
}

const PHASES = ['FINGER', 'SHOCK', 'SAW'];
const PHASE_LABELS = { FINGER: 'Finger', SHOCK: 'Shock', SAW: 'Saw' };
const PHASE_COLORS = { FINGER: '#8b0000', SHOCK: '#1a3a8b', SAW: '#7c3a00' };

export default function AssistantMode({ onBack }) {
  const [phase, setPhase] = useState('FINGER');
  const [activePlayer, setActivePlayer] = useState('clancy'); // who we're tracking
  const [clancyCards, setClancyCards] = useState([]);
  const [hoffmanCards, setHoffmanCards] = useState([]);
  const [clancyTableTrumps, setClancyTableTrumps] = useState([]);
  const [hoffmanTableTrumps, setHoffmanTableTrumps] = useState([]);
  const [showTrumpPicker, setShowTrumpPicker] = useState(null); // 'clancy' | 'hoffman' | null
  const [clancyHealth, setClancyHealth] = useState(10);
  const [hoffmanHealth, setHoffmanHealth] = useState(10);

  const containerRef = useRef(null);

  // All cards currently on table (used to know which remain in the deck)
  const usedValues = useMemo(
    () => [...clancyCards, ...hoffmanCards].map(c => c.value),
    [clancyCards, hoffmanCards],
  );

  const fakeTableTrumps = [...clancyTableTrumps, ...hoffmanTableTrumps];
  const target = getEffectiveTarget(fakeTableTrumps);

  const clancyTotal = getHandTotal(clancyCards);
  const hoffmanTotal = getHandTotal(hoffmanCards);

  const clancyAdvice = getAdvice(clancyTotal, hoffmanTotal, usedValues, target, phase);
  const hoffmanAdvice = getAdvice(hoffmanTotal, clancyTotal, usedValues, target, phase);

  const clancyBust = clancyTotal > target;
  const hoffmanBust = hoffmanTotal > target;

  // Available cards to add for a player (cards not yet used by anyone)
  function availableFor(currentCards) {
    const usedByOthers = usedValues.filter(
      v => !currentCards.map(c => c.value).includes(v),
    );
    return ALL_VALUES.filter(v => !usedByOthers.includes(v) || currentCards.some(c => c.value === v));
  }

  const addCard = (player, value) => {
    const used = usedValues;
    // Each value only once in the whole deck
    if (used.includes(value)) return;
    const card = { value, id: `${player}-${value}` };
    if (player === 'clancy') setClancyCards(c => [...c, card]);
    else setHoffmanCards(c => [...c, card]);
  };

  const removeCard = (player, value) => {
    if (player === 'clancy') setClancyCards(c => c.filter(x => x.value !== value));
    else setHoffmanCards(c => c.filter(x => x.value !== value));
  };

  const addTableTrump = (player, type) => {
    const entry = { type, id: `${player}-${type}-${Date.now()}`, owner: player };
    if (player === 'clancy') setClancyTableTrumps(t => [...t, entry]);
    else setHoffmanTableTrumps(t => [...t, entry]);
    setShowTrumpPicker(null);
  };

  const removeTableTrump = (player, id) => {
    if (player === 'clancy') setClancyTableTrumps(t => t.filter(x => x.id !== id));
    else setHoffmanTableTrumps(t => t.filter(x => x.id !== id));
  };

  const resetRound = () => {
    setClancyCards([]);
    setHoffmanCards([]);
    setClancyTableTrumps([]);
    setHoffmanTableTrumps([]);
  };

  const remaining = ALL_VALUES.filter(v => !usedValues.includes(v));
  const bustProb1 = bustProb(clancyTotal, usedValues, target);
  const bustProb2 = bustProb(hoffmanTotal, usedValues, target);

  return (
    <div
      ref={containerRef}
      className="min-h-screen flex flex-col"
      style={{
        background: 'radial-gradient(ellipse at 50% 20%, #1a0a04 0%, #080402 100%)',
        fontFamily: "'IM Fell English', serif",
        color: '#f0e2c0',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-red-900/20">
        <button
          onClick={onBack}
          className="font-cinzel text-xs text-stone-500 hover:text-stone-300 active:scale-95 transition-all uppercase tracking-widest"
        >
          ← Menu
        </button>
        <div className="font-cinzel text-sm font-bold text-center tracking-widest uppercase" style={{ color: '#c0392b' }}>
          Real Game
        </div>
        {/* Phase selector */}
        <div className="flex gap-1">
          {PHASES.map(p => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              className="font-cinzel text-xs px-2 py-1 rounded uppercase tracking-wider transition-all active:scale-95"
              style={{
                background: phase === p ? PHASE_COLORS[p] : 'rgba(0,0,0,0.3)',
                border: `1px solid ${phase === p ? PHASE_COLORS[p] : '#3a1a08'}`,
                color: phase === p ? '#f0e2c0' : '#6b5a4a',
              }}
            >
              {PHASE_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Target + remaining deck */}
      <div className="flex items-center justify-center gap-4 py-2 border-b border-stone-900/50">
        <span className="text-stone-500 text-xs font-fell italic">Target</span>
        <span className="font-cinzel text-2xl font-bold text-amber-300">{target}</span>
        <span className="w-px h-5 bg-stone-800" />
        <span className="text-stone-500 text-xs font-fell italic">Deck</span>
        <span className="font-cinzel text-lg text-stone-300">{remaining.length} left</span>
        <span className="text-stone-600 text-xs font-fell">
          [{remaining.join(', ')}]
        </span>
      </div>

      {/* Two player columns */}
      <div className="flex-1 grid grid-cols-2 gap-0 divide-x divide-stone-900/50 overflow-auto">
        {/* CLANCY */}
        <PlayerPanel
          name="Clancy"
          nameColor="#fbbf24"
          cards={clancyCards}
          total={clancyTotal}
          target={target}
          isBust={clancyBust}
          bustPct={bustProb1}
          advice={clancyAdvice}
          usedValues={usedValues}
          health={clancyHealth}
          tableTrumps={clancyTableTrumps}
          onAdd={v => addCard('clancy', v)}
          onRemove={v => removeCard('clancy', v)}
          onAddTrump={() => setShowTrumpPicker('clancy')}
          onRemoveTrump={id => removeTableTrump('clancy', id)}
          onHealthChange={setClancyHealth}
        />
        {/* HOFFMAN */}
        <PlayerPanel
          name="Hoffman"
          nameColor="#f87171"
          cards={hoffmanCards}
          total={hoffmanTotal}
          target={target}
          isBust={hoffmanBust}
          bustPct={bustProb2}
          advice={hoffmanAdvice}
          usedValues={usedValues}
          health={hoffmanHealth}
          tableTrumps={hoffmanTableTrumps}
          onAdd={v => addCard('hoffman', v)}
          onRemove={v => removeCard('hoffman', v)}
          onAddTrump={() => setShowTrumpPicker('hoffman')}
          onRemoveTrump={id => removeTableTrump('hoffman', id)}
          onHealthChange={setHoffmanHealth}
        />
      </div>

      {/* Reset round button */}
      <div className="flex justify-center gap-3 px-4 py-3 border-t border-stone-900/40">
        <button
          onClick={resetRound}
          className="font-cinzel text-xs uppercase tracking-widest px-6 py-3 rounded border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 active:scale-95 transition-all"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          ↺ New Round
        </button>
      </div>

      {/* Trump picker modal */}
      {showTrumpPicker && (
        <TrumpPickerModal
          player={showTrumpPicker}
          onSelect={type => addTableTrump(showTrumpPicker, type)}
          onClose={() => setShowTrumpPicker(null)}
        />
      )}
    </div>
  );
}

// ── Player panel ─────────────────────────────────────────────────────────────

function PlayerPanel({
  name, nameColor, cards, total, target, isBust, bustPct, advice,
  usedValues, health, tableTrumps,
  onAdd, onRemove, onAddTrump, onRemoveTrump, onHealthChange,
}) {
  // A card is unavailable to add if it's used by someone else (not in this player's own hand)
  const myValues = cards.map(c => c.value);

  return (
    <div className="flex flex-col p-2 gap-2 min-h-0">
      {/* Name + health */}
      <div className="flex items-center justify-between">
        <span className="font-cinzel text-sm font-bold tracking-widest uppercase" style={{ color: nameColor }}>
          {name}
        </span>
        <HealthStepper health={health} onChange={onHealthChange} />
      </div>

      {/* Score display */}
      <div className="flex items-baseline gap-2">
        <span
          className="font-cinzel text-4xl font-black transition-colors"
          style={{ color: isBust ? '#ef4444' : total >= target - 2 ? '#fbbf24' : '#f0e2c0' }}
        >
          {total}
        </span>
        <span className="text-stone-600 font-fell text-sm">/ {target}</span>
        {isBust && <span className="text-red-500 text-xs font-cinzel animate-pulse">BUST</span>}
      </div>

      {/* Advice pill */}
      {total > 0 && (
        <div
          className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-cinzel uppercase tracking-wider"
          style={{ background: `${advice.color}22`, border: `1px solid ${advice.color}66`, color: advice.color }}
        >
          <span>{advice.emoji}</span>
          <span className="font-bold">{advice.label}</span>
          {advice.reason && <span className="opacity-60 normal-case font-fell italic">— {advice.reason}</span>}
        </div>
      )}

      {/* Bust % bar */}
      {total > 0 && !isBust && (
        <div className="space-y-0.5">
          <div className="flex justify-between text-xs text-stone-600 font-fell">
            <span>Bust risk</span>
            <span>{Math.round(bustPct * 100)}%</span>
          </div>
          <div className="h-1.5 rounded bg-stone-900 overflow-hidden">
            <div
              className="h-full rounded transition-all duration-300"
              style={{
                width: `${bustPct * 100}%`,
                background: bustPct > 0.6 ? '#ef4444' : bustPct > 0.35 ? '#f59e0b' : '#22c55e',
              }}
            />
          </div>
        </div>
      )}

      {/* Add / remove card grid — highlighted cards are in hand, tap to toggle */}
      <div>
        <div className="text-xs text-stone-600 font-cinzel uppercase tracking-widest mb-1">Add card</div>
        <div className="grid grid-cols-4 gap-1">
          {ALL_VALUES.map(v => {
            // Disabled if taken by the OTHER player (not this one)
            const takenByOther = usedValues.includes(v) && !myValues.includes(v);
            // Already in this player's hand — show as selected, not disabled
            const inHand = myValues.includes(v);
            return (
              <button
                key={v}
                onClick={() => {
                  if (takenByOther) return;
                  if (inHand) onRemove(v); // tap again to remove
                  else onAdd(v);
                }}
                disabled={takenByOther}
                className="font-cinzel font-bold text-sm py-2 rounded active:scale-90 transition-all disabled:opacity-20"
                style={{
                  background: takenByOther
                    ? 'rgba(0,0,0,0.2)'
                    : inHand
                      ? 'rgba(139,0,0,0.35)'
                      : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${takenByOther ? '#2a1a08' : inHand ? '#cc2222' : '#5a3a18'}`,
                  color: takenByOther ? '#4a3a28' : inHand ? '#ff9999' : '#f0e2c0',
                  boxShadow: inHand ? '0 0 8px rgba(180,0,0,0.4)' : 'none',
                }}
                title={inHand ? 'Tap to remove' : takenByOther ? 'Taken by opponent' : 'Add card'}
              >
                {v}{inHand ? ' ✓' : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table trumps */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-stone-600 font-cinzel uppercase tracking-widest">Table</span>
          <button
            onClick={onAddTrump}
            className="text-xs font-cinzel text-stone-500 hover:text-amber-400 active:scale-90 transition-all px-1"
          >
            + Trump
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {tableTrumps.map(t => {
            const def = TRUMP_DEFINITIONS[t.type] || {};
            return (
              <button
                key={t.id}
                onClick={() => onRemoveTrump(t.id)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded active:scale-90 transition-all"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}
                title={def.description}
              >
                {TRUMP_IMAGES[t.type] ? (
                  <img src={TRUMP_IMAGES[t.type]} alt={def.name} className="w-4 h-5 object-contain" />
                ) : (
                  <span>{def.icon || '?'}</span>
                )}
                <span className="font-cinzel" style={{ fontSize: '10px' }}>{def.name || t.type}</span>
                <span className="opacity-40">✕</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Health stepper ────────────────────────────────────────────────────────────

function HealthStepper({ health, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(Math.max(0, health - 1))}
        className="w-6 h-6 rounded font-cinzel font-bold text-sm text-red-400 active:scale-90 transition-all flex items-center justify-center"
        style={{ background: 'rgba(139,0,0,0.2)', border: '1px solid #8b0000' }}
      >
        −
      </button>
      <span className="font-cinzel text-sm w-8 text-center text-stone-300">
        {health}<span className="text-stone-600 text-xs">/10</span>
      </span>
      <button
        onClick={() => onChange(Math.min(10, health + 1))}
        className="w-6 h-6 rounded font-cinzel font-bold text-sm text-green-600 active:scale-90 transition-all flex items-center justify-center"
        style={{ background: 'rgba(0,80,0,0.2)', border: '1px solid #1a4a1a' }}
      >
        +
      </button>
    </div>
  );
}

// ── Trump picker modal ────────────────────────────────────────────────────────

function TrumpPickerModal({ player, onSelect, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 pb-6 max-h-[70vh] overflow-y-auto"
        style={{ background: '#1a0c07', border: '1px solid #5c2a0e' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="font-cinzel text-sm text-center text-amber-300 uppercase tracking-widest mb-3">
          Add Trump — {player === 'clancy' ? 'Clancy' : 'Hoffman'}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {TABLE_TRUMP_OPTIONS.map(type => {
            const def = TRUMP_DEFINITIONS[type] || {};
            return (
              <button
                key={type}
                onClick={() => onSelect(type)}
                className="flex items-center gap-2 p-2 rounded text-left active:scale-95 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #3a1a08' }}
              >
                {TRUMP_IMAGES[type] ? (
                  <img src={TRUMP_IMAGES[type]} alt={def.name} className="w-7 h-9 object-contain flex-shrink-0" />
                ) : (
                  <span className="text-lg flex-shrink-0">{def.icon || '?'}</span>
                )}
                <div>
                  <div className="font-cinzel text-xs text-amber-200 leading-tight">{def.name || type}</div>
                  <div className="text-stone-600 font-fell italic leading-tight" style={{ fontSize: '10px' }}>
                    {def.description?.slice(0, 50)}{def.description?.length > 50 ? '…' : ''}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="mt-3 w-full font-cinzel text-xs text-stone-600 hover:text-stone-400 uppercase tracking-widest py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
