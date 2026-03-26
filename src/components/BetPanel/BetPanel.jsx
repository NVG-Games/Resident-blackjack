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
    <div className="flex flex-col items-center gap-2 px-4 py-2
      bg-black/40 rounded-lg border border-stone-800 backdrop-blur-sm">

      {/* Phase indicator */}
      <div className={`font-cinzel text-xs font-bold tracking-widest uppercase ${phaseColors[phase] || 'text-stone-400'}`}>
        {phase.replace('_', ' ')} PHASE · Round {roundNumber}
      </div>

      {/* Target */}
      <div className="flex items-center gap-2">
        <span className="text-stone-500 font-fell text-sm italic">Target:</span>
        <span ref={targetRef} className="font-cinzel text-2xl font-bold text-amber-300">
          {target}
        </span>
      </div>

      {/* Bets */}
      <div className="flex gap-6 text-center">
        <BetDisplay label="Your Risk" bet={effectivePlayerBet} base={playerBet} mod={playerBetMod} color="amber" />
        <div className="w-px bg-stone-700" />
        <BetDisplay label="His Risk" bet={effectiveBotBet} base={botBet} mod={botBetMod} color="red" />
      </div>
    </div>
  );
}

function BetDisplay({ label, bet, base, mod, color }) {
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
      <div ref={betRef} className={`font-cinzel text-xl font-bold ${colors.base}`}>
        {bet}
        {mod !== 0 && (
          <span className={`text-xs ml-1 ${colors.mod}`}>
            ({mod > 0 ? '+' : ''}{mod})
          </span>
        )}
      </div>
      <span className="text-xs text-stone-600 font-fell">health pts</span>
    </div>
  );
}
