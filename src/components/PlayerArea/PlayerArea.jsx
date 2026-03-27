import { getHandTotal } from '../../engine/deck.js';
import { getEffectiveTarget } from '../../engine/trumpEngine.js';
import { ROUND_STATE } from '../../engine/gameState.js';
import Card from '../Card/Card.jsx';

export default function PlayerArea({ state, playerName = 'Clancy', hideCards = false, flipForGuest = false, isOpponent = false }) {
  const { playerHand, botHand, playerTableTrumps, botTableTrumps, playerHealth, botHealth, playerStood, botStood } = state;
  const target = getEffectiveTarget([...playerTableTrumps, ...botTableTrumps]);

  const hand = flipForGuest ? botHand : playerHand;
  const health = flipForGuest ? botHealth : playerHealth;
  const stood = flipForGuest ? botStood : playerStood;

  const total = getHandTotal(hand);
  const isBust = total > target;
  const isClose = total >= target - 2 && !isBust;

  const scoreColor = isBust ? '#e57373' : isClose ? '#ffd152' : '#e8d5b0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>

      {/* Cards */}
      {hideCards ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hand.map((_, idx) => (
            <Card key={idx} card={{ value: 0, suit: '?' }} faceDown={true} />
          ))}
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#5a5040', marginLeft: 10, fontStyle: 'italic' }}>
            hidden
          </div>
        </div>
      ) : (
        <FanHand
          cards={hand}
          scoreColor={scoreColor}
          total={total}
          target={target}
          isBust={isBust}
          stood={stood}
          isClose={isClose}
          showHoleValue={(card) => card.value}
        />
      )}

      {/* Identity row — below cards */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <HealthBar health={health} maxHealth={10} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 30, color: isOpponent ? '#e8d5b0' : '#ffd152', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {playerName}
          </div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#5a5040', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
            {isOpponent ? 'Opponent' : 'You'}
          </div>
        </div>
      </div>
    </div>
  );
}

// CARD_W matches Card component's width (~70px at normal size)
const CARD_W = 70;
const MAX_ROW_W = 300; // max px before we start overlapping
const SCORE_W = 80;    // reserved for score column

function FanHand({ cards, scoreColor, total, target, isBust, stood, isClose, showHoleValue }) {
  const n = cards.length;
  if (n === 0) return null;

  const normalStep = CARD_W + 8;
  const naturalW = CARD_W + (n - 1) * normalStep;
  const step = naturalW > MAX_ROW_W ? Math.max(18, (MAX_ROW_W - CARD_W) / Math.max(n - 1, 1)) : normalStep;
  const rowW = Math.min(CARD_W + (n - 1) * step, MAX_ROW_W);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        {/* Cards fan */}
        <div style={{ position: 'relative', width: rowW, height: 145, flexShrink: 0 }}>
          <div style={{ position: 'absolute', left: 0, bottom: 0, zIndex: 1 }}>
            <Card card={cards[0]} faceDown={false} isNew={true} />
          </div>
          {cards.slice(1).map((card, idx) => (
            <div key={card.id} style={{ position: 'absolute', left: (idx + 1) * step, bottom: 0, zIndex: idx + 2 }}>
              <Card card={card} faceDown={false} isNew={true} dealIndex={idx} highlight={isClose && idx === cards.length - 2} />
            </div>
          ))}
        </div>

        {/* Score — left-aligned with cards */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 52, lineHeight: 1, color: scoreColor }}>
            {total}
          </span>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#5a5040' }}>
            {isBust ? 'BUST' : `of ${target}`}
          </span>
          {stood && !isBust && (
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#5a5040', letterSpacing: '0.1em' }}>· stood</span>
          )}
        </div>
      </div>
    </div>
  );
}

function HealthBar({ health, maxHealth }) {
  const pips = Array.from({ length: maxHealth }, (_, i) => i < health);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 28, color: '#e8d5b0' }}>
        {health}<span style={{ fontSize: 18, color: '#5a5040' }}>/{maxHealth}</span>
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {pips.map((alive, i) => (
          <div key={i} style={{
            width: 11, height: 20, borderRadius: 1, transition: 'all 0.35s',
            background: alive ? '#ffd152' : 'transparent',
            border: alive ? 'none' : '1px solid #2a2218',
            boxShadow: alive ? '0 0 5px rgba(255,209,82,0.25)' : 'none',
          }} />
        ))}
      </div>
    </div>
  );
}
