import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import Card from '../Card/Card.jsx';

const NEXT_ROUND_TIMEOUT_SEC = 20;

// isGuestOnline: flip winner/scores perspective for the guest (Hoffman = bot slot in engine)
export default function RoundResult({ result, onNext, state, isGuestOnline = false, isOnline = false, isHost = false, onHostTimeout, isFinalRound = false }) {
  const ref = useRef(null);
  const [secsLeft, setSecsLeft] = useState(NEXT_ROUND_TIMEOUT_SEC);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current,
      { y: 30, opacity: 0, scale: 0.9 },
      { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)' }
    );
  }, []);

  // Countdown timer — runs for both host and guest in online mode
  useEffect(() => {
    if (!isOnline) return;
    if (secsLeft <= 0) {
      if (isHost) onHostTimeout?.();
      return;
    }
    const t = setTimeout(() => setSecsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [isOnline, isHost, secsLeft, onHostTimeout]);

  if (!result) return null;

  const { winner, playerTotal, botTotal, target, effectivePlayerBet, effectiveBotBet } = result;

  // For guest (Hoffman), engine's "bot wins" means "You Win"
  const rawIsWin = winner === 'player';
  const rawIsDraw = winner === 'draw';
  const isWin = isGuestOnline ? winner === 'bot' : rawIsWin;
  const isDraw = rawIsDraw;

  // Guest's "You" score = botTotal, "Opponent" score = playerTotal
  const myTotal = isGuestOnline ? botTotal : playerTotal;
  const theirTotal = isGuestOnline ? playerTotal : botTotal;
  const myBet = isGuestOnline ? effectiveBotBet : effectivePlayerBet;
  const theirBet = isGuestOnline ? effectivePlayerBet : effectiveBotBet;

  const titleText = isWin ? 'YOU WIN' : isDraw ? 'DRAW' : 'YOU LOSE';
  const titleColor = isWin ? '#ffd152' : isDraw ? '#8a9aaa' : '#e57373';

  // Cards to display — always show all revealed
  const myHand = isGuestOnline ? state.botHand : state.playerHand;
  const theirHand = isGuestOnline ? state.playerHand : state.botHand;
  const suit = state.suit || 'spades';

  return (
    <div
      ref={ref}
      className="absolute inset-0 flex items-center justify-center z-30"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(3px)' }}
    >
      <div className="flex flex-col items-center gap-3 rounded mx-3 w-full max-w-sm"
        style={{ background: '#0c0a07', border: '1px solid rgba(255,209,82,0.12)', boxShadow: '0 0 60px rgba(0,0,0,0.97)', maxHeight: '92dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>

        {/* Result title */}
        <div className="font-cinzel font-black tracking-widest pt-5 px-5"
          style={{ fontSize: 36, color: titleColor, textShadow: `0 0 20px ${titleColor}88`, textAlign: 'center' }}>
          {titleText}
        </div>

        {/* Cards reveal — both hands side by side */}
        <div style={{ display: 'flex', gap: 16, padding: '0 16px', justifyContent: 'center', width: '100%', boxSizing: 'border-box' }}>
          {/* My hand */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#7a6a50', textTransform: 'uppercase', letterSpacing: '0.1em' }}>You</div>
            <HandReveal cards={myHand} total={myTotal} target={target} color={myTotal > target ? '#ef4444' : '#ffd152'} suit={suit} />
          </div>
          {/* Divider */}
          <div style={{ width: 1, background: 'rgba(255,209,82,0.08)', alignSelf: 'stretch', flexShrink: 0 }} />
          {/* Their hand */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#7a6a50', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Opponent</div>
            <HandReveal cards={theirHand} total={theirTotal} target={target} color={theirTotal > target ? '#ef4444' : '#e8d5b0'} suit={suit} />
          </div>
        </div>

        {/* vs target line */}
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 15, color: '#5a5040', textAlign: 'center' }}>
          target: <span style={{ color: '#ffd152', fontWeight: 700 }}>{target}</span>
        </div>

        {/* Health change explanation */}
        <div style={{ padding: '0 16px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: '10px 14px', textAlign: 'center', fontFamily: 'Cinzel, serif', fontSize: 16, color: '#c4b9a8' }}>
            {isWin && <>Opponent loses <span style={{ color: '#ffd152', fontWeight: 700 }}>{theirBet} HP</span></>}
            {!isWin && !isDraw && <>You lose <span style={{ color: '#f87171', fontWeight: 700 }}>{myBet} HP</span></>}
            {isDraw && <>Both lose HP — You <span style={{ color: '#f87171', fontWeight: 700 }}>−{myBet}</span> · Them <span style={{ color: '#f87171', fontWeight: 700 }}>−{theirBet}</span></>}
          </div>
        </div>

        {/* Health bars */}
        <div style={{ display: 'flex', gap: 24, padding: '0 16px', justifyContent: 'center' }}>
          <MiniHealth health={isGuestOnline ? state.botHealth : state.playerHealth} max={10} label="You" color="amber" />
          <MiniHealth health={isGuestOnline ? state.playerHealth : state.botHealth} max={10} label="Opponent" color="red" />
        </div>

        {/* Final round — show "Game Over" banner before the button */}
        {isFinalRound && (
          <div style={{ padding: '0 16px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{
              background: isWin ? 'rgba(255,209,82,0.07)' : 'rgba(229,115,115,0.07)',
              border: `1px solid ${isWin ? 'rgba(255,209,82,0.3)' : 'rgba(229,115,115,0.3)'}`,
              borderRadius: 6,
              padding: '12px 14px',
              textAlign: 'center',
              fontFamily: 'Cinzel, serif',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: isWin ? '#ffd152' : '#e57373',
            }}>
              {isDraw ? '⚔ DRAW — GAME OVER' : isWin ? '✦ GAME OVER — YOU WIN' : '✕ GAME OVER — YOU LOSE'}
            </div>
          </div>
        )}

        <div style={{ padding: '0 16px 16px', width: '100%', boxSizing: 'border-box' }}>
          {/* Online guest: waiting for host */}
          {isOnline && !isHost ? (
            <div style={{ textAlign: 'center', fontFamily: 'Cinzel, serif', padding: '14px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 16, color: '#5a5040', letterSpacing: '0.08em' }}>{isFinalRound ? 'Game over. Waiting for host…' : 'Waiting for host…'}</span>
              <span style={{ fontSize: 13, color: secsLeft <= 5 ? '#ef4444' : '#3a3428', letterSpacing: '0.05em' }}>{secsLeft}s</span>
            </div>
          ) : (
            <button
              onClick={onNext}
              className="font-cinzel uppercase rounded border active:scale-95 transition-all duration-300 w-full"
              style={{
                fontSize: 20,
                padding: '14px 24px',
                letterSpacing: '0.12em',
                background: isFinalRound
                  ? (isWin ? 'rgba(255,209,82,0.1)' : 'rgba(229,115,115,0.08)')
                  : 'rgba(255,209,82,0.06)',
                borderColor: isFinalRound
                  ? (isWin ? 'rgba(255,209,82,0.5)' : 'rgba(229,115,115,0.4)')
                  : 'rgba(255,209,82,0.3)',
                color: isFinalRound ? (isWin ? '#ffd152' : '#f87171') : '#f0e2c0',
                position: 'relative',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,209,82,0.16)'; e.currentTarget.style.borderColor = 'rgba(255,209,82,0.7)'; }}
              onMouseLeave={e => {
                e.currentTarget.style.background = isFinalRound ? (isWin ? 'rgba(255,209,82,0.1)' : 'rgba(229,115,115,0.08)') : 'rgba(255,209,82,0.06)';
                e.currentTarget.style.borderColor = isFinalRound ? (isWin ? 'rgba(255,209,82,0.5)' : 'rgba(229,115,115,0.4)') : 'rgba(255,209,82,0.3)';
              }}
            >
              {isFinalRound ? 'See Final Result →' : 'Next Round →'}
              {isOnline && isHost && (
                <span style={{ position: 'absolute', top: 6, right: 10, fontFamily: 'Cinzel, serif', fontSize: 12, color: secsLeft <= 5 ? '#ef4444' : '#5a5040' }}>
                  {secsLeft}s
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Scale factor to shrink cards: Card renders at ~80px wide, we want ~52px
const SMALL_SCALE = 0.62;
const SMALL_W = Math.round(80 * SMALL_SCALE); // ~50px
const SMALL_H = Math.round(112 * SMALL_SCALE); // ~69px

function HandReveal({ cards, total, target, color, suit = 'spades' }) {
  if (!cards || cards.length === 0) return null;
  const MAX_W = 140;
  const n = cards.length;
  const normalStep = SMALL_W + 4;
  const naturalW = SMALL_W + (n - 1) * normalStep;
  const step = naturalW > MAX_W ? Math.max(12, (MAX_W - SMALL_W) / Math.max(n - 1, 1)) : normalStep;
  const rowW = Math.min(SMALL_W + (n - 1) * step, MAX_W);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
      <div style={{ position: 'relative', width: rowW, height: SMALL_H, flexShrink: 0 }}>
        {cards.map((card, idx) => (
          <div key={card.id || idx} style={{
            position: 'absolute', left: idx * step, bottom: 0, zIndex: idx + 1,
            width: SMALL_W, height: SMALL_H, overflow: 'hidden', borderRadius: 4,
          }}>
            {/* Scale down the card by wrapping in a clipped container */}
            <div style={{ transform: `scale(${SMALL_SCALE})`, transformOrigin: 'top left', width: `${100 / SMALL_SCALE}%`, height: `${100 / SMALL_SCALE}%` }}>
              <Card card={card} faceDown={false} suit={suit} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 32, lineHeight: 1, color }}>
          {total}
        </span>
        {total > target && (
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: '#ef4444' }}>BUST</span>
        )}
      </div>
    </div>
  );
}

function MiniHealth({ health, max, label, color }) {
  const aliveColor = color === 'amber' ? '#f59e0b' : '#dc2626';
  return (
    <div className="flex flex-col items-center gap-1">
      <span style={{ fontFamily: 'Cinzel, serif', fontSize: 20, color: '#c4b9a8' }}>{label}: {health}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: max }, (_, i) => (
          <div key={i} style={{
            width: 12, height: 20, borderRadius: 2,
            background: i < health ? aliveColor : '#292524',
            border: i < health ? 'none' : '1px solid #44403c',
          }} />
        ))}
      </div>
    </div>
  );
}
