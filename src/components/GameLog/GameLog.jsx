import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { createPortal } from 'react-dom';

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
      fontSize: 13,
      lineHeight: 1.55,
      borderLeft: isLatest ? '2px solid rgba(255,209,82,0.6)' : '2px solid rgba(255,255,255,0.06)',
      color: isLatest ? '#e8d5b0' : '#5a5040',
    }}>
      {entry.msg}
    </div>
  );
}

// Sidebar version — full scrollable log for desktop
export function GameLogSidebar({ log }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      <div style={{
        fontFamily: 'Cinzel, serif',
        fontSize: 11,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'rgba(255,209,82,0.35)',
        padding: '14px 12px 8px',
        borderBottom: '1px solid rgba(255,209,82,0.08)',
        flexShrink: 0,
      }}>
        Game Log
      </div>
      <div data-scroll style={{
        flex: 1,
        overflowY: 'auto',
        padding: '6px 4px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,209,82,0.15) transparent',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
      }}>
        {log.length === 0 ? (
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: '#3a3020', padding: '8px 10px', fontStyle: 'italic' }}>
            Waiting to begin…
          </div>
        ) : (
          log.map((entry, idx) => (
            <LogEntry
              key={`${entry.time}-${idx}`}
              entry={entry}
              isLatest={idx === log.length - 1}
            />
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// Modal version — for mobile
export function GameLogModal({ log, onClose }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'instant' });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9500,
        background: 'rgba(0,0,0,0.78)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        touchAction: 'none',
      }}
    >
        <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'linear-gradient(180deg, #121008 0%, #0c0a06 100%)',
          borderTop: '1px solid rgba(255,209,82,0.18)',
          borderRadius: '16px 16px 0 0',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.92)',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          touchAction: 'pan-y',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 12px',
          borderBottom: '1px solid rgba(255,209,82,0.08)',
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: 17, fontWeight: 700, color: '#ffd152', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Game Log
          </span>
          <button
            onClick={onClose}
            style={{ fontFamily: 'Cinzel, serif', fontSize: 22, color: '#7a6a50', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }}
            onMouseEnter={e => e.currentTarget.style.color = '#e8d5b0'}
            onMouseLeave={e => e.currentTarget.style.color = '#7a6a50'}
          >
            ✕
          </button>
        </div>

        {/* Scrollable entries */}
        <div data-scroll style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,209,82,0.15) transparent',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
        }}>
          {log.length === 0 ? (
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#3a3020', padding: '8px 10px', fontStyle: 'italic' }}>
              Waiting to begin…
            </div>
          ) : (
            log.map((entry, idx) => (
              <LogEntry
                key={`${entry.time}-${idx}`}
                entry={entry}
                isLatest={idx === log.length - 1}
              />
            ))
          )}
          <div ref={endRef} />
        </div>
      </div>
    </div>,
    document.body
  );
}

// Legacy default export (unused but kept for safety)
export default function GameLog({ log }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  const displayLog = log.slice(-6);

  return (
    <div className="flex flex-col gap-0.5 overflow-hidden">
      {displayLog.length === 0 ? (
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#3a3020', padding: '0 8px', fontStyle: 'italic' }}>
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
