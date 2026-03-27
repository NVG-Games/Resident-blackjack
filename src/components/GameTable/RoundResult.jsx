import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

export default function RoundResult({ result, onNext, state }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current,
      { y: 30, opacity: 0, scale: 0.9 },
      { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)' }
    );
  }, []);

  if (!result) return null;

  const { winner, playerTotal, botTotal, target, effectivePlayerBet, effectiveBotBet } = result;
  const isWin = winner === 'player';
  const isDraw = winner === 'draw';

  const titleText = isWin ? 'YOU WIN' : isDraw ? 'DRAW' : 'YOU LOSE';
  const titleColor = isWin ? '#fbbf24' : isDraw ? '#94a3b8' : '#ef4444';

  const nextPhase = state.phase;
  const phaseOver = state.roundNumber >= 3; // simplified

  return (
    <div
      ref={ref}
      className="absolute inset-0 flex items-center justify-center z-30"
      style={{ backgroundColor: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(2px)' }}
    >
      <div className="flex flex-col items-center gap-3 sm:gap-4 p-5 sm:p-8 rounded-lg border border-stone-700/50 mx-4 w-full max-w-sm"
        style={{ background: 'rgba(10,5,2,0.97)', boxShadow: '0 0 40px rgba(0,0,0,0.9)' }}>

        {/* Result title */}
        <div className="font-cinzel text-2xl sm:text-3xl font-black tracking-widest"
          style={{ color: titleColor, textShadow: `0 0 20px ${titleColor}88` }}>
          {titleText}
        </div>

        {/* Score breakdown */}
        <div className="flex gap-5 sm:gap-8 text-center">
          <div>
            <div className="text-xs font-cinzel text-amber-500/70 uppercase tracking-widest mb-1">You</div>
            <div className={`font-cinzel text-xl sm:text-2xl font-bold ${playerTotal > target ? 'text-red-500' : 'text-amber-300'}`}>
              {playerTotal}
            </div>
            {playerTotal > target && <div className="text-xs text-red-400 font-fell">BUST</div>}
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="text-stone-600 font-fell text-sm italic">vs</div>
            <div className="text-xs text-stone-500 font-fell mt-1">→{target}</div>
          </div>
          <div>
            <div className="text-xs font-cinzel text-red-500/70 uppercase tracking-widest mb-1">Opponent</div>
            <div className={`font-cinzel text-xl sm:text-2xl font-bold ${botTotal > target ? 'text-red-500' : 'text-red-300'}`}>
              {botTotal}
            </div>
            {botTotal > target && <div className="text-xs text-red-400 font-fell">BUST</div>}
          </div>
        </div>

        {/* Health change */}
        <div className="text-center text-xs font-fell text-stone-400">
          {!isWin && !isDraw && (
            <span>You lose <span className="text-red-400 font-bold">{effectivePlayerBet}</span> health</span>
          )}
          {isDraw && (
            <span>Both lose health: <span className="text-red-400 font-bold">{effectivePlayerBet}</span> / <span className="text-red-400 font-bold">{effectiveBotBet}</span></span>
          )}
          {isWin && (
            <span>Opponent loses <span className="text-amber-400 font-bold">{effectiveBotBet}</span> health</span>
          )}
        </div>

        {/* Health bars */}
        <div className="flex gap-4 sm:gap-6">
          <MiniHealth health={state.playerHealth} max={10} label="You" color="amber" />
          <MiniHealth health={state.botHealth} max={10} label="Them" color="red" />
        </div>

        <button
          onClick={onNext}
          className="font-cinzel text-sm tracking-widest uppercase px-8 py-3 rounded
            border border-stone-700 text-stone-300 hover:text-amber-300
            hover:border-amber-700 active:scale-95 transition-all duration-300 mt-1 w-full"
          style={{ background: 'rgba(0,0,0,0.6)' }}
        >
          Next Round →
        </button>
      </div>
    </div>
  );
}

function MiniHealth({ health, max, label, color }) {
  const colorClass = color === 'amber' ? 'bg-amber-500' : 'bg-red-600';
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-cinzel text-stone-500">{label}: {health}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: max }, (_, i) => (
          <div key={i} className={`w-2 h-2 rounded-sm ${i < health ? colorClass : 'bg-stone-800'}`} />
        ))}
      </div>
    </div>
  );
}
