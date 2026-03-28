import { useCallback, useState } from 'react';

const STORAGE_KEY = 're7_game_history';
const MAX_ENTRIES = 50;

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage full or denied — silent fail
  }
}

/**
 * Record shape:
 * {
 *   id: string,
 *   date: number,          // Date.now()
 *   mode: 'ai' | 'hotseat' | 'online' | 'llm',
 *   myName: string,
 *   opponentName: string,
 *   outcome: 'win' | 'loss' | 'draw',
 *   myFinalHP: number,
 *   opponentFinalHP: number,
 *   totalRounds: number,
 *   phases: string[],      // e.g. ['FINGER', 'SHOCK']
 * }
 */

export function useGameHistory() {
  const [history, setHistory] = useState(() => loadHistory());

  const recordGame = useCallback((record) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: Date.now(),
      ...record,
    };
    setHistory(prev => {
      const updated = [entry, ...prev].slice(0, MAX_ENTRIES);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  return { history, recordGame, clearHistory };
}
