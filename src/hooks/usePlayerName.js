/**
 * usePlayerName — resolves the local player's display name.
 *
 * Priority:
 *   1. Telegram user (first_name + last_name)
 *   2. Capacitor Preferences value saved from manual entry
 *   3. null (caller should prompt)
 */

import { useState, useCallback, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { useTelegram } from './useTelegram.js';

const LS_KEY = 'rj_player_name';
const MAX_NAME_LEN = 32;

export async function getStoredName() {
  try {
    const { value } = await Preferences.get({ key: LS_KEY });
    return value || null;
  } catch {
    return null;
  }
}

export async function saveStoredName(name) {
  try {
    const trimmed = name.trim().slice(0, MAX_NAME_LEN);
    if (trimmed) await Preferences.set({ key: LS_KEY, value: trimmed });
    return trimmed;
  } catch {
    return name.trim().slice(0, MAX_NAME_LEN);
  }
}

export function usePlayerName() {
  const { tgUser, isTelegram } = useTelegram();

  const tgName = tgUser
    ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ').slice(0, MAX_NAME_LEN)
    : null;

  const [localName, setLocalName] = useState(null);

  useEffect(() => {
    getStoredName().then((stored) => {
      if (stored) setLocalName(stored);
    });
  }, []);

  const resolvedName = tgName || localName;

  const saveName = useCallback(async (name) => {
    const saved = await saveStoredName(name);
    setLocalName(saved);
    return saved;
  }, []);

  return {
    name: resolvedName,       // null if unknown
    isTelegram,
    tgName,
    localName,
    saveName,
    needsPrompt: !resolvedName, // true if we should ask the user their name
  };
}
