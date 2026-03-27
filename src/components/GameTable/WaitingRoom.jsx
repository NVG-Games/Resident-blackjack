import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useTelegram } from '../../hooks/useTelegram.js';

const panelStyle = {
  background: 'linear-gradient(160deg, #0e0c09 0%, #120f0a 60%, #080604 100%)',
  border: '1px solid rgba(255,209,82,0.12)',
  boxShadow: '0 0 60px rgba(0,0,0,0.9), inset 0 0 60px rgba(0,0,0,0.4)',
};

/**
 * WaitingRoom — shown after a connection is established, before the game starts.
 *
 * Host sees this while waiting for the "START" signal (which they send).
 * Guest sees this waiting for the host to start.
 *
 * Props:
 *   isHost            — boolean
 *   code              — room code string
 *   onStart           — called by host to initiate game start
 *   onBack            — cancel / leave waiting room
 *   opponentConnected — boolean, guest connected
 */
export default function WaitingRoom({ isHost, code, onStart, onBack, opponentConnected }) {
  const containerRef = useRef(null);
  const dotRef = useRef(null);
  const { isTelegram, openInviteLink, getInviteUrl } = useTelegram();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, scale: 0.96 },
      { opacity: 1, scale: 1, duration: 0.45, ease: 'power2.out' },
    );
  }, []);

  // Animated waiting dots
  useEffect(() => {
    if (!dotRef.current) return;
    const tl = gsap.timeline({ repeat: -1 });
    tl.to(dotRef.current, { opacity: 0.2, duration: 0.6, ease: 'power1.inOut' })
      .to(dotRef.current, { opacity: 1, duration: 0.6, ease: 'power1.inOut' });
    return () => tl.kill();
  }, []);

  const handleInvite = () => {
    if (isTelegram) {
      openInviteLink(code);
    } else {
      const url = getInviteUrl(code) ?? `${window.location.href}#join=${code}`;
      navigator.clipboard?.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #110d08 0%, #080604 100%)' }}
    >
      <div ref={containerRef} className="w-full max-w-sm text-center" style={panelStyle}>
        <div style={{ padding: '40px 32px 32px', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>

          {/* Room code */}
          <div>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#5a5040', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
              Room Code
            </p>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 48, fontWeight: 700, letterSpacing: '0.3em', color: '#ffd152' }}>
              {code}
            </p>
          </div>

          {/* Role badge */}
          <div style={{ padding: '6px 18px', borderRadius: 4, background: 'rgba(255,209,82,0.06)', border: '1px solid rgba(255,209,82,0.2)' }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#e8d5b0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {isHost ? '⚡ Host' : '✦ Guest'}
            </span>
          </div>

          {/* Invite button */}
          {isHost && (
            <button
              onClick={handleInvite}
              style={{
                width: '100%', fontFamily: 'Cinzel, serif', fontSize: 18, letterSpacing: '0.06em',
                textTransform: 'uppercase', padding: '11px 24px', borderRadius: 4, cursor: 'pointer',
                color: '#e8d5b0', background: 'transparent', border: '1px solid rgba(232,213,176,0.2)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(232,213,176,0.5)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(232,213,176,0.2)'; }}
            >
              {isTelegram ? '✈ Invite via Telegram' : copied ? '✓ Link Copied!' : '🔗 Copy Invite Link'}
            </button>
          )}

          {/* Status */}
          {isHost && !opponentConnected && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#5a5040', fontStyle: 'italic' }}>
                Waiting for opponent<span ref={dotRef}>…</span>
              </p>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#3a3020', marginTop: 4 }}>Share the room code</p>
            </div>
          )}

          {isHost && opponentConnected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', alignItems: 'center' }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#a8c090', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                ✓ Opponent Connected
              </p>
              <button
                style={{
                  width: '100%', fontFamily: 'Cinzel, serif', fontSize: 22, letterSpacing: '0.06em',
                  textTransform: 'uppercase', padding: '14px 32px', borderRadius: 4, cursor: 'pointer',
                  color: '#ffd152', background: 'rgba(255,209,82,0.06)', border: '1px solid rgba(255,209,82,0.4)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,209,82,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,209,82,0.06)'; }}
                onClick={onStart}
              >
                ▶ Start Game
              </button>
            </div>
          )}

          {!isHost && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#5a5040', fontStyle: 'italic' }}>
                Waiting for host<span ref={dotRef}>…</span>
              </p>
            </div>
          )}

          <button
            style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#3a3020', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', marginTop: 4 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#5a5040'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#3a3020'; }}
            onClick={onBack}
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
