/**
 * PeerContext — singleton PeerJS peer that survives screen transitions.
 *
 * The peer is created once (lazily on first use) and lives for the app lifetime.
 * Both LobbyScreen and GameTable share the same Peer instance and DataConnection
 * through this context, so navigating between screens doesn't destroy the connection.
 */
import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import Peer from 'peerjs';

const PEER_CONFIG = (() => {
  const host = import.meta.env.VITE_PEER_HOST;
  const port = import.meta.env.VITE_PEER_PORT ? Number(import.meta.env.VITE_PEER_PORT) : 9000;
  const path = import.meta.env.VITE_PEER_PATH || '/';
  if (host) return { host, port, path, secure: port === 443 };
  return {};
})();

const PeerContext = createContext(null);

export function PeerProvider({ children }) {
  const peerRef = useRef(null);
  const connRef = useRef(null);
  const dataListenersRef = useRef(new Set());
  const openListenersRef = useRef(new Set());
  const closeListenersRef = useRef(new Set());

  const [peerId, setPeerId] = useState(null);
  const [connStatus, setConnStatus] = useState('idle'); // idle|connecting|connected|closed|error
  const [peerStatus, setPeerStatus] = useState('idle'); // idle|registering|ready|error

  const attachConn = useCallback((conn) => {
    connRef.current = conn;
    setConnStatus('connecting');

    conn.on('open', () => {
      setConnStatus('connected');
      openListenersRef.current.forEach((fn) => fn());
    });

    conn.on('data', (data) => {
      dataListenersRef.current.forEach((fn) => fn(data));
    });

    conn.on('close', () => {
      connRef.current = null;
      setConnStatus('idle');
      closeListenersRef.current.forEach((fn) => fn());
    });

    conn.on('error', () => {
      setConnStatus('error');
    });
  }, []);

  const initPeer = useCallback((customId) => {
    if (peerRef.current) return; // already initialised
    setPeerStatus('registering');

    const peer = customId ? new Peer(customId, PEER_CONFIG) : new Peer(PEER_CONFIG);
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
      setPeerStatus('ready');
    });

    peer.on('connection', (conn) => {
      attachConn(conn);
    });

    peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') return; // connection-level, not fatal
      setPeerStatus('error');
    });

    peer.on('disconnected', () => {
      peer.reconnect();
    });
  }, [attachConn]);

  const connectToPeer = useCallback((remotePeerId) => {
    if (!peerRef.current) return;
    const conn = peerRef.current.connect(remotePeerId, { reliable: true });
    attachConn(conn);
  }, [attachConn]);

  const send = useCallback((data) => {
    if (connRef.current?.open) connRef.current.send(data);
  }, []);

  const destroyPeer = useCallback(() => {
    peerRef.current?.destroy();
    peerRef.current = null;
    connRef.current = null;
    setPeerId(null);
    setPeerStatus('idle');
    setConnStatus('idle');
  }, []);

  // Listeners that survive screen changes
  const onData = useCallback((fn) => {
    dataListenersRef.current.add(fn);
    return () => dataListenersRef.current.delete(fn);
  }, []);

  const onOpen = useCallback((fn) => {
    openListenersRef.current.add(fn);
    return () => openListenersRef.current.delete(fn);
  }, []);

  const onClose = useCallback((fn) => {
    closeListenersRef.current.add(fn);
    return () => closeListenersRef.current.delete(fn);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { peerRef.current?.destroy(); }, []);

  const value = {
    peerId,
    peerStatus,
    connStatus,
    initPeer,
    connectToPeer,
    send,
    destroyPeer,
    onData,
    onOpen,
    onClose,
    getConn: () => connRef.current,
  };

  return <PeerContext.Provider value={value}>{children}</PeerContext.Provider>;
}

export function usePeerContext() {
  const ctx = useContext(PeerContext);
  if (!ctx) throw new Error('usePeerContext must be used inside PeerProvider');
  return ctx;
}
