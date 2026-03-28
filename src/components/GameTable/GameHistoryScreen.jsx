import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';

const MODE_LABELS = {
  ai: 'vs AI',
  hotseat: 'Local Duel',
  online: 'Online',
  llm: 'vs Claude',
};

const PHASE_LABELS = {
  FINGER: 'Finger',
  SHOCK: 'Shock',
  SAW: 'Saw',
};

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 2) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function OutcomePip({ outcome }) {
  const cfg = {
    win:  { color: '#ffd152', label: 'WIN',  glow: 'rgba(255,209,82,0.4)' },
    loss: { color: '#e57373', label: 'LOSS', glow: 'rgba(229,115,115,0.4)' },
    draw: { color: '#8a9aaa', label: 'DRAW', glow: 'rgba(138,154,170,0.3)' },
  }[outcome] || { color: '#8a9aaa', label: '?', glow: 'transparent' };

  return (
    <div style={{
      fontFamily: 'Cinzel, serif',
      fontWeight: 900,
      fontSize: 13,
      letterSpacing: '0.12em',
      color: cfg.color,
      textShadow: `0 0 10px ${cfg.glow}`,
      minWidth: 42,
      textAlign: 'center',
    }}>
      {cfg.label}
    </div>
  );
}

function HPBar({ value, max = 10, color }) {
  const alive = color === 'amber' ? '#f59e0b' : '#dc2626';
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: max }, (_, i) => (
        <div key={i} style={{
          width: 7,
          height: 12,
          borderRadius: 1,
          background: i < value ? alive : '#2a2520',
          border: i < value ? 'none' : '1px solid #3a3530',
          flexShrink: 0,
        }} />
      ))}
    </div>
  );
}

function HistoryEntry({ entry, idx }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current,
      { x: -20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.35, delay: idx * 0.04, ease: 'power2.out' }
    );
  }, [idx]);

  const { outcome, myName, opponentName, mode, myFinalHP, opponentFinalHP, totalRounds, finalPhase, date } = entry;
  const borderColor = outcome === 'win'
    ? 'rgba(255,209,82,0.18)'
    : outcome === 'loss'
    ? 'rgba(229,115,115,0.15)'
    : 'rgba(138,154,170,0.12)';

  return (
    <div
      ref={ref}
      style={{
        background: '#0e0c09',
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        opacity: 0,
      }}
    >
      {/* Top row: outcome + mode + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <OutcomePip outcome={outcome} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#c4b9a8', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {myName} <span style={{ color: '#5a5040', fontWeight: 400 }}>vs</span> {opponentName}
          </div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#8a7a60', letterSpacing: '0.06em', marginTop: 2 }}>
            {MODE_LABELS[mode] || mode}
            {finalPhase && <span style={{ marginLeft: 6 }}>· {PHASE_LABELS[finalPhase] || finalPhase} phase</span>}
            {totalRounds > 0 && <span style={{ marginLeft: 6 }}>· {totalRounds} round{totalRounds !== 1 ? 's' : ''}</span>}
          </div>
        </div>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#7a6a50', textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {formatDate(date)}
        </div>
      </div>

      {/* Bottom row: HP bars */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#8a7a60', letterSpacing: '0.08em' }}>YOU</div>
          <HPBar value={myFinalHP} color="amber" />
        </div>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#7a6a50' }}>vs</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#8a7a60', letterSpacing: '0.08em' }}>OPP</div>
          <HPBar value={opponentFinalHP} color="red" />
        </div>
        <div style={{ flex: 1, textAlign: 'right', fontFamily: 'Cinzel, serif', fontSize: 12, color: '#9a8a70' }}>
          {myFinalHP} — {opponentFinalHP} HP
        </div>
      </div>
    </div>
  );
}

function StatsBar({ history }) {
  const total = history.length;
  if (total === 0) return null;
  const wins = history.filter(e => e.outcome === 'win').length;
  const losses = history.filter(e => e.outcome === 'loss').length;
  const draws = history.filter(e => e.outcome === 'draw').length;
  const winRate = Math.round((wins / total) * 100);

  return (
    <div style={{
      display: 'flex',
      gap: 0,
      background: '#0a0806',
      border: '1px solid rgba(255,209,82,0.08)',
      borderRadius: 6,
      overflow: 'hidden',
      marginBottom: 16,
    }}>
      {[
        { label: 'Played', value: total, color: '#7a6a50' },
        { label: 'Won', value: wins, color: '#ffd152' },
        { label: 'Lost', value: losses, color: '#e57373' },
        { label: 'Draw', value: draws, color: '#8a9aaa' },
        { label: 'Win%', value: `${winRate}%`, color: winRate >= 50 ? '#ffd152' : '#e57373' },
      ].map((s, i, arr) => (
        <div key={s.label} style={{
          flex: 1,
          padding: '10px 8px',
          textAlign: 'center',
          borderRight: i < arr.length - 1 ? '1px solid rgba(255,209,82,0.06)' : 'none',
        }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 18, color: s.color, lineHeight: 1 }}>{s.value}</div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#8a7a60', letterSpacing: '0.08em', marginTop: 3 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function GameHistoryScreen({ history, onBack, onClearHistory }) {
  const containerRef = useRef(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmClearTimerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(containerRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
    );
  }, []);

  const handleClear = () => {
    if (confirmClear) {
      clearTimeout(confirmClearTimerRef.current);
      onClearHistory();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      clearTimeout(confirmClearTimerRef.current);
      confirmClearTimerRef.current = setTimeout(() => setConfirmClear(false), 4000);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col"
      style={{
        background: 'radial-gradient(ellipse at 50% 20%, #120e08 0%, #080604 60%, #030201 100%)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        opacity: 0,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 20px 12px',
        borderBottom: '1px solid rgba(255,209,82,0.08)',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 13,
            color: '#7a6a50',
            background: 'none',
            border: '1px solid rgba(255,209,82,0.15)',
            borderRadius: 4,
            padding: '6px 14px',
            cursor: 'pointer',
            letterSpacing: '0.06em',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#e8d5b0'; e.currentTarget.style.borderColor = 'rgba(255,209,82,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#7a6a50'; e.currentTarget.style.borderColor = 'rgba(255,209,82,0.15)'; }}
        >
          ← Back
        </button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 20, color: '#e8d5b0', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            History
          </span>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClear}
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: 12,
              color: confirmClear ? '#ef4444' : '#7a6a50',
              background: 'none',
              border: `1px solid ${confirmClear ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 4,
              padding: '6px 12px',
              cursor: 'pointer',
              letterSpacing: '0.05em',
              transition: 'all 0.2s',
            }}
          >
            {confirmClear ? 'Confirm' : 'Clear'}
          </button>
        )}
      </div>

      {/* Body — scrollable */}
      <div
        data-scroll
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
        }}
      >
        {history.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60%',
            gap: 16,
          }}>
            <div style={{ fontSize: 48, opacity: 0.15 }}>🃏</div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#7a6a50', letterSpacing: '0.12em', textAlign: 'center' }}>
              No games played yet
            </div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#6a5a40', textAlign: 'center', maxWidth: 240, lineHeight: 1.6 }}>
              Complete a game to see it recorded here
            </div>
          </div>
        ) : (
          <>
            <StatsBar history={history} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map((entry, idx) => (
                <HistoryEntry key={entry.id} entry={entry} idx={idx} />
              ))}
            </div>
            <div style={{ height: 24 }} />
          </>
        )}
      </div>
    </div>
  );
}
