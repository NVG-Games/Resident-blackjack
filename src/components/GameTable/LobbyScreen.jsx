import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useLobby, generateRoomCode } from '../../hooks/useLobby.js';
import { usePeerContext } from '../../contexts/PeerContext.jsx';
import { useTelegram } from '../../hooks/useTelegram.js';
import { generateSeed } from '../../engine/deck.js';

const panelStyle = {
  background: 'linear-gradient(160deg, #0d0603 0%, #1a0c07 60%, #0a0402 100%)',
  border: '1px solid #5c2a0e',
  boxShadow: '0 0 40px rgba(180,30,0,0.15), inset 0 0 60px rgba(0,0,0,0.6)',
};

const btnBase =
  'font-cinzel tracking-widest uppercase text-sm px-6 py-3 rounded transition-all duration-200 cursor-pointer select-none';

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
  const { peerId, peerStatus, connStatus, initPeer, connectToPeer, onData, onOpen } = usePeerContext();
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

  // Register data listener: guest receives GAME_INFO from host
  useEffect(() => {
    const unsub = onData((data) => {
      if (data?.type === 'GAME_INFO') {
        onJoinReady({ code: data.code, seed: data.seed, isHost: false });
      }
    });
    return unsub;
  }, [onData, onJoinReady]);

  // Register open listener: host side — a guest connected
  useEffect(() => {
    if (!isHosting) return;
    const unsub = onOpen(() => {
      onHostReady({ code: hostCode, seed: hostSeed, isHost: true });
    });
    return unsub;
  }, [isHosting, hostCode, hostSeed, onOpen, onHostReady]);

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
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #1a0a04 0%, #080402 100%)',
        fontFamily: "'IM Fell English', serif",
      }}
    >
      <div className="w-full max-w-2xl" style={panelStyle}>
        {/* Header */}
        <div className="px-8 pt-8 pb-4 border-b border-red-900/30">
          <h1
            className="font-cinzel text-3xl font-bold text-center tracking-widest uppercase"
            style={{ color: '#c0392b', textShadow: '0 0 20px rgba(192,57,43,0.5)' }}
          >
            ⚔ Online Multiplayer
          </h1>
          <p className="text-stone-500 text-center text-sm mt-1 italic">
            Play against another survivor over the internet
          </p>
          {/* Telegram user badge */}
          {displayName && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="text-base">✈</span>
              <span className="font-cinzel text-xs text-amber-400 tracking-widest">
                {displayName}
              </span>
            </div>
          )}
        </div>

        <div className="p-8 space-y-6">
          {/* Host controls */}
          {!isHosting ? (
            <button
              className={`${btnBase} w-full text-amber-300 border border-amber-700/50 hover:bg-amber-900/20`}
              style={{ background: 'rgba(180,120,0,0.08)' }}
              onClick={handleHostGame}
              disabled={joinStatus === 'connecting'}
            >
              ⚡ Host a Game
            </button>
          ) : (
            <div
              className="rounded p-4 text-center"
              style={{ background: 'rgba(180,30,0,0.1)', border: '1px solid #5c1a0e' }}
            >
              <p className="text-stone-400 text-sm mb-1 font-cinzel">Your Room Code</p>
              <p
                className="font-cinzel text-4xl font-bold tracking-[0.3em]"
                style={{ color: '#e74c3c', textShadow: '0 0 15px rgba(231,76,60,0.5)' }}
              >
                {hostCode}
              </p>
              <p className="text-stone-500 text-xs mt-2 italic">
                {peerStatus === 'registering' && 'Registering with server…'}
                {peerStatus === 'ready' && connStatus !== 'connected' && 'Waiting for opponent…'}
                {connStatus === 'connecting' && 'Opponent is connecting…'}
                {connStatus === 'connected' && 'Opponent connected!'}
              </p>
              <p className="text-stone-700 text-xs mt-1">
                Peer ID: {peerId ?? '…'}
              </p>
              <button
                className="mt-3 text-stone-600 hover:text-stone-400 text-xs underline cursor-pointer"
                onClick={handleCancelHost}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="text-red-400 text-xs font-cinzel text-center py-2 border border-red-900/30 rounded">
              Lobby error: {error}
            </div>
          )}

          {/* Room list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-cinzel text-sm font-bold text-stone-400 uppercase tracking-widest">
                Open Rooms
              </h2>
              <button
                className="text-stone-600 hover:text-red-400 text-xs font-cinzel uppercase tracking-wider cursor-pointer transition-colors"
                onClick={refresh}
              >
                ↻ Refresh
              </button>
            </div>

            <div
              className="rounded min-h-[120px]"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #3a1a08' }}
            >
              {loading && (
                <div className="flex items-center justify-center h-24 text-stone-600 text-sm italic">
                  Scanning for rooms…
                </div>
              )}
              {!loading && rooms.length === 0 && (
                <div className="flex items-center justify-center h-24 text-stone-600 text-sm italic">
                  No open rooms. Be the first to host.
                </div>
              )}
              {!loading &&
                rooms.map((room) => (
                  <RoomRow
                    key={room.code}
                    room={room}
                    onJoin={() => handleJoinRoom(room)}
                    disabled={isHosting || joinStatus === 'connecting'}
                  />
                ))}
            </div>
          </div>

          {/* Manual peer ID connect */}
          <ManualJoin
            initialValue={initialJoinCode ?? ''}
            onJoin={handleManualConnect}
            disabled={isHosting}
            status={joinStatus}
          />
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 flex justify-center border-t border-red-900/20 pt-4">
          <button
            className={`${btnBase} text-stone-500 hover:text-stone-300 text-xs`}
            onClick={onBack}
          >
            ← Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}

function RoomRow({ room, onJoin, disabled }) {
  const hostLabel = room.host_name ?? room.hostName ?? 'Unknown';
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-red-900/10 last:border-b-0 hover:bg-red-900/5 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-lg">🎮</span>
        <div>
          <span className="font-cinzel text-amber-200 tracking-widest text-sm">{room.code}</span>
          <span className="block text-stone-600 text-xs italic">{hostLabel}</span>
        </div>
      </div>
      <button
        className={`${
          disabled
            ? 'text-stone-700 cursor-not-allowed'
            : 'text-red-400 hover:text-red-200 cursor-pointer'
        } font-cinzel text-xs uppercase tracking-widest border border-current rounded px-3 py-1 transition-colors`}
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
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <input
        ref={inputRef}
        type="text"
        placeholder="Enter Peer ID or Room Code manually…"
        disabled={disabled || status === 'connecting'}
        className="flex-1 bg-transparent border border-red-900/30 rounded px-3 py-2 text-stone-300 text-sm placeholder-stone-700 focus:outline-none focus:border-red-700/50 font-cinzel"
      />
      <button
        type="submit"
        disabled={disabled || status === 'connecting'}
        className="font-cinzel tracking-widest uppercase text-xs px-4 py-2 rounded border border-red-900/40 text-red-300 hover:bg-red-900/20 transition-all cursor-pointer"
      >
        {status === 'connecting' ? '…' : 'Connect'}
      </button>
    </form>
  );
}
