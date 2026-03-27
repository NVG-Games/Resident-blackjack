import { getHandTotal } from '../../engine/deck.js';
import { getEffectiveTarget } from '../../engine/trumpEngine.js';
import { ROUND_STATE } from '../../engine/gameState.js';
import Card from '../Card/Card.jsx';

export default function BotArea({ state, isThinking, playerName = 'Hoffman', hideCards = false }) {
  const { botHand, playerTableTrumps, botTableTrumps, botHealth, botStood, roundState } = state;
  const target = getEffectiveTarget([...playerTableTrumps, ...botTableTrumps]);

  const isRoundOver = roundState === ROUND_STATE.ROUND_OVER;
  const faceUpCards = botHand.slice(1);
  const faceDownCard = botHand[0];
  const showFaceDown = isRoundOver && faceDownCard;
  const total = isRoundOver ? getHandTotal(botHand) : getHandTotal(faceUpCards);
  const faceUpTotal = getHandTotal(faceUpCards);
  const isBust = (isRoundOver ? total : faceUpTotal) > target;

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-3">
      {/* Bot identity */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="text-center">
          <div className="font-cinzel text-xs sm:text-sm font-bold text-red-400 tracking-widest uppercase">
            {playerName}
          </div>
          <div className="hidden sm:block text-xs text-stone-500 font-fell italic">Your opponent</div>
        </div>
        <HealthBar health={botHealth} maxHealth={10} owner="bot" />
      </div>

      {/* Thinking indicator */}
      {isThinking && (
        <div className="flex items-center gap-2 text-red-400 text-xs font-fell italic animate-pulse">
          <span>considers...</span>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1 h-1 bg-red-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="flex items-end gap-1 sm:gap-2" style={{ filter: hideCards ? 'blur(8px)' : 'none', transition: 'filter 0.3s' }}>
        {faceDownCard && (
          <div className="relative">
            <Card card={faceDownCard} faceDown={!showFaceDown} isNew={false} />
            <div className="absolute -bottom-4 left-0 right-0 text-center">
              <span className="text-xs text-stone-500 font-fell italic">
                {showFaceDown ? faceDownCard.value : '?'}
              </span>
            </div>
          </div>
        )}
        {faceUpCards.map((card) => (
          <Card key={card.id} card={card} faceDown={false} isNew={true} />
        ))}
        {botHand.length > 0 && (
          <div className="ml-1 sm:ml-2 flex flex-col items-center justify-center">
            <div className={`font-cinzel text-xl sm:text-2xl font-bold ${isBust ? 'text-red-600' : 'text-amber-300'}`}>
              {isRoundOver ? total : faceUpTotal}
              {!isRoundOver && faceUpTotal > 0 && (
                <span className="text-xs text-stone-400 ml-1">+?</span>
              )}
            </div>
            {isBust && <div className="text-red-500 text-xs font-fell italic animate-pulse">BUST</div>}
            {botStood && !isBust && <div className="text-stone-400 text-xs font-fell italic">stood</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function HealthBar({ health, maxHealth, owner }) {
  const pips = Array.from({ length: maxHealth }, (_, i) => i < health);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs font-fell text-stone-400">
        {health}/{maxHealth}
      </div>
      <div className="flex gap-0.5">
        {pips.map((alive, i) => (
          <div
            key={i}
            className={`w-2 h-3 rounded-sm transition-all duration-300 ${
              alive
                ? 'bg-red-600 shadow-[0_0_4px_rgba(220,0,0,0.6)]'
                : 'bg-stone-800 border border-stone-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
