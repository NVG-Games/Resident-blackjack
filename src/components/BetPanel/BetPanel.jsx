import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { getEffectiveTarget, computeBetModifiers } from '../../engine/trumpEngine.js';
import { getHandTotal } from '../../engine/deck.js';
import { PHASE_CONFIG } from '../../engine/constants.js';

export default function BetPanel({ state, isGuestOnline = false }) {
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

  const myHealth = isGuestOnline ? botHealth : playerHealth;
  const theirHealth = isGuestOnline ? playerHealth : botHealth;
  const myBet = isGuestOnline ? effectiveBotBet : effectivePlayerBet;
  const myBetMod = isGuestOnline ? botBetMod : playerBetMod;
  const theirBet = isGuestOnline ? effectivePlayerBet : effectiveBotBet;
  const theirBetMod = isGuestOnline ? playerBetMod : botBetMod;

  const targetRef = useRef(null);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (prevTarget.current !== target && targetRef.current) {
      gsap.fromTo(targetRef.current,
        { scale: 1.5, color: '#ef4444' },
        { scale: 1, color: '#ffd152', duration: 0.5, ease: 'back.out(2)' }
      );
    }
    prevTarget.current = target;
  }, [target]);

  const phaseColors = { FINGER: '#e57373', SHOCK: '#64b5f6', SAW: '#ff8a50' };
  const phaseColor = phaseColors[phase] || '#e8d5b0';

  const cell = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 };
  const label = { fontFamily: 'Cinzel, serif', fontSize: 10, color: '#5a5040', letterSpacing: '0.15em', textTransform: 'uppercase' };
  const value = { fontFamily: 'Cinzel, serif', fontWeight: 700, lineHeight: 1 };
  const divider = { width: 1, alignSelf: 'stretch', background: 'rgba(255,209,82,0.08)', margin: '0 12px' };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px 16px',
      background: 'rgba(0,0,0,0.45)',
      borderTop: '1px solid rgba(255,209,82,0.07)',
      borderBottom: '1px solid rgba(255,209,82,0.07)',
      width: '100%',
      boxSizing: 'border-box',
      gap: 0,
    }}>

      {/* Phase */}
      <div style={cell}>
        <span style={label}>Phase</span>
        <span style={{ ...value, fontSize: 18, color: phaseColor, letterSpacing: '0.08em' }}>{phase}</span>
      </div>

      <div style={divider} />

      {/* Round */}
      <div style={cell}>
        <span style={label}>Round</span>
        <span style={{ ...value, fontSize: 18, color: '#c4b9a8' }}>{roundNumber} / {PHASE_CONFIG[phase]?.rounds ?? 3}</span>
      </div>

      <div style={divider} />

      {/* Target */}
      <div style={cell}>
        <span style={label}>Target</span>
        <span ref={targetRef} style={{ ...value, fontSize: 22, color: '#ffd152' }}>{target}</span>
      </div>


    </div>
  );
}
