import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { getEffectiveTarget, computeBetModifiers } from '../../engine/trumpEngine.js';
import { getHandTotal } from '../../engine/deck.js';

export default function BetPanel({ state }) {
  const {
    playerBet, botBet, phase, roundNumber,
    playerTableTrumps, botTableTrumps,
    playerHand, botHand,
    playerTrumpHand, botTrumpHand,
    playerHealth, botHealth,
  } = state;

  const target = getEffectiveTarget([...playerTableTrumps, ...botTableTrumps]);
  const { playerBetMod, botBetMod } = computeBetModifiers(
    playerTableTrumps, botTableTrumps,
    playerHand, botHand,
    playerTrumpHand, botTrumpHand,
    target,
  );

  const effectivePlayerBet = Math.max(0, playerBet + playerBetMod);
  const effectiveBotBet = Math.max(0, botBet + botBetMod);

  const targetRef = useRef(null);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (prevTarget.current !== target && targetRef.current) {
      gsap.fromTo(targetRef.current,
        { scale: 1.5, color: '#ef4444' },
        { scale: 1, color: '#fbbf24', duration: 0.5, ease: 'back.out(2)' }
      );
    }
    prevTarget.current = target;
  }, [target]);

  const phaseColors = {
    FINGER: 'text-red-400',
    SHOCK: 'text-blue-400',
    SAW: 'text-orange-400',
  };

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2
      bg-black/40 rounded-lg border border-stone-800 backdrop-blur-sm w-full max-w-xs sm:max-w-none sm:w-auto">

      {/* Phase indicator */}
      <div className={`font-cinzel text-xs font-bold tracking-widest uppercase ${phaseColors[phase] || 'text-stone-400'}`}>
        {phase.replace('_', ' ')} · R{roundNumber}
      </div>

      {/* Health score — main scoreboard */}
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="font-cinzel font-black text-amber-300" style={{ fontSize: '1.1rem' }}>{playerHealth}</span>
        <span className="text-stone-600 font-fell text-xs">❤ You</span>
        <span className="text-stone-700 font-cinzel text-sm font-bold">vs</span>
        <span className="text-stone-600 font-fell text-xs">Him ❤</span>
        <span className="font-cinzel font-black text-red-400" style={{ fontSize: '1.1rem' }}>{botHealth}</span>
      </div>

      {/* Target + Stakes */}
      <div className="flex items-center gap-3 sm:gap-6">
        <div className="flex flex-col items-center">
          <span className="text-stone-600 font-fell text-xs italic">target</span>
          <span ref={targetRef} className="font-cinzel text-xl sm:text-2xl font-bold text-amber-300">
            {target}
          </span>
        </div>
        <div className="w-px h-8 bg-stone-700" />
        <div className="flex flex-col items-center">
          <span className="text-stone-600 font-fell text-xs italic">loser pays</span>
          <div className="flex items-center gap-1.5">
            <BetDisplay label="You" bet={effectivePlayerBet} base={playerBet} mod={playerBetMod} color="amber" compact />
            <span className="text-stone-700 font-cinzel text-xs">/</span>
            <BetDisplay label="Him" bet={effectiveBotBet} base={botBet} mod={botBetMod} color="red" compact />
          </div>
        </div>
      </div>
    </div>
  );
}

function BetDisplay({ label, bet, base, mod, color, compact = false }) {
  const betRef = useRef(null);
  const prevBet = useRef(bet);

  useEffect(() => {
    if (prevBet.current !== bet && betRef.current) {
      gsap.fromTo(betRef.current,
        { y: -8, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
    prevBet.current = bet;
  }, [bet]);

  const colorMap = {
    amber: { base: 'text-amber-300', mod: 'text-red-400', label: 'text-amber-500' },
    red: { base: 'text-red-300', mod: 'text-red-400', label: 'text-red-500' },
  };
  const colors = colorMap[color];

  return (
    <div className="flex flex-col items-center">
      <span className={`text-xs font-cinzel ${colors.label} tracking-wide`}>{label}</span>
      <div ref={betRef} className={`font-cinzel font-bold ${colors.base} ${compact ? 'text-lg' : 'text-xl'}`}>
        {bet}
        {mod !== 0 && (
          <span className={`text-xs ml-1 ${colors.mod}`}>
            ({mod > 0 ? '+' : ''}{mod})
          </span>
        )}
      </div>
      {!compact && <span className="text-xs text-stone-600 font-fell">health pts</span>}
    </div>
  );
}
