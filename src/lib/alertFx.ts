const PREFS = 'alerts_prefs'
type Prefs = { sound: boolean; vibrate: boolean }
export const getPrefs = (): Prefs => {
  try { return { sound: true, vibrate: true, ...JSON.parse(localStorage.getItem(PREFS) || '{}') } }
  catch { return { sound: true, vibrate: true } }
}
export const setPrefs = (p: Prefs) => localStorage.setItem(PREFS, JSON.stringify(p))

let audio: HTMLAudioElement | null = null
let unlocked = false
export function initFx(soundUrl: string) {
  if (audio) return
  audio = new Audio(soundUrl)
  audio.preload = 'auto'
  const unlock = () => { unlocked = true; window.removeEventListener('pointerdown', unlock) }
  window.addEventListener('pointerdown', unlock)
}
export function ring() {
  const p = getPrefs()
  if (p.sound && unlocked && audio) { audio.currentTime = 0; audio.play().catch(() => {}) }
  if (p.vibrate && 'vibrate' in navigator) navigator.vibrate([200, 100, 200])
}
export function setBadge(n: number) {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
  try {
    if (n > 0) Promise.resolve(nav.setAppBadge?.(n)).catch(() => {})
    else Promise.resolve(nav.clearAppBadge?.()).catch(() => {})
  } catch { /* ignore */ }
}
