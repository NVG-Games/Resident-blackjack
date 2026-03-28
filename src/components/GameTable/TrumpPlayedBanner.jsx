import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { TRUMP_DEFINITIONS, PERMANENT_TRUMPS } from '../../engine/constants.js';
import { TRUMP_IMAGES } from '../../engine/trumpImages.js';

const BANNER_DURATION_MS = 2400;

export default function TrumpPlayedBanner({ lastPlayedTrump, isGuestOnline = false }) {
  const [visible, setVisible] = useState(null); // { trump, owner, isPermanent }
  const bannerRef = useRef(null);
  const seenIdRef = useRef(null);

  useEffect(() => {
    if (!lastPlayedTrump) return;
    const key = `${lastPlayedTrump.owner}-${lastPlayedTrump.trump.id}`;
    if (key === seenIdRef.current) return;
    seenIdRef.current = key;

    const isPermanent = PERMANENT_TRUMPS.has(lastPlayedTrump.trump.type);
    setVisible({ ...lastPlayedTrump, isPermanent });
  }, [lastPlayedTrump]);

  useEffect(() => {
    if (!visible || !bannerRef.current) return;

    // Animate in
    gsap.fromTo(bannerRef.current,
      { y: 40, opacity: 0, scale: 0.88 },
      { y: 0, opacity: 1, scale: 1, duration: 0.32, ease: 'back.out(1.6)' }
    );

    // Animate out after delay — use setTimeout instead of GSAP onComplete to
    // avoid silent failures when the component unmounts during animation.
    const t = setTimeout(() => {
      if (!bannerRef.current) return;
      gsap.to(bannerRef.current, {
        y: -30, opacity: 0, scale: 0.92, duration: 0.38, ease: 'power2.in',
      });
    }, BANNER_DURATION_MS);
    const tClear = setTimeout(() => setVisible(null), BANNER_DURATION_MS + 380);

    return () => { clearTimeout(t); clearTimeout(tClear); };
  }, [visible]);

  if (!visible) return null;

  const { trump, owner, isPermanent } = visible;
  const def = TRUMP_DEFINITIONS[trump.type] || {};
  const imgSrc = TRUMP_IMAGES[trump.type];

  // Determine display name for who played
  const isBot = owner === 'bot';
  // In online guest mode the engine's "bot" slot is the guest (you)
  const playedByYou = isGuestOnline ? isBot : !isBot;
  const whoLabel = playedByYou ? 'You played' : 'Hoffman played';
  const whoColor = playedByYou ? '#fbbf24' : '#f87171';

  return (
    <div
      ref={bannerRef}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 80,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <div style={{
        background: 'linear-gradient(160deg, #1a1208 0%, #0e0b06 100%)',
        border: `1px solid ${whoColor}44`,
        borderRadius: 10,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: `0 0 32px rgba(0,0,0,0.92), 0 0 0 1px ${whoColor}22`,
        minWidth: 200,
        maxWidth: 280,
      }}>
        {/* Card image */}
        {imgSrc && (
          <img
            src={imgSrc}
            alt={def.name}
            style={{
              width: 44,
              height: 44,
              objectFit: 'cover',
              borderRadius: 5,
              border: `1px solid ${whoColor}33`,
              flexShrink: 0,
            }}
          />
        )}
        {!imgSrc && (
          <div style={{
            width: 44, height: 44, borderRadius: 5,
            background: def.color || '#333',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>
            {def.icon}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Who played */}
          <div style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: whoColor,
            marginBottom: 2,
          }}>
            {whoLabel}
          </div>
          {/* Card name */}
          <div style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 15,
            fontWeight: 700,
            color: '#e8d5b0',
            letterSpacing: '0.04em',
            lineHeight: 1.2,
          }}>
            {def.name || trump.type}
          </div>
          {/* Permanent / Instant tag */}
          <div style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 9,
            color: isPermanent ? '#86efac' : '#fcd34d',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginTop: 3,
          }}>
            {isPermanent ? '⬛ Permanent' : '⚡ Instant'}
          </div>
        </div>
      </div>
    </div>
  );
}
