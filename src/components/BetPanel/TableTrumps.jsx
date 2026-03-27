import TrumpCard from '../TrumpCard/TrumpCard.jsx';

export default function TableTrumps({ playerTableTrumps, botTableTrumps }) {
  const hasAny = playerTableTrumps.length > 0 || botTableTrumps.length > 0;
  if (!hasAny) return null;

  return (
    <div className="flex gap-6 items-start justify-center">
      {botTableTrumps.length > 0 && (
        <TrumpSection label="Hoffman's Table" trumps={botTableTrumps} side="bot" />
      )}
      {playerTableTrumps.length > 0 && (
        <TrumpSection label="Your Table" trumps={playerTableTrumps} side="player" />
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
