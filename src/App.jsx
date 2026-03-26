import { useState } from 'react';
import GameTable from './components/GameTable/GameTable.jsx';
import StartScreen from './components/GameTable/StartScreen.jsx';

export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <div className="grain w-screen h-screen overflow-hidden" style={{ background: '#0d0805' }}>
      {started ? (
        <GameTable />
      ) : (
        <StartScreen onStart={() => setStarted(true)} />
      )}
    </div>
  );
}
