import { useCallback, useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 're7_game_history';
const MAX_ENTRIES = 50;

async function loadHistory() {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

async function saveHistory(entries) {
  try {
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(entries) });
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
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHistory().then((entries) => setHistory(entries));
  }, []);

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

  const clearHistory = useCallback(async () => {
    await Preferences.remove({ key: STORAGE_KEY });
    setHistory([]);
  }, []);

  return { history, recordGame, clearHistory };
}
