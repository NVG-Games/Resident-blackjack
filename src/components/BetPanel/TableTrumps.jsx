import TrumpCard from '../TrumpCard/TrumpCard.jsx';

export default function TableTrumps({ playerTableTrumps, botTableTrumps, isGuestOnline = false }) {
  const hasAny = playerTableTrumps.length > 0 || botTableTrumps.length > 0;
  if (!hasAny) return null;

  // For guest online: engine's "bot" slot = guest (you), engine's "player" slot = opponent
  const myTrumps = isGuestOnline ? botTableTrumps : playerTableTrumps;
  const theirTrumps = isGuestOnline ? playerTableTrumps : botTableTrumps;
  const theirLabel = isGuestOnline ? "Opponent's Table" : "Hoffman's Table";

  return (
    <div className="flex gap-6 items-start justify-center">
      {theirTrumps.length > 0 && (
        <TrumpSection label={theirLabel} trumps={theirTrumps} side="bot" />
      )}
      {myTrumps.length > 0 && (
        <TrumpSection label="Your Table" trumps={myTrumps} side="player" />
      )}
    </div>
  );
}

function TrumpSection({ label, trumps, side }) {
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
      </div>
    </div>
  );
}
