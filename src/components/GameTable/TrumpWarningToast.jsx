import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const TOAST_DURATION_MS = 3200;

export default function TrumpWarningToast({ warning }) {
  const [visible, setVisible] = useState(null);
  const toastRef = useRef(null);
  const seenRef = useRef(null);

  useEffect(() => {
    if (!warning) return;
    if (warning === seenRef.current) return;
    seenRef.current = warning;
    setVisible(warning);
  }, [warning]);

  useEffect(() => {
    if (!visible || !toastRef.current) return;

    gsap.fromTo(toastRef.current,
      { y: 20, opacity: 0, scale: 0.92 },
      { y: 0, opacity: 1, scale: 1, duration: 0.28, ease: 'back.out(1.4)' }
    );

    const tOut = setTimeout(() => {
      if (!toastRef.current) return;
      gsap.to(toastRef.current, { y: -16, opacity: 0, scale: 0.92, duration: 0.3, ease: 'power2.in' });
    }, TOAST_DURATION_MS);
    const tClear = setTimeout(() => setVisible(null), TOAST_DURATION_MS + 300);

    return () => { clearTimeout(tOut); clearTimeout(tClear); };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={toastRef}
      style={{
        position: 'absolute',
        bottom: 90,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 90,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'linear-gradient(135deg, #1c0a0a 0%, #120606 100%)',
        border: '1px solid #b91c1c66',
        borderRadius: 8,
        padding: '9px 16px',
        boxShadow: '0 0 28px rgba(0,0,0,0.9), 0 0 0 1px #b91c1c22',
        maxWidth: 320,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 16 }}>⚠️</span>
      <span style={{
        fontFamily: 'Cinzel, serif',
        fontSize: 12,
        color: '#fca5a5',
        letterSpacing: '0.04em',
        lineHeight: 1.4,
        whiteSpace: 'normal',
      }}>
        {visible}
      </span>
    </div>
  );
}
