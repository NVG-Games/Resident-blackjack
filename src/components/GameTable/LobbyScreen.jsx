import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { useLobby, generateRoomCode } from '../../hooks/useLobby.js';
import { usePeerContext } from '../../contexts/PeerContext.jsx';
import { useTelegram } from '../../hooks/useTelegram.js';
import { generateSeed } from '../../engine/deck.js';

const panelStyle = {
  background: 'linear-gradient(160deg, #141008 0%, #0e0b06 60%, #080604 100%)',
  border: '1px solid rgba(255,209,82,0.18)',
  boxShadow: '0 0 80px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,209,82,0.04)',
};

const btnBase =
  'font-cinzel uppercase rounded transition-all duration-200 cursor-pointer select-none';

/**
 * LobbyScreen — online multiplayer lobby.
 * Props:
 *   onBack()                            — go back to main menu
 *   onHostReady({ code, seed, isHost }) — host waiting room ready
 *   onJoinReady({ code, seed, isHost }) — guest waiting room ready
 *   initialJoinCode?                    — pre-fill join code (from deep-link)
 */
export default function LobbyScreen({ onBack, onHostReady, onJoinReady, initialJoinCode }) {
  const containerRef = useRef(null);
  const { rooms, loading, error, announce, remove, refresh } = useLobby();
  const { peerId, peerStatus, connStatus, initPeer, connectToPeer, send, onData, onOpen } = usePeerContext();
  const { tgUser, isTelegram } = useTelegram();

  const [isHosting, setIsHosting] = useState(false);
  const [hostCode, setHostCode] = useState(null);
  const [hostSeed, setHostSeed] = useState(null);
  const [joinStatus, setJoinStatus] = useState(null);

  // Entrance animation
  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
    );
  }, []);

  // Auto-join if opened via deep-link
  useEffect(() => {
    if (!initialJoinCode) return;
    // Wait until rooms are loaded, then try to find and join the room
    if (!loading && rooms.length > 0) {
      const target = rooms.find((r) => r.code === initialJoinCode);
      if (target) handleJoinRoom(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJoinCode, loading, rooms]);

  // Host: when a guest opens the connection, send GAME_INFO and move to waiting room
  useEffect(() => {
    if (!isHosting) return;
    const unsub = onOpen(() => {
      // Send game info to guest so they know the room code and seed
      send({ type: 'GAME_INFO', code: hostCode, seed: hostSeed });
      remove(hostCode); // clean up lobby — game is starting
      onHostReady({ code: hostCode, seed: hostSeed, isHost: true });
    });
    return unsub;
  }, [isHosting, hostCode, hostSeed, onOpen, onHostReady, send]);

  // Guest: receive GAME_INFO from host → move to waiting room
  useEffect(() => {
    const unsub = onData((data) => {
      if (data?.type === 'GAME_INFO') {
        onJoinReady({ code: data.code, seed: data.seed, isHost: false });
      }
    });
    return unsub;
  }, [onData, onJoinReady]);

  // Announce to lobby when peerId is available after hosting
  useEffect(() => {
    if (!isHosting || !peerId || !hostCode) return;
    const hostName = tgUser
      ? (tgUser.first_name + (tgUser.last_name ? ` ${tgUser.last_name}` : ''))
      : 'Clancy';
    announce({
      code: hostCode,
      host_peer_id: peerId,
      host_name: hostName,
      host_tg_id: tgUser?.id ?? null,
      players: 1,
    });
  }, [isHosting, peerId, hostCode, announce, tgUser]);

  const handleHostGame = () => {
    const code = generateRoomCode();
    const seed = generateSeed();
    setHostCode(code);
    setHostSeed(seed);
    setIsHosting(true);
    initPeer();
  };

  const handleFastPlay = () => {
    if (rooms.length > 0) {
      handleJoinRoom(rooms[0]);
    } else {
      handleHostGame();
    }
  };

  const handleCancelHost = () => {
    if (hostCode) remove(hostCode);
    setIsHosting(false);
    setHostCode(null);
    setHostSeed(null);
  };

  const handleJoinRoom = (room) => {
    setJoinStatus('connecting');
    initPeer();
    const hostPeerId = room.host_peer_id ?? room.hostId;
    if (peerId) {
      connectToPeer(hostPeerId);
    } else {
      pendingJoinRef.current = { hostPeerId, intervalId: null };
    }
  };

  const pendingJoinRef = useRef(null);
  useEffect(() => {
    if (!peerId || !pendingJoinRef.current) return;
    const { hostPeerId } = pendingJoinRef.current;
    pendingJoinRef.current = null;
    connectToPeer(hostPeerId);
  }, [peerId, connectToPeer]);

  const handleManualConnect = (remotePeerId) => {
    setJoinStatus('connecting');
    initPeer();
    if (peerId) {
      connectToPeer(remotePeerId);
    } else {
      pendingJoinRef.current = { hostPeerId: remotePeerId, intervalId: null };
    }
  };

  // Telegram user display name
  const displayName = tgUser
    ? `${tgUser.first_name}${tgUser.username ? ` @${tgUser.username}` : ''}`
    : null;

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'radial-gradient(ellipse at 50% 30%, #110d08 0%, #080604 100%)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Desktop: two-column layout wrapper */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: 900,
        margin: '0 auto',
        padding: '0 16px',
        boxSizing: 'border-box',
      }}>
        {/* Header */}
        <div style={{ padding: 'max(10px, env(safe-area-inset-top)) 8px 10px', borderBottom: '1px solid rgba(255,209,82,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            className={btnBase}
            style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#7a6a50', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#e8d5b0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#7a6a50'; }}
            onClick={onBack}
          >
            ← Menu
          </button>
          <h1
            className="font-cinzel font-bold uppercase"
            style={{ color: '#e8d5b0', letterSpacing: '0.12em', fontSize: 26, margin: 0 }}
          >
            Multiplayer
          </h1>
          <div style={{ width: 60 }}>
            {displayName && (
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#7a6a50', textAlign: 'right', display: 'block' }}>
                {displayName}
              </span>
            )}
          </div>
        </div>

        {/* Body — two columns on desktop, single column on mobile */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
          padding: '12px 8px max(12px, env(safe-area-inset-bottom)) 8px',
          alignItems: 'start',
        }}>
          {/* LEFT COLUMN: Host */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Fast Play — primary CTA */}
            <button
              className={btnBase}
              style={{
                width: '100%', fontSize: 20, padding: '18px 24px', letterSpacing: '0.05em',
                color: isHosting || joinStatus === 'connecting' ? '#5a4a28' : '#ffd152',
                background: 'rgba(255,209,82,0.06)',
                border: `1px solid ${isHosting || joinStatus === 'connecting' ? 'rgba(255,209,82,0.1)' : 'rgba(255,209,82,0.45)'}`,
                borderRadius: 6,
                opacity: isHosting || joinStatus === 'connecting' ? 0.4 : 1,
                cursor: isHosting || joinStatus === 'connecting' ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => { if (!isHosting && joinStatus !== 'connecting') { e.currentTarget.style.background = 'rgba(255,209,82,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,209,82,0.7)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,209,82,0.06)'; e.currentTarget.style.borderColor = isHosting || joinStatus === 'connecting' ? 'rgba(255,209,82,0.1)' : 'rgba(255,209,82,0.45)'; }}
              onClick={handleFastPlay}
              disabled={isHosting || joinStatus === 'connecting'}
            >
              ⚡ Fast Play
            </button>

            {/* Host a Game — small, subtle */}
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#5a5040', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Create a room</div>
            {!isHosting ? (
              <button
                className={btnBase}
                style={{
                  width: '100%', fontSize: 13, padding: '9px 16px', letterSpacing: '0.05em',
                  color: '#5a5040', background: 'transparent',
                  border: '1px solid rgba(255,209,82,0.12)', borderRadius: 5,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#7a6a50'; e.currentTarget.style.borderColor = 'rgba(255,209,82,0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#5a5040'; e.currentTarget.style.borderColor = 'rgba(255,209,82,0.12)'; }}
                onClick={handleHostGame}
                disabled={joinStatus === 'connecting'}
              >
                Be Host
              </button>
            ) : (
              <div style={{ borderRadius: 6, padding: '20px 16px', textAlign: 'center', background: 'rgba(255,209,82,0.04)', border: '1px solid rgba(255,209,82,0.2)' }}>
                <p style={{ fontFamily: 'Cinzel, serif', color: '#c4b9a8', fontSize: 13, marginBottom: 8, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Your Room Code</p>
                <p style={{ fontFamily: 'Cinzel, serif', fontSize: 48, fontWeight: 700, letterSpacing: '0.3em', color: '#ffd152', lineHeight: 1, wordBreak: 'break-all' }}>
                  {hostCode}
                </p>
                <p style={{ fontFamily: 'Cinzel, serif', color: '#7a6a50', fontSize: 16, marginTop: 12, fontStyle: 'italic' }}>
                  {peerStatus === 'registering' && 'Setting up…'}
                  {peerStatus === 'ready' && connStatus !== 'connected' && 'Waiting for opponent…'}
                  {connStatus === 'connecting' && 'Connecting…'}
                  {connStatus === 'connected' && '✓ Opponent connected!'}
                </p>
                <button
                  style={{ marginTop: 14, fontFamily: 'Cinzel, serif', color: '#7a6a50', fontSize: 15, textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#e57373'}
                  onMouseLeave={e => e.currentTarget.style.color = '#7a6a50'}
                  onClick={handleCancelHost}
                >
                  Cancel
                </button>
              </div>
            )}

            {error && (
              <div style={{ fontFamily: 'Cinzel, serif', color: '#e57373', fontSize: 15, textAlign: 'center', padding: '10px 12px', border: '1px solid rgba(229,115,115,0.3)', borderRadius: 4 }}>
                {error}
              </div>
            )}

            {/* Manual connect */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#5a5040', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Join by code</div>
              <ManualJoin
                initialValue={initialJoinCode ?? ''}
                onJoin={handleManualConnect}
                disabled={isHosting}
                status={joinStatus}
              />
            </div>
          </div>

          {/* RIGHT COLUMN: Room list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#5a5040', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Open Rooms</span>
              <button
                style={{ fontFamily: 'Cinzel, serif', fontSize: 15, color: '#7a6a50', letterSpacing: '0.05em', cursor: 'pointer', background: 'none', border: 'none', padding: '4px 8px' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#ffd152'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#7a6a50'; }}
                onClick={refresh}
              >
                ↻ Refresh
              </button>
            </div>

            <div style={{ borderRadius: 6, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,209,82,0.08)', minHeight: 200, flex: 1 }}>
              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, fontFamily: 'Cinzel, serif', color: '#7a6a50', fontSize: 18, fontStyle: 'italic' }}>
                  Scanning…
                </div>
              )}
              {!loading && rooms.filter(r => r.code !== hostCode).length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, fontFamily: 'Cinzel, serif', color: '#7a6a50', fontSize: 18, fontStyle: 'italic' }}>
                  No open rooms
                </div>
              )}
              {!loading && rooms.filter(r => r.code !== hostCode).map((room) => (
                <RoomRow
                  key={room.code}
                  room={room}
                  onJoin={() => handleJoinRoom(room)}
                  disabled={isHosting || joinStatus === 'connecting'}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom padding */}
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

function RoomRow({ room, onJoin, disabled }) {
  const hostLabel = room.host_name ?? room.hostName ?? 'Unknown';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid rgba(255,209,82,0.05)', gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <span style={{ fontFamily: 'Cinzel, serif', color: '#e8d5b0', fontSize: 22, letterSpacing: '0.15em', fontWeight: 700 }}>{room.code}</span>
        {hostLabel && hostLabel !== 'Unknown' && (
          <span style={{ display: 'block', fontFamily: 'Cinzel, serif', color: '#7a6a50', fontSize: 14, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hostLabel}</span>
        )}
      </div>
      <button
        style={{
          fontFamily: 'Cinzel, serif', fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: disabled ? '#5a5040' : '#ffd152',
          border: `1px solid ${disabled ? 'rgba(255,209,82,0.1)' : 'rgba(255,209,82,0.4)'}`,
          borderRadius: 3, padding: '10px 18px', background: 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0,
        }}
        onClick={onJoin}
        disabled={disabled}
      >
        Join
      </button>
    </div>
  );
}

function ManualJoin({ onJoin, disabled, status, initialValue }) {
  const inputRef = useRef(null);

  // Pre-fill from deep-link
  useEffect(() => {
    if (initialValue && inputRef.current) {
      inputRef.current.value = initialValue;
    }
  }, [initialValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = inputRef.current?.value.trim();
    if (val) onJoin(val);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        ref={inputRef}
        type="text"
        placeholder="Enter Room Code…"
        disabled={disabled || status === 'connecting'}
        style={{
          width: '100%', background: 'rgba(0,0,0,0.3)', fontFamily: 'Cinzel, serif', fontSize: 18,
          border: '1px solid rgba(255,209,82,0.18)', borderRadius: 4, padding: '14px 16px',
          color: '#e8d5b0', outline: 'none', letterSpacing: '0.05em', boxSizing: 'border-box',
        }}
      />
      <button
        type="submit"
        disabled={disabled || status === 'connecting'}
        style={{
          width: '100%', fontFamily: 'Cinzel, serif', fontSize: 18, letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '14px', borderRadius: 4, cursor: 'pointer',
          color: '#ffd152', background: 'rgba(255,209,82,0.06)', border: '1px solid rgba(255,209,82,0.35)',
        }}
      >
        {status === 'connecting' ? 'Connecting…' : 'Connect by Code'}
      </button>
    </form>
  );
}
