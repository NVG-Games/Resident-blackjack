import { useState, useCallback, useEffect } from 'react';
import GameTable from './components/GameTable/GameTable.jsx';
import MainMenu from './components/GameTable/MainMenu.jsx';
import RoleSelect from './components/GameTable/RoleSelect.jsx';
import LobbyScreen from './components/GameTable/LobbyScreen.jsx';
import WaitingRoom from './components/GameTable/WaitingRoom.jsx';
import AssistantMode from './components/GameTable/AssistantMode.jsx';
import { usePeerContext } from './contexts/PeerContext.jsx';

// Read Telegram deep-link start_param at boot time (static — won't change during session)
// e.g. opened via t.me/BOT?startapp=WOLF-42
const TG_START_PARAM = window.Telegram?.WebApp?.initDataUnsafe?.start_param ?? null;

export default function App() {
  // screen: 'menu' | 'roleselect' | 'lobby' | 'waiting' | 'game' | 'assistant'
  // mode: 'ai' | 'hotseat' | 'online' | 'llm' (game screen modes)
  // If launched via deep-link invite, go straight to lobby with the room code
  const [screen, setScreen] = useState(TG_START_PARAM ? 'lobby' : 'menu');
  const [gameConfig, setGameConfig] = useState({ mode: 'ai', playerRole: 'clancy' });

  // P2P online config passed through lobby → waiting → game
  // { isHost, code, seed, hostPeerId? }
  const [onlineState, setOnlineState] = useState(null);

  const [disconnectMsg, setDisconnectMsg] = useState(null);

  const { send, onData, onClose } = usePeerContext();

  // ── Menu ──────────────────────────────────────────────────────────────────
  const handleMenuStart = ({ mode }) => {
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
  const handleHostReady = useCallback(({ code, seed, isHost }) => {
    setOnlineState({ isHost: true, code, seed, opponentConnected: true });
    setScreen('waiting');
  }, []);

  // ── Online: guest connected to host ──────────────────────────────────────
  const handleJoinReady = useCallback(({ code, seed, isHost, hostPeerId }) => {
    setOnlineState({ isHost: false, code, seed, opponentConnected: true, hostPeerId });
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
      // Only show disconnect if we're actively in a multiplayer session
      setDisconnectMsg('Opponent disconnected.');
      // If in game, return to menu after a moment
      setScreen((s) => {
        if (s === 'game' || s === 'waiting') {
          setTimeout(() => {
            setDisconnectMsg(null);
            setOnlineState(null);
          }, 3000);
          return 'menu';
        }
        return s;
      });
    });
    return unsub;
  }, [onClose]);

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
      style={{
        background: '#0d0805',
        height: '100dvh',
        boxSizing: 'border-box',
      }}
    >
      {/* Disconnect notification */}
      {disconnectMsg && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-3 px-4 font-cinzel text-sm tracking-widest uppercase"
          style={{ background: 'rgba(139,0,0,0.95)', borderBottom: '1px solid #8b0000', color: '#f0e2c0' }}
        >
          ⚠ {disconnectMsg}
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
          onReturnToMenu={handleReturnToMenu}
        />
      )}
      {screen === 'assistant' && (
        <AssistantMode onBack={handleBackToMenu} />
      )}
    </div>
  );
}
