import { useEffect, useState } from 'react'
import { enablePush, pushSupported, syncPush } from '../lib/push'

type St = 'wait' | 'unsupported' | 'off' | 'on' | 'denied' | 'error'
const btn = 'w-full text-center rounded-xl border border-bijou-gold/60 px-3 py-2 text-sm font-medium active:scale-95 transition'

export function PushToggle({ uid }: { uid: string }) {
  const [st, setSt] = useState<St>('wait')
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!(await pushSupported())) { if (alive) setSt('unsupported'); return }
      if (Notification.permission === 'granted') { await syncPush(uid); if (alive) setSt('on') }
      else if (alive) setSt(Notification.permission === 'denied' ? 'denied' : 'off')
    })()
    return () => { alive = false }
  }, [uid])
  if (st === 'wait') return null
  if (st === 'on') return <p className="text-xs text-center text-bijou-goldlight">Alertes téléphone activées</p>
  if (st === 'unsupported') return <p className="text-xs text-center text-bijou-silver">Alertes téléphone indisponibles ici (iPhone : ajoute d'abord l'app à l'écran d'accueil).</p>
  if (st === 'denied') return <p className="text-xs text-center text-bijou-alert">Alertes bloquées : autorise les notifications dans les réglages du navigateur.</p>
  return (
    <>
      <button className={btn} onClick={async () => { const r = await enablePush(uid); setSt(r === 'on' ? 'on' : r === 'denied' ? 'denied' : 'error') }}>Activer les alertes téléphone</button>
      {st === 'error' && <p className="text-xs text-center text-bijou-alert">Activation impossible, réessaie.</p>}
    </>
  )
}
