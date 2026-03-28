/**
 * PlayerNameLabel — shows a player name truncated to maxChars,
 * with a native title tooltip showing the full name on hover/long-press.
 */
export default function PlayerNameLabel({ name, maxChars = 12, style = {}, className = '' }) {
  if (!name) return null;

  const truncated = name.length > maxChars
    ? name.slice(0, maxChars - 1) + '…'
    : name;

  const needsTooltip = name.length > maxChars;

  return (
    <span
      title={needsTooltip ? name : undefined}
      className={className}
      style={{
        display: 'inline-block',
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        cursor: needsTooltip ? 'help' : 'inherit',
        ...style,
      }}
    >
      {truncated}
    </span>
  );
}
