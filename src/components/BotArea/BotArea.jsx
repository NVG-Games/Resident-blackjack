import { getHandTotal } from '../../engine/deck.js';
import { getEffectiveTarget } from '../../engine/trumpEngine.js';
import { ROUND_STATE } from '../../engine/gameState.js';
import Card from '../Card/Card.jsx';

export default function BotArea({ state, isThinking, playerName = 'Hoffman', hideCards = false, hideHoleCard = false, flipForGuest = false, isActivePlayer = false }) {
  const { botHand, playerHand, playerTableTrumps, botTableTrumps, botHealth, playerHealth, botStood, playerStood, roundState } = state;
  const target = getEffectiveTarget([...playerTableTrumps, ...botTableTrumps]);

  const hand = flipForGuest ? playerHand : botHand;
  const health = flipForGuest ? playerHealth : botHealth;
  const stood = flipForGuest ? playerStood : botStood;

  const isRoundOver = roundState === ROUND_STATE.ROUND_OVER;
  const faceDownCard = hand[0];
  const showFaceDown = !hideHoleCard || isRoundOver;
  const total = getHandTotal(hand);
  const faceUpCards = hand.slice(1);
  const isBust = total > target;

  const scoreColor = isBust ? '#e57373' : '#e8d5b0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>

      {/* Identity row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 20, color: '#e8d5b0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {playerName}
          </div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#5a5040', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 1 }}>
            {isActivePlayer ? 'You' : 'Opponent'}
          </div>
        </div>
        <HealthBar health={health} maxHealth={10} />
      </div>

      {/* Cards row — fully hidden in hot-seat when it's not this player's turn */}
      {hideCards ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hand.map((_, idx) => (
            <Card key={idx} card={{ value: 0, suit: '?' }} faceDown={true} />
          ))}
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 22, color: '#3a3020', marginLeft: 10, fontStyle: 'italic' }}>
            hidden
          </div>
        </div>
      ) : hand.length > 0 ? (
        <BotFanHand
          cards={hand}
          faceDownCard={faceDownCard}
          faceUpCards={faceUpCards}
          showFaceDown={showFaceDown}
          scoreColor={scoreColor}
          total={total}
          target={target}
          isBust={isBust}
          stood={stood}
        />
      ) : null}
    </div>
  );
}

const CARD_W = 58;
const MAX_ROW_W = 260;

function BotFanHand({ cards, faceDownCard, faceUpCards, showFaceDown, scoreColor, total, target, isBust, stood }) {
  const n = cards.length;
  const normalStep = CARD_W + 8;
  const naturalW = CARD_W + (n - 1) * normalStep;
  const step = naturalW > MAX_ROW_W ? Math.max(18, (MAX_ROW_W - CARD_W) / Math.max(n - 1, 1)) : normalStep;
  const rowW = Math.min(CARD_W + (n - 1) * step, MAX_ROW_W);

  const displayScore = showFaceDown ? total : getHandTotal(faceUpCards);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ position: 'relative', width: rowW, height: 110, flexShrink: 0, marginTop: 16 }}>
        {faceDownCard && (
          <div style={{ position: 'absolute', left: 0, bottom: 0, zIndex: 1 }}>
            <Card card={faceDownCard} faceDown={!showFaceDown} isNew={true} size="sm" />
          </div>
        )}
        {faceUpCards.map((card, idx) => (
          <div key={card.id} style={{ position: 'absolute', left: (idx + 1) * step, bottom: 0, zIndex: idx + 2 }}>
            <Card card={card} faceDown={false} isNew={true} dealIndex={idx} size="sm" />
          </div>
        ))}
      </div>

      {/* Score — below cards */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 38, lineHeight: 1, color: scoreColor }}>
          {displayScore}
          {!showFaceDown && displayScore > 0 && (
            <span style={{ fontSize: 16, color: '#3a3428', marginLeft: 3 }}>+?</span>
          )}
        </span>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: isBust ? '#e57373' : '#5a5040' }}>
          {isBust ? 'BUST' : `of ${target}`}
        </span>
        {stood && !isBust && (
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: '#5a5040', letterSpacing: '0.1em' }}>· stood</span>
        )}
      </div>
      </div>
    </div>
  );
}

function HealthBar({ health, maxHealth }) {
  const pips = Array.from({ length: maxHealth }, (_, i) => i < health);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 20, color: '#e8d5b0' }}>
        {health}<span style={{ fontSize: 13, color: '#5a5040' }}>/{maxHealth}</span>
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        {pips.map((alive, i) => (
          <div key={i} style={{
            width: 9, height: 15, borderRadius: 1, transition: 'all 0.35s',
            background: alive ? '#e8d5b0' : 'transparent',
            border: alive ? 'none' : '1px solid #2a2218',
            boxShadow: alive ? '0 0 4px rgba(232,213,176,0.2)' : 'none',
          }} />
        ))}
      </div>
    </div>
  );
}
