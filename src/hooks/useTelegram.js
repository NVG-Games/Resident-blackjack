/**
 * useTelegram — thin wrapper around the Telegram Mini App SDK.
 *
 * Works both inside Telegram (window.Telegram.WebApp available) and in a
 * regular browser (gracefully degrades: isTelegram === false, tgUser === null).
 *
 * Usage:
 *   const { isTelegram, tgUser, openInviteLink, shareInviteLink } = useTelegram()
 */

const BOT_USERNAME = import.meta.env.VITE_TG_BOT_USERNAME || ''

function getTWA() {
  return window.Telegram?.WebApp ?? null
}

export function useTelegram() {
  const twa = getTWA()
  const isTelegram = Boolean(twa?.initData)

  // User object from Telegram — available without any server round-trip
  const tgUser = twa?.initDataUnsafe?.user ?? null

  // Room code passed via deep-link: t.me/BOT?startapp=ROOM-CODE
  const startParam = twa?.initDataUnsafe?.start_param ?? null

  /**
   * Open the Telegram share dialog for the given room code.
   * Inside Telegram: uses openTelegramLink so the user can pick a contact.
   * Outside Telegram: copies the link to clipboard.
   */
  function openInviteLink(roomCode) {
    const url = BOT_USERNAME
      ? `https://t.me/${BOT_USERNAME}?startapp=${roomCode}`
      : null

    if (!url) {
      console.warn('[useTelegram] VITE_TG_BOT_USERNAME is not set — cannot generate invite link')
      return
    }

    if (isTelegram) {
      // Opens the Telegram share sheet
      twa.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}`)
    } else {
      navigator.clipboard?.writeText(url).catch(() => {})
    }

    return url
  }

  /**
   * Returns the raw invite URL without opening anything.
   */
  function getInviteUrl(roomCode) {
    if (!BOT_USERNAME) return null
    return `https://t.me/${BOT_USERNAME}?startapp=${roomCode}`
  }

  return {
    isTelegram,
    tgUser,
    startParam,
    openInviteLink,
    getInviteUrl,
    /** Raw SDK handle — use sparingly */
    twa,
  }
}
