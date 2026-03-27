import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

function LogEntry({ entry, isLatest }) {
  const ref = useRef(null);

  useEffect(() => {
    if (isLatest && ref.current) {
      gsap.fromTo(ref.current,
        { x: -8, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.25, ease: 'power2.out' }
      );
    }
  }, [isLatest]);

  return (
    <div ref={ref} style={{
      padding: '5px 10px',
      borderRadius: 3,
      fontFamily: 'Cinzel, serif',
      fontSize: 18,
      lineHeight: 1.5,
      borderLeft: isLatest ? '2px solid rgba(255,209,82,0.6)' : '2px solid rgba(255,255,255,0.08)',
      color: isLatest ? '#e8d5b0' : '#5a5040',
    }}>
      {entry.msg}
    </div>
  );
}

export default function GameLog({ log }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  const displayLog = log.slice(-6);

  return (
    <div className="flex flex-col gap-0.5 overflow-hidden">
      {displayLog.length === 0 ? (
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#3a3020', padding: '0 8px', fontStyle: 'italic' }}>
          Waiting to begin…
        </div>
      ) : (
        displayLog.map((entry, idx) => (
          <LogEntry
            key={`${entry.time}-${idx}`}
            entry={entry}
            isLatest={idx === displayLog.length - 1}
          />
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}
