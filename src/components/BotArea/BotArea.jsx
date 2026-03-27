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
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 30, color: '#e8d5b0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {playerName}
          </div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#5a5040', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
            {isActivePlayer ? 'You' : 'Opponent'}
          </div>
        </div>
        <HealthBar health={health} maxHealth={10} />
      </div>

      {/* Thinking */}
      {isThinking && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8a7d68', fontFamily: 'Cinzel, serif', fontSize: 15, letterSpacing: '0.08em' }}>
          <span style={{ fontSize: 18 }}>considers</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {[0, 1, 2].map(i => (
              <div key={i} className="animate-bounce" style={{ width: 4, height: 4, borderRadius: '50%', background: '#8a7d68', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

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

const CARD_W = 70;
const MAX_ROW_W = 300;
const SCORE_W = 80;

function BotFanHand({ cards, faceDownCard, faceUpCards, showFaceDown, scoreColor, total, target, isBust, stood }) {
  const n = cards.length;
  const normalStep = CARD_W + 8;
  const naturalW = CARD_W + (n - 1) * normalStep;
  const step = naturalW > MAX_ROW_W ? Math.max(18, (MAX_ROW_W - CARD_W) / Math.max(n - 1, 1)) : normalStep;
  const rowW = Math.min(CARD_W + (n - 1) * step, MAX_ROW_W);

  const displayScore = showFaceDown ? total : getHandTotal(faceUpCards);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {/* Cards fan + score as one block, centered together */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ position: 'relative', width: rowW, height: 145, flexShrink: 0, marginTop: 60 }}>
        {faceDownCard && (
          <div style={{ position: 'absolute', left: 0, bottom: 0, zIndex: 1 }}>
            <Card card={faceDownCard} faceDown={!showFaceDown} isNew={true} />
          </div>
        )}
        {faceUpCards.map((card, idx) => (
          <div key={card.id} style={{ position: 'absolute', left: (idx + 1) * step, bottom: 0, zIndex: idx + 2 }}>
            <Card card={card} faceDown={false} isNew={true} dealIndex={idx} />
          </div>
        ))}
      </div>

      {/* Score — below cards */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 52, lineHeight: 1, color: scoreColor }}>
          {displayScore}
          {!showFaceDown && displayScore > 0 && (
            <span style={{ fontSize: 22, color: '#3a3428', marginLeft: 4 }}>+?</span>
          )}
        </span>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: isBust ? '#e57373' : '#5a5040' }}>
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
            background: alive ? '#e8d5b0' : 'transparent',
            border: alive ? 'none' : '1px solid #2a2218',
            boxShadow: alive ? '0 0 4px rgba(232,213,176,0.2)' : 'none',
          }} />
        ))}
      </div>
    </div>
  );
}
