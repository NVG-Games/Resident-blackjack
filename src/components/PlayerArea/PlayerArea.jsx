import { getHandTotal } from '../../engine/deck.js';
import { getEffectiveTarget } from '../../engine/trumpEngine.js';
import { ROUND_STATE } from '../../engine/gameState.js';
import Card from '../Card/Card.jsx';

export default function PlayerArea({ state, playerName = 'Clancy', hideCards = false }) {
  const { playerHand, playerTableTrumps, botTableTrumps, playerHealth, playerStood, roundState } = state;
  const target = getEffectiveTarget([...playerTableTrumps, ...botTableTrumps]);
  const total = getHandTotal(playerHand);
  const isBust = total > target;
  const isClose = total >= target - 2 && !isBust;
  const isRoundOver = roundState === ROUND_STATE.ROUND_OVER;

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-3">
      {/* Cards */}
      <div className="flex items-end gap-1 sm:gap-2" style={{ filter: hideCards ? 'blur(8px)' : 'none', transition: 'filter 0.3s' }}>
        {playerHand.length > 0 && (
          <div className="relative">
            <Card key={playerHand[0].id} card={playerHand[0]} faceDown={false} isNew={true} />
            {/* Hole card label — only visible to this player */}
            <div className="absolute -bottom-4 left-0 right-0 text-center">
              <span className="text-xs text-stone-500 font-fell italic">
                🔒 {playerHand[0].value}
              </span>
            </div>
          </div>
        )}
        {playerHand.slice(1).map((card, idx) => (
          <Card
            key={card.id}
            card={card}
            faceDown={false}
            isNew={true}
            dealIndex={idx}
            highlight={isClose && idx === playerHand.length - 2}
          />
        ))}
        {playerHand.length > 0 && (
          <div className="ml-1 sm:ml-2 flex flex-col items-center justify-center">
            <div className={`font-cinzel text-2xl sm:text-3xl font-bold transition-colors duration-300 ${
              isBust ? 'text-red-600' : isClose ? 'text-amber-300' : 'text-stone-200'
            }`}>
              {total}
            </div>
            {isBust && <div className="text-red-500 text-sm font-fell italic animate-pulse">BUST</div>}
            {!isBust && <div className="text-stone-500 text-xs font-fell">of {target}</div>}
            {playerStood && !isBust && <div className="text-stone-400 text-xs font-fell italic">stood</div>}
          </div>
        )}
      </div>

      {/* Player identity */}
      <div className="flex items-center gap-2 sm:gap-3">
        <HealthBar health={playerHealth} maxHealth={10} />
        <div className="text-center">
          <div className="font-cinzel text-xs sm:text-sm font-bold text-amber-300 tracking-widest uppercase">
            {playerName}
          </div>
          <div className="hidden sm:block text-xs text-stone-500 font-fell italic">You</div>
        </div>
      </div>
    </div>
  );
}

function HealthBar({ health, maxHealth }) {
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
            className={`w-2 h-3 rounded-sm transition-all duration-500 ${
              alive
                ? 'bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.5)]'
                : 'bg-stone-800 border border-stone-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
