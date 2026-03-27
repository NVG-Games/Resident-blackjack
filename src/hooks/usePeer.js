import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'peerjs';

const PEER_CONFIG = (() => {
  const host = import.meta.env.VITE_PEER_HOST;
  const port = import.meta.env.VITE_PEER_PORT ? Number(import.meta.env.VITE_PEER_PORT) : 9000;
  const path = import.meta.env.VITE_PEER_PATH || '/';
  if (host) {
    return { host, port, path, secure: port === 443 };
  }
  // Use public PeerJS cloud when no self-hosted server is configured
  return {};
})();

/**
 * usePeer — manages a single PeerJS Peer + one DataConnection.
 *
 * Usage:
 *   const { peerId, status, init, connect, send, destroy } = usePeer({ onData, onOpen, onClose, onError });
 *
 * status: 'idle' | 'registering' | 'ready' | 'connecting' | 'connected' | 'error' | 'closed'
 */
export function usePeer({ onData, onOpen, onClose, onError } = {}) {
  const peerRef = useRef(null);
  const connRef = useRef(null);
  const onDataRef = useRef(onData);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);

  // Keep callback refs current without re-running effects
  useEffect(() => { onDataRef.current = onData; }, [onData]);
  useEffect(() => { onOpenRef.current = onOpen; }, [onOpen]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const [peerId, setPeerId] = useState(null);
  const [status, setStatus] = useState('idle');

  const attachConn = useCallback((conn) => {
    connRef.current = conn;
    setStatus('connecting');

    conn.on('open', () => {
      setStatus('connected');
      onOpenRef.current?.();
    });

    conn.on('data', (data) => {
      onDataRef.current?.(data);
    });

    conn.on('close', () => {
      connRef.current = null;
      setStatus('ready');
      onCloseRef.current?.();
    });

    conn.on('error', (err) => {
      setStatus('error');
      onErrorRef.current?.(err);
    });
  }, []);

  const init = useCallback((customPeerId) => {
    if (peerRef.current) return;
    setStatus('registering');

    const peer = customPeerId
      ? new Peer(customPeerId, PEER_CONFIG)
      : new Peer(PEER_CONFIG);

    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
      setStatus('ready');
    });

    peer.on('connection', (conn) => {
      // Accept incoming connection (host side)
      attachConn(conn);
    });

    peer.on('error', (err) => {
      setStatus('error');
      onErrorRef.current?.(err);
    });

    peer.on('disconnected', () => {
      setStatus('ready'); // peer still exists, just disconnected from server
      peer.reconnect();
    });

    peer.on('close', () => {
      peerRef.current = null;
      setPeerId(null);
      setStatus('closed');
    });
  }, [attachConn]);

  const connect = useCallback((remotePeerId) => {
    if (!peerRef.current) return;
    const conn = peerRef.current.connect(remotePeerId, { reliable: true });
    attachConn(conn);
  }, [attachConn]);

  const send = useCallback((data) => {
    if (connRef.current?.open) {
      connRef.current.send(data);
    }
  }, []);

  const destroy = useCallback(() => {
    peerRef.current?.destroy();
    peerRef.current = null;
    connRef.current = null;
    setPeerId(null);
    setStatus('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peerRef.current?.destroy();
    };
  }, []);

  return { peerId, status, init, connect, send, destroy };
}
