import { useState } from 'react';
import GameTable from './components/GameTable/GameTable.jsx';
import MainMenu from './components/GameTable/MainMenu.jsx';
import RoleSelect from './components/GameTable/RoleSelect.jsx';

export default function App() {
  // screen: 'menu' | 'roleselect' | 'game'
  const [screen, setScreen] = useState('menu');
  const [gameConfig, setGameConfig] = useState({ mode: 'ai', playerRole: 'clancy' });

  const handleMenuStart = ({ mode }) => {
    if (mode === 'ai') {
      setGameConfig({ mode: 'ai', playerRole: 'clancy' });
      setScreen('game');
    } else {
      setScreen('roleselect');
    }
  };

  const handleRoleConfirm = ({ mode, playerRole }) => {
    setGameConfig({ mode, playerRole });
    setScreen('game');
  };

  const handleBackToMenu = () => setScreen('menu');
  const handleReturnToMenu = () => setScreen('menu');

  return (
    <div className="grain w-screen h-screen overflow-hidden" style={{ background: '#0d0805' }}>
      {screen === 'menu' && (
        <MainMenu onStart={handleMenuStart} />
      )}
      {screen === 'roleselect' && (
        <RoleSelect onConfirm={handleRoleConfirm} onBack={handleBackToMenu} />
      )}
      {screen === 'game' && (
        <GameTable
          mode={gameConfig.mode}
          playerRole={gameConfig.playerRole}
          onReturnToMenu={handleReturnToMenu}
        />
      )}
    </div>
  );
}
