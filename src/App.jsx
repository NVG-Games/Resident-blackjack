import { useState, useRef, useCallback } from 'react';
import GameTable from './components/GameTable/GameTable.jsx';
import MainMenu from './components/GameTable/MainMenu.jsx';
import RoleSelect from './components/GameTable/RoleSelect.jsx';
import LobbyScreen from './components/GameTable/LobbyScreen.jsx';
import WaitingRoom from './components/GameTable/WaitingRoom.jsx';

export default function App() {
  // screen: 'menu' | 'roleselect' | 'lobby' | 'waiting' | 'game'
  const [screen, setScreen] = useState('menu');
  const [gameConfig, setGameConfig] = useState({ mode: 'ai', playerRole: 'clancy' });

  // P2P online config passed through lobby → waiting → game
  // { isHost, code, seed, hostPeerId? }
  const [onlineState, setOnlineState] = useState(null);

  // ── Menu ──────────────────────────────────────────────────────────────────
  const handleMenuStart = ({ mode }) => {
    if (mode === 'ai') {
      setGameConfig({ mode: 'ai', playerRole: 'clancy' });
      setScreen('game');
    } else if (mode === 'hotseat') {
      setScreen('roleselect');
    } else if (mode === 'online') {
      setScreen('lobby');
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
    setGameConfig({
      mode: 'online',
      playerRole: 'clancy', // host is always Clancy
      seed: onlineState.seed,
    });
    setScreen('game');
  }, [onlineState]);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const handleBackToMenu = () => {
    setOnlineState(null);
    setScreen('menu');
  };

  const handleReturnToMenu = () => {
    setOnlineState(null);
    setScreen('menu');
  };

  return (
    <div className="grain w-screen h-screen overflow-hidden" style={{ background: '#0d0805' }}>
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
    </div>
  );
}
