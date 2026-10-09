import { useEffect, useState } from 'react'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
const KEY = 'bijou-install-ferme'
const DAYS = 7

function recentlyClosed() {
  try {
    const t = Number(localStorage.getItem(KEY) || 0)
    return t > 0 && Date.now() - t < DAYS * 86400000
  } catch { return false }
}

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function InstallBanner() {
  const [evt, setEvt] = useState<InstallEvent | null>(null)
  const [hidden, setHidden] = useState(() => isInstalled() || recentlyClosed())
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvent) }
    const onInstalled = () => { setEvt(null); setHidden(true) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function close() {
    try { localStorage.setItem(KEY, String(Date.now())) } catch { /* ignoré */ }
    setHidden(true)
  }

  async function install() {
    if (!evt) return
    await evt.prompt()
    const r = await evt.userChoice
    setEvt(null)
    if (r.outcome === 'accepted') setHidden(true)
  }

  if (hidden || (!evt && !ios)) return null
  return (
    <div className="print:hidden mx-auto mt-3 w-[calc(100%-1.5rem)] max-w-md rounded-xl border border-bijou-gold/40 bg-white/5 px-3 py-2 flex items-center gap-3 text-bijou-ivory">
      {evt ? (
        <>
          <p className="flex-1 text-sm">Installer BIJOU sur ton écran d'accueil</p>
          <button onClick={install} className="rounded-lg bg-bijou-gold text-bijou-ink px-3 py-1.5 text-sm font-semibold active:scale-95 transition">Installer</button>
        </>
      ) : (
        <p className="flex-1 text-sm">Pour installer BIJOU : touche « Partager », puis « Sur l'écran d'accueil ».</p>
      )}
      <button aria-label="Fermer" onClick={close} className="p-1 text-bijou-silver">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  )
}
