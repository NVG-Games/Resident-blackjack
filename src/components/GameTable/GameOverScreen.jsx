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

function WinnerIcon({ winner, isPlayer }) {
  if (winner === 'draw') return <span style={{ color: '#8a9aaa' }}>⚔</span>;
  const won = isPlayer ? winner === 'player' : winner === 'bot';
  return won
    ? <span style={{ color: '#ffd152' }}>✦</span>
    : <span style={{ color: '#e57373' }}>✕</span>;
}

function HealthBar({ health, max = 10, color }) {
  const aliveColor = color === 'amber' ? '#f59e0b' : '#dc2626';
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: max }, (_, i) => (
        <div key={i} style={{
          width: 10, height: 16, borderRadius: 2,
          background: i < health ? aliveColor : '#292524',
          border: i < health ? 'none' : '1px solid #44403c',
        }} />
      ))}
    </div>
  );
}

export default function GameOverScreen({ overlay, onDismiss, isGuestOnline = false }) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);

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
    if (overlay.type === 'defeat') {
      gsap.to(contentRef.current, {
        x: '+=4', duration: 0.05, repeat: 8, yoyo: true, ease: 'power1.inOut', delay: 0.45,
      });
    }
  }, [overlay.type]);

  const isVictory = overlay.type === 'victory';
  const titleColor = isVictory ? '#ffd152' : '#e57373';
  const borderColor = isVictory ? 'rgba(255,209,82,0.25)' : 'rgba(229,115,115,0.22)';

  const roundHistory = overlay.roundHistory || [];
  const finalPlayerHealth = overlay.finalPlayerHealth ?? 0;
  const finalBotHealth = overlay.finalBotHealth ?? 0;

  // For guest: flip perspective
  const myFinalHP = isGuestOnline ? finalBotHealth : finalPlayerHealth;
  const theirFinalHP = isGuestOnline ? finalPlayerHealth : finalBotHealth;

  const byPhase = groupByPhase(roundHistory);

  // Count wins/losses
  const myWins = roundHistory.filter(r =>
    isGuestOnline ? r.winner === 'bot' : r.winner === 'player'
  ).length;
  const draws = roundHistory.filter(r => r.winner === 'draw').length;
  const theirWins = roundHistory.length - myWins - draws;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(4px)' }}
    >
      <div
        ref={contentRef}
        style={{
          background: isVictory
            ? 'linear-gradient(160deg, #0e0c08 0%, #080604 100%)'
            : 'linear-gradient(160deg, #120808 0%, #080604 100%)',
          border: `1px solid ${borderColor}`,
          borderRadius: 10,
          boxShadow: '0 0 80px rgba(0,0,0,0.98)',
          maxWidth: 400,
          width: '92vw',
          maxHeight: '90dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
          position: 'relative',
        }}
      >
        {/* Corner ornaments */}
        <div style={{ position: 'absolute', top: 10, left: 10, color: 'rgba(255,209,82,0.2)', fontSize: 9 }}>✦</div>
        <div style={{ position: 'absolute', top: 10, right: 10, color: 'rgba(255,209,82,0.2)', fontSize: 9 }}>✦</div>

        {/* Title */}
        <div style={{ paddingTop: 28, paddingBottom: 8, textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Cinzel, serif',
            fontWeight: 900,
            fontSize: 38,
            letterSpacing: '0.2em',
            color: titleColor,
            textShadow: `0 0 24px ${titleColor}66`,
            lineHeight: 1,
          }}>
            {overlay.message}
          </div>
          <div style={{
            fontFamily: 'IM Fell English, serif',
            fontSize: 14,
            color: '#5a5040',
            marginTop: 8,
            fontStyle: 'italic',
            letterSpacing: '0.02em',
          }}>
            {overlay.subMessage}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '80%', height: 1, background: `linear-gradient(90deg, transparent, ${borderColor}, transparent)`, margin: '4px 0 12px' }} />

        {/* Score summary */}
        <div style={{
          display: 'flex',
          gap: 0,
          width: '90%',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: 12,
        }}>
          {[
            { label: 'You', value: myWins, color: '#ffd152' },
            { label: 'Draws', value: draws, color: '#8a9aaa' },
            { label: 'Hoffman', value: theirWins, color: '#e57373' },
          ].map(({ label, value, color }, i) => (
            <div key={i} style={{
              flex: 1,
              textAlign: 'center',
              padding: '10px 4px',
              borderRight: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color }}>
                {value}
              </div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: '#5a5040', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Round history by phase */}
        <div style={{ width: '90%', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          {PHASE_ORDER.filter(p => byPhase[p]).map(phase => (
            <div key={phase}>
              {/* Phase header */}
              <div style={{
                fontFamily: 'Cinzel, serif',
                fontSize: 11,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: phase === 'FINGER' ? '#a09070' : phase === 'SHOCK' ? '#64b4ff' : '#ff7840',
                marginBottom: 5,
                paddingLeft: 2,
              }}>
                {PHASE_LABEL[phase]}
              </div>

              {/* Rounds in this phase */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {byPhase[phase].map((r, i) => {
                  const myWon = isGuestOnline ? r.winner === 'bot' : r.winner === 'player';
                  const isDraw = r.winner === 'draw';
                  const rowColor = isDraw ? '#8a9aaa' : myWon ? '#ffd152' : '#e57373';
                  const myScore = isGuestOnline ? r.botTotal : r.playerTotal;
                  const theirScore = isGuestOnline ? r.playerTotal : r.botTotal;
                  const myBet = isGuestOnline ? r.botBet : r.playerBet;
                  const theirBet = isGuestOnline ? r.playerBet : r.botBet;
                  const myBust = myScore > r.target;
                  const theirBust = theirScore > r.target;

                  return (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${rowColor}22`,
                      borderRadius: 5,
                      borderLeft: `3px solid ${rowColor}`,
                    }}>
                      {/* Round number */}
                      <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#5a5040', width: 20, flexShrink: 0 }}>
                        R{r.roundNumber}
                      </div>

                      {/* Scores */}
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          fontFamily: 'Cinzel, serif',
                          fontSize: 15,
                          fontWeight: 700,
                          color: myBust ? '#ef4444' : '#e8d5b0',
                        }}>
                          {myScore}{myBust ? '!' : ''}
                        </span>
                        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#3a3428' }}>vs</span>
                        <span style={{
                          fontFamily: 'Cinzel, serif',
                          fontSize: 15,
                          fontWeight: 700,
                          color: theirBust ? '#ef4444' : '#a09080',
                        }}>
                          {theirScore}{theirBust ? '!' : ''}
                        </span>
                        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#3a3428', marginLeft: 2 }}>
                          /{r.target}
                        </span>
                      </div>

                      {/* HP lost */}
                      <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#5a5040', textAlign: 'right', flexShrink: 0 }}>
                        {isDraw
                          ? <span style={{ color: '#8a9aaa' }}>−{myBet} / −{theirBet}</span>
                          : myWon
                            ? <span style={{ color: '#ffd152' }}>Hoffman −{theirBet} HP</span>
                            : <span style={{ color: '#e57373' }}>You −{myBet} HP</span>
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
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 6,
          padding: '10px 14px',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#5a5040', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              You
            </span>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700, color: myFinalHP > 0 ? '#f59e0b' : '#e57373' }}>
              {myFinalHP} HP
            </span>
            <HealthBar health={myFinalHP} color="amber" />
          </div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#3a3428' }}>vs</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#5a5040', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Hoffman
            </span>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700, color: theirFinalHP > 0 ? '#dc2626' : '#e57373' }}>
              {theirFinalHP} HP
            </span>
            <HealthBar health={theirFinalHP} color="red" />
          </div>
        </div>

        {/* Play Again button */}
        <div style={{ width: '90%', paddingBottom: 20 }}>
          <button
            onClick={onDismiss}
            className="font-cinzel uppercase rounded border w-full transition-all duration-300 active:scale-95"
            style={{
              fontSize: 18,
              padding: '13px 24px',
              letterSpacing: '0.12em',
              background: isVictory ? 'rgba(255,209,82,0.07)' : 'rgba(229,115,115,0.07)',
              borderColor: isVictory ? 'rgba(255,209,82,0.4)' : 'rgba(229,115,115,0.35)',
              color: isVictory ? '#ffd152' : '#f87171',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isVictory ? 'rgba(255,209,82,0.15)' : 'rgba(229,115,115,0.14)';
              e.currentTarget.style.borderColor = isVictory ? 'rgba(255,209,82,0.7)' : 'rgba(229,115,115,0.65)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = isVictory ? 'rgba(255,209,82,0.07)' : 'rgba(229,115,115,0.07)';
              e.currentTarget.style.borderColor = isVictory ? 'rgba(255,209,82,0.4)' : 'rgba(229,115,115,0.35)';
            }}
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
