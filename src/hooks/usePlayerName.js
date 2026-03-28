/**
 * usePlayerName — resolves the local player's display name.
 *
 * Priority:
 *   1. Telegram user (first_name + last_name)
 *   2. localStorage value saved from manual entry
 *   3. null (caller should prompt)
 */

import { useState, useCallback } from 'react';
import { useTelegram } from './useTelegram.js';

const LS_KEY = 'rj_player_name';
const MAX_NAME_LEN = 32;

export function getStoredName() {
  try {
    return localStorage.getItem(LS_KEY) || null;
  } catch {
    return null;
  }
}

export function saveStoredName(name) {
  try {
    const trimmed = name.trim().slice(0, MAX_NAME_LEN);
    if (trimmed) localStorage.setItem(LS_KEY, trimmed);
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

  const [localName, setLocalName] = useState(() => getStoredName());

  const resolvedName = tgName || localName;

  const saveName = useCallback((name) => {
    const saved = saveStoredName(name);
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
