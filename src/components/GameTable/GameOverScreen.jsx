import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

const PHASE_LABEL = { FINGER: '✂ Finger', SHOCK: '⚡ Shock', SAW: '⚙ Saw' };
const PHASE_ORDER = ['FINGER', 'SHOCK', 'SAW'];

function groupByPhase(roundHistory) {
  const groups = {};
  for (const entry of roundHistory) {
    if (!groups[entry.phase]) groups[entry.phase] = [];
    groups[entry.phase].push(entry);
  }
  return groups;
}

function HealthBar({ health, max = 10, isMe }) {
  const filled = Math.max(0, Math.min(health, max));
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: max }, (_, i) => (
        <div key={i} style={{
          width: 12, height: 6, borderRadius: 2,
          background: i < filled
            ? (isMe ? '#f59e0b' : '#e53e3e')
            : 'rgba(255,255,255,0.1)',
        }} />
      ))}
    </div>
  );
}

export default function GameOverScreen({ overlay, onDismiss, isGuestOnline = false }) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  // For online guest: winner='player' means host won → guest lost → flip
  const guestWon = isGuestOnline && overlay.winner === 'bot';
  const hostWon = !isGuestOnline && overlay.winner === 'player';
  const isVictory = isGuestOnline ? guestWon : hostWon;

  const displayMessage = isVictory ? 'YOU SURVIVE' : 'YOU FALL';
  const displaySubMessage = isVictory
    ? 'Hoffman\'s saw blade stops. Lucas sneers. The game is over.'
    : 'The saw inches forward. Darkness takes you.';

  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return;
    const tl = gsap.timeline();
    tl.fromTo(containerRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.35 }
    ).fromTo(contentRef.current,
      { y: 40, opacity: 0, scale: 0.92 },
      { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.4)' },
      '-=0.15'
    );
    if (!isVictory) {
      gsap.to(contentRef.current, {
        x: '+=4', duration: 0.05, repeat: 8, yoyo: true, ease: 'power1.inOut', delay: 0.45,
      });
    }
  }, [isVictory]);

  const roundHistory = overlay.roundHistory || [];
  const finalPlayerHealth = overlay.finalPlayerHealth ?? 0;
  const finalBotHealth = overlay.finalBotHealth ?? 0;

  const myFinalHP = isGuestOnline ? finalBotHealth : finalPlayerHealth;
  const theirFinalHP = isGuestOnline ? finalPlayerHealth : finalBotHealth;

  const byPhase = groupByPhase(roundHistory);

  const myWins = roundHistory.filter(r =>
    isGuestOnline ? r.winner === 'bot' : r.winner === 'player'
  ).length;
  const draws = roundHistory.filter(r => r.winner === 'draw').length;
  const theirWins = roundHistory.length - myWins - draws;

  const titleColor = isVictory ? '#ffd152' : '#f87171';
  const accentBorder = isVictory ? 'rgba(255,209,82,0.3)' : 'rgba(248,113,113,0.3)';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)' }}
    >
      <div
        ref={contentRef}
        style={{
          background: isVictory
            ? 'linear-gradient(160deg, #181208 0%, #0e0b06 100%)'
            : 'linear-gradient(160deg, #1a0a0a 0%, #0e0606 100%)',
          border: `1px solid ${accentBorder}`,
          borderRadius: 12,
          boxShadow: `0 0 80px rgba(0,0,0,0.98), 0 0 40px ${isVictory ? 'rgba(255,209,82,0.06)' : 'rgba(248,113,113,0.06)'}`,
          maxWidth: 420,
          width: '92vw',
          maxHeight: '90dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {/* Corner ornaments */}
        <div style={{ position: 'absolute', top: 10, left: 12, color: titleColor, fontSize: 10, opacity: 0.4 }}>✦</div>
        <div style={{ position: 'absolute', top: 10, right: 12, color: titleColor, fontSize: 10, opacity: 0.4 }}>✦</div>

        {/* Title */}
        <div style={{ paddingTop: 32, paddingBottom: 10, textAlign: 'center', width: '100%' }}>
          <div style={{
            fontFamily: 'Cinzel, serif',
            fontWeight: 900,
            fontSize: 42,
            letterSpacing: '0.22em',
            color: titleColor,
            textShadow: `0 0 32px ${titleColor}55`,
            lineHeight: 1,
          }}>
            {displayMessage}
          </div>
          <div style={{
            fontFamily: 'IM Fell English, serif',
            fontSize: 14,
            color: '#9a8a70',
            marginTop: 10,
            fontStyle: 'italic',
            letterSpacing: '0.02em',
            padding: '0 24px',
          }}>
            {displaySubMessage}
          </div>
        </div>

        {/* Divider */}
        <div style={{
          width: '85%', height: 1,
          background: `linear-gradient(90deg, transparent, ${accentBorder}, transparent)`,
          margin: '6px 0 16px',
        }} />

        {/* Score summary */}
        <div style={{
          display: 'flex',
          width: '90%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          overflow: 'hidden',
          marginBottom: 16,
        }}>
          {[
            { label: 'You', value: myWins, color: '#ffd152' },
            { label: 'Draws', value: draws, color: '#94a3b8' },
            { label: 'Opponent', value: theirWins, color: '#f87171' },
          ].map(({ label, value, color }, i) => (
            <div key={i} style={{
              flex: 1,
              textAlign: 'center',
              padding: '12px 4px',
              borderRight: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
            }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 26, fontWeight: 700, color }}>
                {value}
              </div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#7a6a58', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Round history by phase */}
        <div style={{ width: '90%', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {PHASE_ORDER.filter(p => byPhase[p]).map(phase => (
            <div key={phase}>
              {/* Phase header */}
              <div style={{
                fontFamily: 'Cinzel, serif',
                fontSize: 12,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: phase === 'FINGER' ? '#c8a870' : phase === 'SHOCK' ? '#60a5fa' : '#fb923c',
                marginBottom: 6,
                paddingLeft: 2,
              }}>
                {PHASE_LABEL[phase]}
              </div>

              {/* Rounds in this phase */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {byPhase[phase].map((r, i) => {
                  const myWon = isGuestOnline ? r.winner === 'bot' : r.winner === 'player';
                  const isDraw = r.winner === 'draw';
                  const rowAccent = isDraw ? '#94a3b8' : myWon ? '#ffd152' : '#f87171';
                  const myScore = isGuestOnline ? r.botTotal : r.playerTotal;
                  const theirScore = isGuestOnline ? r.playerTotal : r.botTotal;
                  const myBet = isGuestOnline ? (r.botBet ?? r.effectiveBotBet ?? 0) : (r.playerBet ?? r.effectivePlayerBet ?? 0);
                  const theirBet = isGuestOnline ? (r.playerBet ?? r.effectivePlayerBet ?? 0) : (r.botBet ?? r.effectiveBotBet ?? 0);
                  const myBust = myScore > r.target;
                  const theirBust = theirScore > r.target;

                  return (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: isDraw
                        ? 'rgba(148,163,184,0.06)'
                        : myWon
                          ? 'rgba(255,209,82,0.06)'
                          : 'rgba(248,113,113,0.06)',
                      border: `1px solid ${rowAccent}30`,
                      borderRadius: 6,
                      borderLeft: `3px solid ${rowAccent}`,
                    }}>
                      {/* Round number */}
                      <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#7a6a58', width: 22, flexShrink: 0 }}>
                        R{r.roundNumber}
                      </div>

                      {/* Scores */}
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{
                          fontFamily: 'Cinzel, serif',
                          fontSize: 16,
                          fontWeight: 700,
                          color: myBust ? '#f87171' : '#e8d5b0',
                        }}>
                          {myScore}{myBust ? '!' : ''}
                        </span>
                        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#6a5a48' }}>vs</span>
                        <span style={{
                          fontFamily: 'Cinzel, serif',
                          fontSize: 16,
                          fontWeight: 700,
                          color: theirBust ? '#f87171' : '#c0b098',
                        }}>
                          {theirScore}{theirBust ? '!' : ''}
                        </span>
                        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#6a5a48', marginLeft: 1 }}>
                          /{r.target}
                        </span>
                      </div>

                      {/* HP delta */}
                      <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, textAlign: 'right', flexShrink: 0 }}>
                        {isDraw
                          ? <span style={{ color: '#94a3b8' }}>−{myBet} / −{theirBet} HP</span>
                          : myWon
                            ? <span style={{ color: '#ffd152' }}>−{theirBet} HP</span>
                            : <span style={{ color: '#f87171' }}>−{myBet} HP</span>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Final HP */}
        <div style={{
          width: '90%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          padding: '14px 18px',
          marginBottom: 18,
          gap: 12,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#9a8a70', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              You
            </span>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: myFinalHP > 0 ? '#f59e0b' : '#f87171', lineHeight: 1 }}>
              {myFinalHP} HP
            </span>
            <HealthBar health={myFinalHP} isMe={true} />
          </div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#4a3a28' }}>vs</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#9a8a70', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Opponent
            </span>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: theirFinalHP > 0 ? '#e53e3e' : '#f87171', lineHeight: 1 }}>
              {theirFinalHP} HP
            </span>
            <HealthBar health={theirFinalHP} isMe={false} />
          </div>
        </div>

        {/* Play Again button */}
        <div style={{ width: '90%', paddingBottom: 24 }}>
          <button
            onClick={onDismiss}
            className="font-cinzel uppercase rounded w-full transition-all duration-200 active:scale-95"
            style={{
              fontSize: 16,
              padding: '15px 24px',
              letterSpacing: '0.14em',
              background: isVictory ? 'rgba(255,209,82,0.1)' : 'rgba(248,113,113,0.1)',
              border: `1px solid ${isVictory ? 'rgba(255,209,82,0.5)' : 'rgba(248,113,113,0.5)'}`,
              color: isVictory ? '#ffd152' : '#f87171',
              fontWeight: 700,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isVictory ? 'rgba(255,209,82,0.18)' : 'rgba(248,113,113,0.18)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = isVictory ? 'rgba(255,209,82,0.1)' : 'rgba(248,113,113,0.1)';
            }}
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
