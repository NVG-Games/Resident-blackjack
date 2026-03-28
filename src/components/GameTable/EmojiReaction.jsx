import { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';

const EMOJIS = [
  '😤', '💀', '😈', '🤡', '😱',
  '👊', '🔥', '❄️', '🫡', '🤝',
  '😭', '😂', '🗿', '💅', '👀',
];

const DISPLAY_DURATION_MS = 2800;
const SCALE_START = 0.75;
const SCALE_END = 0.95;

// Floating emoji that appears above a name, grows, then pops out
export function FloatingEmoji({ emoji, onDone }) {
  const ref = useRef(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!ref.current || !emoji) return;
    const el = ref.current;

    gsap.killTweensOf(el);
    const tl = gsap.timeline({ onComplete: () => onDoneRef.current?.() });
    tl.fromTo(el,
      { scale: SCALE_START, opacity: 0 },
      { scale: SCALE_END, opacity: 1, duration: 0.3, ease: 'back.out(1.6)' }
    )
    .to(el, {
      scale: SCALE_END * 1.3,
      duration: DISPLAY_DURATION_MS / 1000,
      ease: 'power1.inOut',
    })
    .to(el, {
      scale: 1.5,
      opacity: 0,
      duration: 0.18,
      ease: 'power2.in',
    });
  // only re-run when the emoji itself changes, not onDone
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emoji]);

  if (!emoji) return null;

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 44,
        lineHeight: 1,
        pointerEvents: 'none',
        zIndex: 50,
        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))',
        marginBottom: 6,
        opacity: 0,
      }}
    >
      {emoji}
    </div>
  );
}

// Grid emoji picker — appears above the anchor button, clamped to viewport
export function EmojiPicker({ onSelect, anchorRef }) {
  const containerRef = useRef(null);
  const [style, setStyle] = useState(null);

  useEffect(() => {
    const anchor = anchorRef?.current;
    const picker = containerRef.current;
    if (!anchor || !picker) return;

    const aRect = anchor.getBoundingClientRect();
    const pRect = picker.getBoundingClientRect();
    const margin = 8;

    let left = aRect.left + aRect.width / 2 - pRect.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - pRect.width - margin));

    let top = aRect.top - pRect.height - 10;
    if (top < margin) top = aRect.bottom + 10; // flip to below if no space

    setStyle({ top, left });
  // run once after mount so picker is measured
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const items = containerRef.current.querySelectorAll('.emoji-item');
    gsap.fromTo(items,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.18, stagger: 0.02, ease: 'back.out(2)' }
    );
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        // Start off-screen until we measure; after measurement style is applied
        top: style ? style.top : -9999,
        left: style ? style.left : -9999,
        zIndex: 300,
        background: 'rgba(10,8,5,0.97)',
        border: '1px solid rgba(255,209,82,0.22)',
        borderRadius: 10,
        padding: 8,
        boxShadow: '0 4px 32px rgba(0,0,0,0.95)',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 40px)',
        gap: 4,
        pointerEvents: 'all',
      }}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          className="emoji-item"
          onClick={() => onSelect(emoji)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 6,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,209,82,0.12)',
            fontSize: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.1s, background 0.1s, border-color 0.1s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.25)';
            e.currentTarget.style.background = 'rgba(255,209,82,0.12)';
            e.currentTarget.style.borderColor = 'rgba(255,209,82,0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.borderColor = 'rgba(255,209,82,0.12)';
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// Main hook — manages local emoji state and exposes send/receive handlers
export function useEmojiReaction({ isOnline, peerSend, onData, isHost }) {
  const [myEmoji, setMyEmoji] = useState(null);
  const [oppEmoji, setOppEmoji] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const myTimerRef = useRef(null);
  const oppTimerRef = useRef(null);

  // Receive emoji from peer
  useEffect(() => {
    if (!isOnline) return;
    const unsub = onData((msg) => {
      if (msg?.type !== 'EMOJI_REACTION') return;
      clearTimeout(oppTimerRef.current);
      setOppEmoji(msg.emoji);
      oppTimerRef.current = setTimeout(() => setOppEmoji(null), DISPLAY_DURATION_MS + 600);
    });
    return unsub;
  }, [isOnline, onData]);

  const sendEmoji = useCallback((emoji) => {
    setPickerOpen(false);
    clearTimeout(myTimerRef.current);
    setMyEmoji(emoji);
    myTimerRef.current = setTimeout(() => setMyEmoji(null), DISPLAY_DURATION_MS + 600);
    if (isOnline && peerSend) {
      peerSend({ type: 'EMOJI_REACTION', emoji });
    }
  }, [isOnline, peerSend]);

  const togglePicker = useCallback(() => setPickerOpen(v => !v), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);

  return { myEmoji, oppEmoji, pickerOpen, sendEmoji, togglePicker, closePicker };
}
