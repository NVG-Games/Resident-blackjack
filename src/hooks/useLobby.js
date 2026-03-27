import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'peerjs';

/**
 * Lobby system via a well-known "broker" PeerJS ID.
 *
 * Protocol (all messages are plain JS objects):
 *   Host → Broker:  { type: 'ANNOUNCE', room: { code, hostId, hostName, players } }
 *   Guest → Broker: { type: 'LIST' }
 *   Broker → Guest: { type: 'ROOMS', rooms: [...] }
 *   Host → Broker:  { type: 'REMOVE', code }
 *
 * The broker is just another Peer running in a browser tab (first to connect
 * claims the well-known ID). If the well-known ID is already taken, we fall
 * back to a "poor-man" broker that keeps the list in memory and answers LIST queries.
 *
 * In practice the broker role is held by the peerjs-server sidecar (see compose.yaml).
 * Without it, any connected host also acts as an in-process broker.
 */

const BROKER_ID = 're7-21-lobby-broker';

const PEER_CONFIG = (() => {
  const host = import.meta.env.VITE_PEER_HOST;
  const port = import.meta.env.VITE_PEER_PORT ? Number(import.meta.env.VITE_PEER_PORT) : 9000;
  const path = import.meta.env.VITE_PEER_PATH || '/';
  if (host) return { host, port, path, secure: port === 443 };
  return {};
})();

// Generate a readable room code: WORD-NN
const WORDS = ['WOLF', 'BILE', 'GORE', 'BONE', 'VILE', 'DUSK', 'RUST', 'GRIM', 'CLAW', 'RUIN'];
export function generateRoomCode() {
  const w = WORDS[Math.floor(Math.random() * WORDS.length)];
  const n = String(Math.floor(Math.random() * 90) + 10);
  return `${w}-${n}`;
}

/**
 * useLobby — manages room discovery via a broker peer.
 *
 * Returns:
 *   rooms          — current list of open rooms [{ code, hostId, hostName, players }]
 *   isBroker       — whether this client is acting as the broker
 *   announce(room) — host: publish room to broker
 *   remove(code)   — host: remove room from broker
 *   refresh()      — guest: request fresh room list
 *   loading        — true while waiting for room list
 */
export function useLobby() {
  const peerRef = useRef(null);
  const brokerConnRef = useRef(null);
  const [rooms, setRooms] = useState([]);
  const [isBroker, setIsBroker] = useState(false);
  const [loading, setLoading] = useState(false);

  // In-process room list (used when this tab IS the broker)
  const brokerRoomsRef = useRef({});
  // Connections from hosts/guests to us (when broker)
  const brokerConnsRef = useRef([]);

  const broadcastRoomsToBrokerConns = useCallback(() => {
    const rooms = Object.values(brokerRoomsRef.current);
    brokerConnsRef.current.forEach((c) => {
      if (c.open) c.send({ type: 'ROOMS', rooms });
    });
  }, []);

  useEffect(() => {
    const peer = new Peer(BROKER_ID, PEER_CONFIG);
    peerRef.current = peer;

    peer.on('open', () => {
      // We claimed the broker ID — act as broker
      setIsBroker(true);
    });

    peer.on('connection', (conn) => {
      // Only relevant when acting as broker
      brokerConnsRef.current.push(conn);

      conn.on('data', (msg) => {
        if (!msg?.type) return;

        if (msg.type === 'ANNOUNCE') {
          brokerRoomsRef.current[msg.room.code] = msg.room;
          broadcastRoomsToBrokerConns();
        } else if (msg.type === 'REMOVE') {
          delete brokerRoomsRef.current[msg.code];
          broadcastRoomsToBrokerConns();
        } else if (msg.type === 'LIST') {
          conn.send({ type: 'ROOMS', rooms: Object.values(brokerRoomsRef.current) });
        }
      });

      conn.on('close', () => {
        brokerConnsRef.current = brokerConnsRef.current.filter((c) => c !== conn);
      });
    });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // Broker is already running elsewhere — connect to it as a client
        const fallbackPeer = new Peer(PEER_CONFIG);
        peerRef.current = fallbackPeer;
        peer.destroy();

        fallbackPeer.on('open', () => {
          _connectToBroker(fallbackPeer);
        });
      }
    });

    return () => {
      peerRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const _connectToBroker = (peer) => {
    const conn = peer.connect(BROKER_ID, { reliable: true });
    brokerConnRef.current = conn;

    conn.on('data', (msg) => {
      if (msg?.type === 'ROOMS') {
        setRooms(msg.rooms ?? []);
        setLoading(false);
      }
    });
  };

  const announce = useCallback((room) => {
    if (isBroker) {
      brokerRoomsRef.current[room.code] = room;
      broadcastRoomsToBrokerConns();
      setRooms(Object.values(brokerRoomsRef.current));
    } else {
      brokerConnRef.current?.send({ type: 'ANNOUNCE', room });
    }
  }, [isBroker, broadcastRoomsToBrokerConns]);

  const remove = useCallback((code) => {
    if (isBroker) {
      delete brokerRoomsRef.current[code];
      broadcastRoomsToBrokerConns();
      setRooms(Object.values(brokerRoomsRef.current));
    } else {
      brokerConnRef.current?.send({ type: 'REMOVE', code });
    }
  }, [isBroker, broadcastRoomsToBrokerConns]);

  const refresh = useCallback(() => {
    if (isBroker) {
      setRooms(Object.values(brokerRoomsRef.current));
      return;
    }
    setLoading(true);
    if (brokerConnRef.current?.open) {
      brokerConnRef.current.send({ type: 'LIST' });
    } else {
      // Re-connect then ask
      const peer = peerRef.current;
      if (peer) {
        _connectToBroker(peer);
        // Small delay to let connection open
        setTimeout(() => {
          brokerConnRef.current?.send({ type: 'LIST' });
        }, 800);
      }
    }
  }, [isBroker]);

  return { rooms, isBroker, loading, announce, remove, refresh };
}
