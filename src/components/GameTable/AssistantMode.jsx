/**
 * AssistantMode — Real-life game tracker.
 */
import { useState, useMemo } from 'react';
import { getHandTotal } from '../../engine/deck.js';
import { getEffectiveTarget } from '../../engine/trumpEngine.js';
import { TRUMP_TYPES, TRUMP_DEFINITIONS } from '../../engine/constants.js';
import { TRUMP_IMAGES } from '../../engine/trumpImages.js';

const ALL_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const TABLE_TRUMP_OPTIONS = [
  TRUMP_TYPES.DEAD_SILENCE, TRUMP_TYPES.HARVEST,
  TRUMP_TYPES.GO_FOR_17, TRUMP_TYPES.GO_FOR_24, TRUMP_TYPES.GO_FOR_27,
  TRUMP_TYPES.TWENTY_ONE_UP, TRUMP_TYPES.SHIELD, TRUMP_TYPES.SHIELD_PLUS,
  TRUMP_TYPES.ONE_UP, TRUMP_TYPES.TWO_UP, TRUMP_TYPES.TWO_UP_PLUS,
  TRUMP_TYPES.DESTROY, TRUMP_TYPES.DESTROY_PLUS, TRUMP_TYPES.DESTROY_PLUS_PLUS,
  TRUMP_TYPES.MIND_SHIFT, TRUMP_TYPES.OBLIVION, TRUMP_TYPES.DESPERATION,
  TRUMP_TYPES.HAPPINESS, TRUMP_TYPES.CONJURE, TRUMP_TYPES.ESCAPE,
];

function bustProb(total, usedValues, target) {
  const remaining = ALL_VALUES.filter(v => !usedValues.includes(v));
  if (remaining.length === 0) return 0;
  return remaining.filter(v => total + v > target).length / remaining.length;
}

function getAdvice(total, usedValues, target, phase) {
  const prob = bustProb(total, usedValues, target);
  if (total > target) return { label: 'BUST', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
  if (total === target) return { label: 'STAND — PERFECT', color: '#ffd152', bg: 'rgba(255,209,82,0.12)' };
  const threshold = phase === 'FINGER' ? 16 : phase === 'SHOCK' ? 17 : 18;
  const pct = Math.round(prob * 100);
  if (prob > 0.6) return { label: 'STAND', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', reason: `${pct}% bust risk` };
  if (total >= threshold && prob > 0.4) return { label: 'STAND', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', reason: `${pct}% bust risk` };
  return { label: 'HIT', color: '#ffd152', bg: 'rgba(255,209,82,0.1)', reason: `${pct}% bust risk` };
}

const PHASES = ['FINGER', 'SHOCK', 'SAW'];
const PHASE_COLORS = { FINGER: '#c0784a', SHOCK: '#6a8ab0', SAW: '#b09060' };

export default function AssistantMode({ onBack }) {
  const [phase, setPhase] = useState('FINGER');
  const [clancyCards, setClancyCards] = useState([]);
  const [hoffmanCards, setHoffmanCards] = useState([]);
  const [clancyTableTrumps, setClancyTableTrumps] = useState([]);
  const [hoffmanTableTrumps, setHoffmanTableTrumps] = useState([]);
  const [showTrumpPicker, setShowTrumpPicker] = useState(null);
  const [clancyHealth, setClancyHealth] = useState(10);
  const [hoffmanHealth, setHoffmanHealth] = useState(10);
  // Round history: array of { winner: 'clancy'|'hoffman'|'draw', clancyTotal, hoffmanTotal, target }
  const [history, setHistory] = useState([]);

  const usedValues = useMemo(
    () => [...clancyCards, ...hoffmanCards].map(c => c.value),
    [clancyCards, hoffmanCards],
  );

  const target = getEffectiveTarget([...clancyTableTrumps, ...hoffmanTableTrumps]);
  const clancyTotal = getHandTotal(clancyCards);
  const hoffmanTotal = getHandTotal(hoffmanCards);
  const remaining = ALL_VALUES.filter(v => !usedValues.includes(v));

  const addCard = (player, value) => {
    if (usedValues.includes(value)) return;
    const card = { value, id: `${player}-${value}` };
    if (player === 'clancy') setClancyCards(c => [...c, card]);
    else setHoffmanCards(c => [...c, card]);
  };
  const removeCard = (player, value) => {
    if (player === 'clancy') setClancyCards(c => c.filter(x => x.value !== value));
    else setHoffmanCards(c => c.filter(x => x.value !== value));
  };
  const addTableTrump = (player, type) => {
    const entry = { type, id: `${player}-${type}-${Date.now()}` };
    if (player === 'clancy') setClancyTableTrumps(t => [...t, entry]);
    else setHoffmanTableTrumps(t => [...t, entry]);
    setShowTrumpPicker(null);
  };

  const addRandomTrump = (player) => {
    const currentTypes = (player === 'clancy' ? clancyTableTrumps : hoffmanTableTrumps).map(t => t.type);
    const available = TABLE_TRUMP_OPTIONS.filter(t => !currentTypes.includes(t));
    if (available.length === 0) return;
    const type = available[Math.floor(Math.random() * available.length)];
    addTableTrump(player, type);
  };
  const removeTableTrump = (player, id) => {
    if (player === 'clancy') setClancyTableTrumps(t => t.filter(x => x.id !== id));
    else setHoffmanTableTrumps(t => t.filter(x => x.id !== id));
  };
  const recordRound = (winner) => {
    setHistory(h => [...h, { winner, clancyTotal, hoffmanTotal, target, round: h.length + 1 }]);
    setClancyCards([]); setHoffmanCards([]);
    setClancyTableTrumps([]); setHoffmanTableTrumps([]);
    // apply health damage
    if (winner === 'clancy') setHoffmanHealth(h => Math.max(0, h - 1));
    else if (winner === 'hoffman') setClancyHealth(h => Math.max(0, h - 1));
    else { setClancyHealth(h => Math.max(0, h - 1)); setHoffmanHealth(h => Math.max(0, h - 1)); }
  };

  const resetRound = () => {
    setClancyCards([]); setHoffmanCards([]);
    setClancyTableTrumps([]); setHoffmanTableTrumps([]);
  };

  const resetAll = () => {
    setHistory([]);
    setClancyHealth(10); setHoffmanHealth(10);
    setClancyCards([]); setHoffmanCards([]);
    setClancyTableTrumps([]); setHoffmanTableTrumps([]);
  };

  const clancyWins = history.filter(r => r.winner === 'clancy').length;
  const hoffmanWins = history.filter(r => r.winner === 'hoffman').length;
  const draws = history.filter(r => r.winner === 'draw').length;

  return (
    <div style={{ minHeight: '100dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', background: '#080604', fontFamily: 'Cinzel, serif', color: '#e8d5b0' }}>

      {/* ── TOP BAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'max(8px, env(safe-area-inset-top)) 20px 8px', borderBottom: '1px solid rgba(255,209,82,0.15)', background: 'rgba(0,0,0,0.6)' }}>
        <button onClick={onBack} style={{ fontSize: 18, color: '#e8d5b0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cinzel, serif' }}>
          ← Menu
        </button>

        {/* Phase */}
        <div style={{ display: 'flex', gap: 8 }}>
          {PHASES.map(p => (
            <button key={p} onClick={() => setPhase(p)} style={{
              fontFamily: 'Cinzel, serif', fontSize: 18, padding: '10px 20px', borderRadius: 4,
              textTransform: 'uppercase', cursor: 'pointer',
              background: phase === p ? PHASE_COLORS[p] + '40' : 'rgba(255,255,255,0.04)',
              border: `2px solid ${phase === p ? PHASE_COLORS[p] : 'rgba(255,255,255,0.08)'}`,
              color: phase === p ? '#ffffff' : '#7a6a50',
              fontWeight: phase === p ? 700 : 400,
            }}>{p}</button>
          ))}
        </div>

        {/* Target */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#c4b9a8', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Cinzel, serif' }}>Target</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#ffd152', lineHeight: 1, fontFamily: 'Cinzel, serif' }}>{target}</div>
        </div>
      </div>

      {/* ── REMAINING CARDS IN DECK ── */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,209,82,0.1)', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(0,0,0,0.3)' }}>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#e8d5b0', flexShrink: 0, fontWeight: 700 }}>Deck:</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ALL_VALUES.map(v => {
            const used = usedValues.includes(v);
            return (
              <div key={v} style={{
                width: 42, height: 42, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 18,
                background: used ? 'rgba(0,0,0,0.3)' : 'rgba(255,209,82,0.15)',
                border: `2px solid ${used ? 'rgba(255,255,255,0.06)' : 'rgba(255,209,82,0.45)'}`,
                color: used ? '#4a4030' : '#ffd152',
                textDecoration: used ? 'line-through' : 'none',
              }}>{v}</div>
            );
          })}
        </div>
      </div>

      {/* ── TWO COLUMNS ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'auto' }}>
        <PlayerPanel
          name="Clancy" nameColor="#ffd152"
          cards={clancyCards} total={clancyTotal} target={target}
          bustPct={bustProb(clancyTotal, usedValues, target)}
          advice={getAdvice(clancyTotal, usedValues, target, phase)}
          usedValues={usedValues} health={clancyHealth} tableTrumps={clancyTableTrumps}
          onAdd={v => addCard('clancy', v)} onRemove={v => removeCard('clancy', v)}
          onAddTrump={() => setShowTrumpPicker('clancy')}
          onRemoveTrump={id => removeTableTrump('clancy', id)}
          onHealthChange={setClancyHealth}
          onRandomTrump={() => addRandomTrump('clancy')}
        />
        <PlayerPanel
          name="Hoffman" nameColor="#e8d5b0"
          cards={hoffmanCards} total={hoffmanTotal} target={target}
          bustPct={bustProb(hoffmanTotal, usedValues, target)}
          advice={getAdvice(hoffmanTotal, usedValues, target, phase)}
          usedValues={usedValues} health={hoffmanHealth} tableTrumps={hoffmanTableTrumps}
          onAdd={v => addCard('hoffman', v)} onRemove={v => removeCard('hoffman', v)}
          onAddTrump={() => setShowTrumpPicker('hoffman')}
          onRemoveTrump={id => removeTableTrump('hoffman', id)}
          onHealthChange={setHoffmanHealth}
          onRandomTrump={() => addRandomTrump('hoffman')}
        />
      </div>

      {/* ── SCORE HISTORY ── */}
      <div style={{ borderTop: '1px solid rgba(255,209,82,0.1)', background: 'rgba(0,0,0,0.4)' }}>
        {/* Win counts */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '12px 20px', borderBottom: '1px solid rgba(255,209,82,0.06)' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#ffd152', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Clancy</div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 52, fontWeight: 900, color: '#ffd152', lineHeight: 1 }}>{clancyWins}</div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#7a6a50', marginTop: 4 }}>rounds won</div>
          </div>
          <div style={{ textAlign: 'center', padding: '0 24px' }}>
            {draws > 0 && <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#c4b9a8' }}>{draws} draw{draws > 1 ? 's' : ''}</div>}
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 20, color: '#5a5040' }}>vs</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#e8d5b0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Hoffman</div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 52, fontWeight: 900, color: '#e8d5b0', lineHeight: 1 }}>{hoffmanWins}</div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#7a6a50', marginTop: 4 }}>rounds won</div>
          </div>
        </div>

        {/* Round result buttons */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,209,82,0.08)' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#c4b9a8', marginBottom: 10, textAlign: 'center' }}>Who won this round?</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => recordRound('clancy')} style={{ flex: 1, fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 700, padding: '14px 8px', borderRadius: 4, cursor: 'pointer', background: 'rgba(255,209,82,0.12)', border: '2px solid rgba(255,209,82,0.5)', color: '#ffd152' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,209,82,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,209,82,0.12)'}>
              Clancy
            </button>
            <button onClick={() => recordRound('draw')} style={{ fontFamily: 'Cinzel, serif', fontSize: 16, padding: '14px 16px', borderRadius: 4, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.12)', color: '#c4b9a8' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
              Draw
            </button>
            <button onClick={() => recordRound('hoffman')} style={{ flex: 1, fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 700, padding: '14px 8px', borderRadius: 4, cursor: 'pointer', background: 'rgba(232,213,176,0.1)', border: '2px solid rgba(232,213,176,0.35)', color: '#e8d5b0' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,213,176,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(232,213,176,0.1)'}>
              Hoffman
            </button>
            <button onClick={resetRound} style={{ fontFamily: 'Cinzel, serif', fontSize: 15, padding: '14px 14px', borderRadius: 4, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#7a6a50' }}
              onMouseEnter={e => e.currentTarget.style.color = '#c4b9a8'}
              onMouseLeave={e => e.currentTarget.style.color = '#7a6a50'}>
              ↺ Clear
            </button>
          </div>
        </div>

        {/* Round log */}
        {history.length > 0 && (
          <div style={{ padding: '10px 16px 14px', borderTop: '1px solid rgba(255,209,82,0.06)', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {history.map((r, i) => (
              <div key={i} style={{
                fontFamily: 'Cinzel, serif', fontSize: 15, padding: '5px 12px', borderRadius: 3,
                background: r.winner === 'clancy' ? 'rgba(255,209,82,0.12)' : r.winner === 'hoffman' ? 'rgba(232,213,176,0.08)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${r.winner === 'clancy' ? 'rgba(255,209,82,0.3)' : r.winner === 'hoffman' ? 'rgba(232,213,176,0.2)' : 'rgba(255,255,255,0.1)'}`,
                color: r.winner === 'clancy' ? '#ffd152' : r.winner === 'hoffman' ? '#e8d5b0' : '#c4b9a8',
              }}>
                R{r.round} · {r.winner === 'draw' ? 'Draw' : r.winner === 'clancy' ? 'Clancy' : 'Hoffman'} ({r.clancyTotal}–{r.hoffmanTotal})
              </div>
            ))}
            <button onClick={resetAll} style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#7a6a50', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '5px 12px', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.color = '#e57373'}
              onMouseLeave={e => e.currentTarget.style.color = '#7a6a50'}>
              Reset all
            </button>
          </div>
        )}
      </div>

      {showTrumpPicker && (
        <TrumpPickerModal onSelect={type => addTableTrump(showTrumpPicker, type)} onClose={() => setShowTrumpPicker(null)} />
      )}
    </div>
  );
}

function PlayerPanel({ name, nameColor, cards, total, target, bustPct, advice, usedValues, health, tableTrumps, onAdd, onRemove, onAddTrump, onRemoveTrump, onHealthChange, onRandomTrump }) {
  const myValues = cards.map(c => c.value);
  const isBust = total > target;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRight: '1px solid rgba(255,209,82,0.06)' }}>

      {/* ── NAME + HEALTH ── */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,209,82,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)' }}>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 24, fontWeight: 700, textTransform: 'uppercase', color: nameColor }}>{name}</span>
        <HealthStepper health={health} onChange={onHealthChange} />
      </div>

      {/* ── SCORE + ADVICE ── */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,209,82,0.08)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 72, lineHeight: 1, color: isBust ? '#ef4444' : total >= target - 2 ? '#ffd152' : '#e8d5b0' }}>
            {total}
          </span>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: 24, color: '#c4b9a8', fontWeight: 700 }}>/ {target}</span>
          {isBust && <span style={{ fontFamily: 'Cinzel, serif', fontSize: 20, color: '#ef4444', fontWeight: 700, letterSpacing: '0.1em' }}>BUST</span>}
        </div>

        {/* Advice */}
        {total > 0 && (
          <div style={{ padding: '12px 16px', borderRadius: 4, background: advice.bg, border: `2px solid ${advice.color}66`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: advice.color }}>{advice.label}</span>
            {advice.reason && <span style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: advice.color, opacity: 0.8 }}>{advice.reason}</span>}
          </div>
        )}

        {/* Bust bar */}
        {total > 0 && !isBust && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Cinzel, serif', fontSize: 15, color: '#c4b9a8', marginBottom: 5 }}>
              <span>Bust risk</span><span style={{ fontWeight: 700 }}>{Math.round(bustPct * 100)}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.07)' }}>
              <div style={{ height: '100%', borderRadius: 4, transition: 'width 0.3s', width: `${bustPct * 100}%`, background: bustPct > 0.6 ? '#ef4444' : bustPct > 0.35 ? '#ffd152' : '#4ade80' }} />
            </div>
          </div>
        )}
      </div>

      {/* ── CARD GRID ── */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,209,82,0.08)' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 15, color: '#c4b9a8', marginBottom: 10 }}>Tap card to add · tap again to remove</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {ALL_VALUES.map(v => {
            const takenByOther = usedValues.includes(v) && !myValues.includes(v);
            const inHand = myValues.includes(v);
            return (
              <button key={v}
                onClick={() => { if (takenByOther) return; if (inHand) onRemove(v); else onAdd(v); }}
                disabled={takenByOther}
                style={{
                  fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 20, padding: '12px 0', borderRadius: 4,
                  cursor: takenByOther ? 'not-allowed' : 'pointer', transition: 'all 0.12s',
                  background: takenByOther ? 'transparent' : inHand ? 'rgba(255,209,82,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${takenByOther ? 'rgba(255,255,255,0.04)' : inHand ? 'rgba(255,209,82,0.6)' : 'rgba(255,209,82,0.14)'}`,
                  color: takenByOther ? '#3a3028' : inHand ? '#ffd152' : '#c4b9a8',
                }}>
                {v}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TABLE TRUMPS ── */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#e8d5b0', fontWeight: 700 }}>Trumps on table</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onRandomTrump} style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#ffd152', background: 'rgba(255,209,82,0.1)', border: '1px solid rgba(255,209,82,0.35)', borderRadius: 4, padding: '6px 14px', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,209,82,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,209,82,0.1)'; }}>
              🎲 Random
            </button>
            <button onClick={onAddTrump} style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#c4b9a8', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '6px 14px', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.color = '#ffd152'}
              onMouseLeave={e => e.currentTarget.style.color = '#c4b9a8'}>
              + Pick
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          {tableTrumps.length === 0 && <span style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#7a6a50', fontStyle: 'italic' }}>— none added —</span>}
          {tableTrumps.map(t => {
            const def = TRUMP_DEFINITIONS[t.type] || {};
            return (
              <TrumpRow key={t.id} def={def} trumpType={t.type} onRemove={() => onRemoveTrump(t.id)} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TrumpRow({ def, trumpType, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ borderRadius: 4, border: '1px solid rgba(255,209,82,0.25)', background: 'rgba(255,209,82,0.06)', overflow: 'hidden' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}>
        {TRUMP_IMAGES[trumpType]
          ? <img src={TRUMP_IMAGES[trumpType]} alt="" style={{ width: 24, height: 30, objectFit: 'contain', flexShrink: 0 }} />
          : <span style={{ fontSize: 20, flexShrink: 0 }}>{def.icon || '?'}</span>}
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 17, color: '#ffd152', fontWeight: 700, flex: 1 }}>{def.name || trumpType}</span>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#7a6a50' }}>{expanded ? '▲' : '▼ what it does'}</span>
        <button onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#5a5040', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', marginLeft: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={e => e.currentTarget.style.color = '#5a5040'}>
          ✕
        </button>
      </div>
      {/* Expanded description */}
      {expanded && (
        <div style={{ padding: '10px 14px 12px', borderTop: '1px solid rgba(255,209,82,0.12)', background: 'rgba(0,0,0,0.3)' }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#c4b9a8', lineHeight: 1.6, margin: 0 }}>
            {def.description || 'No description available.'}
          </p>
        </div>
      )}
    </div>
  );
}

function HealthStepper({ health, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={() => onChange(Math.max(0, health - 1))}
        style={{ width: 36, height: 36, borderRadius: 4, fontWeight: 700, fontSize: 20, color: '#e57373', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(229,115,115,0.1)', border: '1px solid rgba(229,115,115,0.3)', fontFamily: 'Cinzel, serif' }}>−</button>
      <span style={{ fontFamily: 'Cinzel, serif', fontSize: 20, minWidth: 52, textAlign: 'center', color: '#e8d5b0' }}>
        {health}<span style={{ fontSize: 16, color: '#7a6a50' }}>/10</span>
      </span>
      <button onClick={() => onChange(Math.min(10, health + 1))}
        style={{ width: 36, height: 36, borderRadius: 4, fontWeight: 700, fontSize: 20, color: '#a8c090', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(168,192,144,0.1)', border: '1px solid rgba(168,192,144,0.3)', fontFamily: 'Cinzel, serif' }}>+</button>
    </div>
  );
}

function TrumpPickerModal({ onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.9)' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 520, borderRadius: '12px 12px 0 0', padding: '20px 20px 32px', maxHeight: '80vh', overflowY: 'auto', background: '#0e0c09', border: '1px solid rgba(255,209,82,0.15)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 20, textAlign: 'center', color: '#e8d5b0', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Add Trump</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {TABLE_TRUMP_OPTIONS.map(type => {
            const def = TRUMP_DEFINITIONS[type] || {};
            return (
              <button key={type} onClick={() => onSelect(type)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 4, textAlign: 'left', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,209,82,0.08)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,209,82,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,209,82,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,209,82,0.08)'; }}>
                {TRUMP_IMAGES[type]
                  ? <img src={TRUMP_IMAGES[type]} alt="" style={{ width: 34, height: 42, objectFit: 'contain', flexShrink: 0 }} />
                  : <span style={{ fontSize: 24, flexShrink: 0 }}>{def.icon || '?'}</span>}
                <div>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#e8d5b0' }}>{def.name || type}</div>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#7a6a50', fontStyle: 'italic', marginTop: 3 }}>
                    {def.description?.slice(0, 55)}{def.description?.length > 55 ? '…' : ''}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={onClose} style={{ marginTop: 16, width: '100%', fontFamily: 'Cinzel, serif', fontSize: 16, color: '#7a6a50', padding: '12px', background: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}
          onMouseEnter={e => e.currentTarget.style.color = '#e8d5b0'}
          onMouseLeave={e => e.currentTarget.style.color = '#7a6a50'}>
          Cancel
        </button>
      </div>
    </div>
  );
}
