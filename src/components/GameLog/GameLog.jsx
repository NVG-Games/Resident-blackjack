import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

// Atmospheric RE7-style prefixes
const ATMOSPHERIC_PREFIXES = [
  '', '', '', // empty = direct message (higher chance)
  'Lucas smirks. ',
  'The room hums. ',
  'Silence. ',
  'A single bulb flickers. ',
];

function getPrefix() {
  return ATMOSPHERIC_PREFIXES[Math.floor(Math.random() * ATMOSPHERIC_PREFIXES.length)];
}

function LogEntry({ entry, isLatest }) {
  const ref = useRef(null);

  useEffect(() => {
    if (isLatest && ref.current) {
      gsap.fromTo(ref.current,
        { x: -10, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [isLatest]);

  return (
    <div ref={ref} className={`py-1 px-2 rounded text-xs font-fell italic leading-relaxed border-l-2 ${
      isLatest
        ? 'text-stone-200 border-red-800 bg-black/30'
        : 'text-stone-500 border-stone-800'
    }`}>
      {entry.msg}
    </div>
  );
}

export default function GameLog({ log }) {
  const containerRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  const displayLog = log.slice(-20); // Show last 20 entries

  return (
    <div className="flex flex-col h-full">
      <div className="font-cinzel text-xs text-stone-600 uppercase tracking-widest mb-2 px-2">
        Event Log
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto scrollbar-dark space-y-1 pr-1"
        style={{ maxHeight: '160px' }}
      >
        {displayLog.length === 0 ? (
          <div className="text-stone-700 font-fell italic text-xs px-2">
            The game has not yet begun...
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
    </div>
  );
}
