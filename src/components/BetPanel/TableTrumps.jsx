import { useState, useEffect, useRef } from 'react';
import TrumpCard from '../TrumpCard/TrumpCard.jsx';

const FLASH_DURATION_MS = 2800;

export default function TableTrumps({ playerTableTrumps, botTableTrumps, lastInstantTrump, isGuestOnline = false }) {
  // Flash state: show the instant trump briefly after use
  const [flashEntry, setFlashEntry] = useState(null); // { trump, owner, fading }
  const timerRef = useRef(null);

  useEffect(() => {
    if (!lastInstantTrump) return;
    // New instant trump played — start flash
    clearTimeout(timerRef.current);
    setFlashEntry({ ...lastInstantTrump, fading: false });
    // Start fade-out at 70% of duration
    timerRef.current = setTimeout(() => {
      setFlashEntry(prev => prev ? { ...prev, fading: true } : null);
    }, FLASH_DURATION_MS * 0.7);
    // Remove completely after full duration
    const removeTimer = setTimeout(() => {
      setFlashEntry(null);
    }, FLASH_DURATION_MS);
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(removeTimer);
    };
  }, [lastInstantTrump]);

  const hasAny = playerTableTrumps.length > 0 || botTableTrumps.length > 0 || flashEntry;
  if (!hasAny) return null;

  // For guest online: engine's "bot" slot = guest (you), engine's "player" slot = opponent
  const myTrumps = isGuestOnline ? botTableTrumps : playerTableTrumps;
  const theirTrumps = isGuestOnline ? playerTableTrumps : botTableTrumps;
  const theirLabel = isGuestOnline ? "Opponent's Table" : "Hoffman's Table";

  // Determine which side the flash belongs to for display
  const flashOwner = flashEntry?.owner; // 'player' | 'bot'
  const flashIsTheirSide = isGuestOnline ? flashOwner === 'player' : flashOwner === 'bot';
  const flashIsMySide = flashEntry && !flashIsTheirSide;

  return (
    <div className="flex gap-6 items-start justify-center">
      {(theirTrumps.length > 0 || (flashEntry && flashIsTheirSide)) && (
        <TrumpSection
          label={theirLabel}
          trumps={theirTrumps}
          side="bot"
          flashEntry={flashIsTheirSide ? flashEntry : null}
        />
      )}
      {(myTrumps.length > 0 || (flashEntry && flashIsMySide)) && (
        <TrumpSection
          label="Your Table"
          trumps={myTrumps}
          side="player"
          flashEntry={flashIsMySide ? flashEntry : null}
        />
      )}
    </div>
  );
}

function TrumpSection({ label, trumps, side, flashEntry }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: side === 'bot' ? '#f87171' : '#fbbf24' }}>{label}</span>
      <div className="flex gap-1 flex-wrap justify-center">
        {trumps.map(trump => (
          <TrumpCard
            key={trump.id}
            trump={trump}
            isOnTable={true}
            size="mini"
          />
        ))}
        {flashEntry && (
          <div style={{
            opacity: flashEntry.fading ? 0 : 1,
            transition: flashEntry.fading ? `opacity ${FLASH_DURATION_MS * 0.3}ms ease-out` : 'none',
            position: 'relative',
          }}>
            <TrumpCard
              trump={flashEntry.trump}
              isOnTable={true}
              size="mini"
            />
            {/* "USED" badge overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.55)',
              borderRadius: 4,
              pointerEvents: 'none',
            }}>
              <span style={{
                fontFamily: 'Cinzel, serif',
                fontSize: 9,
                fontWeight: 700,
                color: '#e8d5b0',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textShadow: '0 1px 4px rgba(0,0,0,0.9)',
              }}>USED</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
