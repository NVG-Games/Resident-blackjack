import { useState, useCallback, useEffect } from 'react';
import GameTable from './components/GameTable/GameTable.jsx';
import MainMenu from './components/GameTable/MainMenu.jsx';
import RoleSelect from './components/GameTable/RoleSelect.jsx';
import LobbyScreen from './components/GameTable/LobbyScreen.jsx';
import WaitingRoom from './components/GameTable/WaitingRoom.jsx';
import AssistantMode from './components/GameTable/AssistantMode.jsx';
import GameHistoryScreen from './components/GameTable/GameHistoryScreen.jsx';
import { usePeerContext } from './contexts/PeerContext.jsx';
import { useGameHistory } from './hooks/useGameHistory.js';

// Read Telegram deep-link start_param at boot time (static — won't change during session)
// e.g. opened via t.me/BOT?startapp=WOLF-42
const TG_START_PARAM = window.Telegram?.WebApp?.initDataUnsafe?.start_param ?? null;

export default function App() {
  // screen: 'menu' | 'roleselect' | 'lobby' | 'waiting' | 'game' | 'assistant' | 'history'
  // mode: 'ai' | 'hotseat' | 'online' | 'llm' (game screen modes)
  // If launched via deep-link invite, go straight to lobby with the room code
  const [screen, setScreen] = useState(TG_START_PARAM ? 'lobby' : 'menu');
  const { history, recordGame, clearHistory } = useGameHistory();
  const [gameConfig, setGameConfig] = useState({ mode: 'ai', playerRole: 'clancy' });

  // P2P online config passed through lobby → waiting → game
  // { isHost, code, seed, hostPeerId? }
  const [onlineState, setOnlineState] = useState(null);

  const [disconnectMsg, setDisconnectMsg] = useState(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  const { send, onData, onClose } = usePeerContext();

  // ── Menu ──────────────────────────────────────────────────────────────────
  const handleMenuStart = ({ mode }) => {
    if (mode === 'history') {
      setScreen('history');
      return;
    }
    if (mode === 'ai') {
      setGameConfig({ mode: 'ai', playerRole: 'clancy' });
      setScreen('game');
    } else if (mode === 'hotseat') {
      setScreen('roleselect');
    } else if (mode === 'online') {
      setScreen('lobby');
    } else if (mode === 'assistant') {
      setScreen('assistant');
    } else if (mode === 'llm') {
      setGameConfig({ mode: 'llm', playerRole: 'clancy' });
      setScreen('game');
    }
  };

  // ── Hot-seat role select ──────────────────────────────────────────────────
  const handleRoleConfirm = ({ mode, playerRole }) => {
    setGameConfig({ mode, playerRole });
    setScreen('game');
  };

  // ── Online: host established a connection ─────────────────────────────────
  // LobbyScreen calls this when a guest peer connects (host's onOpen fires)
  const handleHostReady = useCallback(({ code, seed, isHost, myName, opponentName }) => {
    setOnlineState(prev => ({
      ...( prev || {}),
      isHost: true, code, seed, opponentConnected: true,
      myName: myName || prev?.myName,
      opponentName: opponentName || prev?.opponentName,
    }));
    setScreen('waiting');
  }, []);

  // ── Online: guest connected to host ──────────────────────────────────────
  const handleJoinReady = useCallback(({ code, seed, isHost, hostPeerId, myName, opponentName }) => {
    setOnlineState({ isHost: false, code, seed, opponentConnected: true, hostPeerId, myName, opponentName });
    setScreen('waiting');
  }, []);

  // ── WaitingRoom: host clicks "Begin the Ordeal" ───────────────────────────
  const handleWaitingStart = useCallback(() => {
    if (!onlineState) return;
    // Tell the guest to start too
    send({ type: 'HOST_START_GAME', seed: onlineState.seed });
    setGameConfig({
      mode: 'online',
      playerRole: 'clancy', // host is always Clancy
      seed: onlineState.seed,
    });
    setScreen('game');
  }, [onlineState, send]);

  // ── Guest: listen for host's START signal (in lobby or waiting room) ───────
  useEffect(() => {
    const unsub = onData((data) => {
      if (data?.type === 'HOST_START_GAME') {
        setGameConfig({ mode: 'online', playerRole: 'hoffman', seed: data.seed });
        setOnlineState((s) => s ? { ...s, opponentConnected: true } : s);
        setScreen('game');
      }
    });
    return unsub;
  }, [onData]);

  // ── Disconnect handler ────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onClose(() => {
      setScreen((s) => {
        // Only show disconnect modal in lobby/waiting — during an active game
        // PeerJS may briefly close/reopen the connection on network hiccups,
        // so we don't interrupt the game session automatically.
        if (s === 'waiting' || s === 'lobby') {
          setShowDisconnectModal(true);
        }
        return s;
      });
    });
    return unsub;
  }, [onClose]);

  const handleDisconnectModalClose = () => {
    setShowDisconnectModal(false);
    setDisconnectMsg(null);
    setOnlineState(null);
    setScreen('menu');
  };

  // ── Ghost session: player joined a presence-padded room ──────────────────
  const handleGhostGame = useCallback(() => {
    setGameConfig({ mode: 'ai', playerRole: 'clancy', slowBot: true });
    setScreen('game');
  }, []);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const handleBackToMenu = () => {
    setOnlineState(null);
    setDisconnectMsg(null);
    setScreen('menu');
  };

  const handleReturnToMenu = () => {
    setOnlineState(null);
    setDisconnectMsg(null);
    setScreen('menu');
  };

  return (
    <div
      className="grain w-screen overflow-hidden"
      style={{ background: '#0d0805', height: 'var(--app-height, 100dvh)' }}
    >
      {/* Disconnect modal */}
      {showDisconnectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(4px)',
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
          }}
        >
          <div style={{
            background: '#0c0a07',
            border: '1px solid rgba(139,0,0,0.5)',
            borderRadius: 8,
            padding: '32px 28px',
            maxWidth: 320,
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 0 60px rgba(139,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}>
            <div style={{ fontSize: 36 }}>⚠</div>
            <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 20, color: '#e57373', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Connection Lost
            </div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 15, color: '#9c8e76', lineHeight: 1.5 }}>
              Your opponent has left the game.
            </div>
            <button
              onClick={handleDisconnectModalClose}
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '14px 24px',
                background: 'rgba(139,0,0,0.2)',
                border: '1px solid rgba(139,0,0,0.5)',
                borderRadius: 6,
                color: '#f0e2c0',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,0,0,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,0,0,0.2)'; }}
            >
              Return to Menu
            </button>
          </div>
        </div>
      )}
      {screen === 'menu' && (
        <MainMenu onStart={handleMenuStart} />
      )}
      {screen === 'roleselect' && (
        <RoleSelect onConfirm={handleRoleConfirm} onBack={handleBackToMenu} />
      )}
      {screen === 'lobby' && (
        <LobbyScreen
          onBack={handleBackToMenu}
          onHostReady={handleHostReady}
          onJoinReady={handleJoinReady}
          onGhostGame={handleGhostGame}
          initialJoinCode={TG_START_PARAM}
        />
      )}
      {screen === 'waiting' && onlineState && (
        <WaitingRoom
          isHost={onlineState.isHost}
          code={onlineState.code}
          opponentConnected={onlineState.opponentConnected}
          onStart={handleWaitingStart}
          onBack={handleBackToMenu}
        />
      )}
      {screen === 'game' && (
        <GameTable
          mode={gameConfig.mode}
          playerRole={gameConfig.playerRole}
          seed={gameConfig.seed}
          slowBot={gameConfig.slowBot ?? false}
          onReturnToMenu={handleReturnToMenu}
          myName={onlineState?.myName}
          opponentName={onlineState?.opponentName}
          onRecordGame={recordGame}
        />
      )}
      {screen === 'assistant' && (
        <AssistantMode onBack={handleBackToMenu} />
      )}
      {screen === 'history' && (
        <GameHistoryScreen
          history={history}
          onBack={handleBackToMenu}
          onClearHistory={clearHistory}
        />
      )}
    </div>
  );
}
