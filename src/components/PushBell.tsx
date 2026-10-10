import { useCallback, useEffect, useState } from 'react'
import { enablePush, pushSupported, syncPush } from '../lib/push'

export type PushSt = 'wait' | 'unsupported' | 'off' | 'on' | 'denied' | 'error'
export type PushCtl = { st: PushSt; activate: () => Promise<void>; msg: string }

export function usePush(uid: string, enabled: boolean): PushCtl {
  const [st, setSt] = useState<PushSt>('wait')
  const [msg, setMsg] = useState('')
  useEffect(() => {
    if (!enabled || !uid) { setSt('wait'); return }
    let alive = true
    ;(async () => {
      if (!(await pushSupported())) { if (alive) setSt('unsupported'); return }
      if (Notification.permission === 'granted') { await syncPush(uid); if (alive) setSt('on') }
      else if (alive) setSt(Notification.permission === 'denied' ? 'denied' : 'off')
    })()
    return () => { alive = false }
  }, [uid, enabled])
  const activate = useCallback(async () => {
    const r = await enablePush(uid)
    setSt(r === 'on' ? 'on' : r === 'denied' ? 'denied' : 'error')
    setMsg(r === 'on' ? 'Alertes téléphone activées' : r === 'denied' ? 'Alertes bloquées : autorise les notifications dans les réglages du navigateur' : 'Activation impossible, réessaie')
    setTimeout(() => setMsg(''), 4000)
  }, [uid])
  return { st, activate, msg }
}

export function PushBell({ push }: { push: PushCtl }) {
  return (
    <button aria-label="Activer les alertes téléphone" onClick={() => { void push.activate() }} className="relative shrink-0 p-1.5 text-bijou-ink">
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" /><path d="M4 4l16 16" />
      </svg>
    </button>
  )
}

export function PushStartToast({ push }: { push: PushCtl }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (push.st !== 'off') return
    try { if (sessionStorage.getItem('push_hint')) return } catch { /* ignore */ }
    setShow(true)
    const t = setTimeout(() => {
      setShow(false)
      try { sessionStorage.setItem('push_hint', '1') } catch { /* ignore */ }
    }, 6000)
    return () => clearTimeout(t)
  }, [push.st])
  const hint = show && push.st === 'off'
  if (!hint && !push.msg) return null
  return (
    <div className="print:hidden fixed top-16 inset-x-0 z-[70] flex justify-center px-3 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-bijou-gold/60 bg-bijou-ink px-4 py-2 text-sm text-bijou-ivory shadow-lg">
        <span className="min-w-0 leading-tight">{hint ? 'Active les alertes téléphone pour ne rien manquer' : push.msg}</span>
        {hint && <button onClick={() => { void push.activate() }} className="shrink-0 rounded-lg border border-bijou-gold px-2 py-1 text-xs font-medium text-bijou-goldlight">Activer</button>}
      </div>
    </div>
  )
}
