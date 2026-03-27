import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useTelegram } from '../../hooks/useTelegram.js';

const panelStyle = {
  background: 'linear-gradient(160deg, #0d0603 0%, #1a0c07 60%, #0a0402 100%)',
  border: '1px solid #5c2a0e',
  boxShadow: '0 0 40px rgba(180,30,0,0.15), inset 0 0 60px rgba(0,0,0,0.6)',
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
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #1a0a04 0%, #080402 100%)',
        fontFamily: "'IM Fell English', serif",
      }}
    >
      <div ref={containerRef} className="w-full max-w-md text-center" style={panelStyle}>
        <div className="px-8 pt-10 pb-8 space-y-6">
          {/* Room badge */}
          <div>
            <p className="text-stone-500 text-xs font-cinzel uppercase tracking-widest mb-1">
              Room Code
            </p>
            <p
              className="font-cinzel text-5xl font-bold tracking-[0.3em]"
              style={{ color: '#e74c3c', textShadow: '0 0 20px rgba(231,76,60,0.5)' }}
            >
              {code}
            </p>
          </div>

          {/* Role badge */}
          <div
            className="inline-block px-4 py-2 rounded"
            style={{ background: 'rgba(180,120,0,0.1)', border: '1px solid rgba(180,120,0,0.2)' }}
          >
            <span className="font-cinzel text-sm text-amber-300 tracking-widest uppercase">
              {isHost ? '⚡ Host — Clancy' : '🎮 Guest — Hoffman'}
            </span>
          </div>

          {/* Invite friend button — only for host */}
          {isHost && (
            <button
              onClick={handleInvite}
              className="w-full font-cinzel tracking-widest uppercase text-xs px-4 py-3 rounded border border-stone-700/60 text-stone-300 hover:text-amber-300 hover:border-amber-700/60 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              {isTelegram ? (
                <>✈ Invite Friend via Telegram</>
              ) : copied ? (
                <>✓ Link Copied!</>
              ) : (
                <>🔗 Copy Invite Link</>
              )}
            </button>
          )}

          {/* Status */}
          {isHost && !opponentConnected && (
            <div className="space-y-2">
              <p className="text-stone-400 text-sm italic">
                Waiting for opponent
                <span ref={dotRef}>…</span>
              </p>
              <p className="text-stone-600 text-xs">Share the room code with your opponent</p>
            </div>
          )}

          {isHost && opponentConnected && (
            <div className="space-y-4">
              <p className="text-green-400 text-sm font-cinzel uppercase tracking-widest">
                ✓ Opponent Connected
              </p>
              <button
                className="w-full font-cinzel tracking-widest uppercase text-sm px-6 py-4 rounded border border-amber-700/50 text-amber-300 transition-all duration-200 cursor-pointer hover:bg-amber-900/20"
                style={{ background: 'rgba(180,120,0,0.08)' }}
                onClick={onStart}
              >
                ▶ Begin the Ordeal
              </button>
            </div>
          )}

          {!isHost && (
            <div className="space-y-2">
              <p className="text-stone-400 text-sm italic">
                Waiting for host to start
                <span ref={dotRef}>…</span>
              </p>
              <p className="text-stone-600 text-xs">Prepare yourself, Hoffman</p>
            </div>
          )}

          <button
            className="text-stone-600 hover:text-stone-400 text-xs underline cursor-pointer transition-colors"
            onClick={onBack}
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
