import { useState, useRef, useEffect } from 'react';

export default function NamePrompt({ onSave }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim().slice(0, 32);
    if (trimmed) onSave(trimmed);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9800,
      background: 'rgba(0,0,0,0.82)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'linear-gradient(160deg, #141008 0%, #0e0b06 100%)',
          border: '1px solid rgba(255,209,82,0.22)',
          borderRadius: 12,
          padding: '36px 28px',
          width: '100%',
          maxWidth: 380,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          boxShadow: '0 0 80px rgba(0,0,0,0.95)',
        }}
      >
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: '#e8d5b0', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>
          Enter Your Name
        </div>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#7a6a50', textAlign: 'center', lineHeight: 1.5 }}>
          Your opponent will see this name during the game.
        </div>
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value.slice(0, 32))}
          maxLength={32}
          placeholder="Your name…"
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 18,
            color: '#e8d5b0',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,209,82,0.25)',
            borderRadius: 6,
            padding: '14px 16px',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
            letterSpacing: '0.04em',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,209,82,0.6)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,209,82,0.25)'; }}
        />
        <button
          type="submit"
          disabled={!value.trim()}
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: value.trim() ? '#ffd152' : '#5a4a28',
            background: value.trim() ? 'rgba(255,209,82,0.07)' : 'transparent',
            border: `1px solid ${value.trim() ? 'rgba(255,209,82,0.4)' : 'rgba(255,209,82,0.1)'}`,
            borderRadius: 6,
            padding: '16px 24px',
            cursor: value.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (value.trim()) e.currentTarget.style.background = 'rgba(255,209,82,0.14)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = value.trim() ? 'rgba(255,209,82,0.07)' : 'transparent'; }}
        >
          Continue
        </button>
      </form>
    </div>
  );
}
