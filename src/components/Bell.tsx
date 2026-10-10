import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setBadge } from '../lib/alertFx'
import type { Alert } from '../lib/useAlerts'

type A = { items: Alert[]; unread: Alert[]; markRead: (id: string) => void; markAll: () => void }

export function Bell({ a }: { a: A }) {
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const n = a.unread.length
  const unreadIds = new Set(a.unread.map(x => x.id))
  useEffect(() => { setBadge(n) }, [n])
  return (
    <div className="relative">
      <button aria-label="Notifications" onClick={() => setOpen(o => !o)} className="relative p-2 text-bijou-ink">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {n > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[11px] font-semibold leading-[18px] text-white">{n > 99 ? '99+' : n}</span>}
      </button>
      {open && (
        <div className="fixed top-14 right-2 z-[60] w-80 max-w-[94vw] max-h-[70vh] overflow-y-auto rounded-xl border border-bijou-gold/40 bg-bijou-ink p-2 text-bijou-ivory shadow-xl">
          <div className="flex items-center justify-between px-2 pb-2 text-sm">
            <b>Notifications</b>
            {n > 0 && <button className="underline" onClick={a.markAll}>Tout marquer comme lu</button>}
          </div>
          {a.items.length === 0 && <p className="px-2 py-4 text-sm opacity-70">Rien de nouveau.</p>}
          {a.items.map(x => (
            <button key={x.id} className={'block w-full rounded-lg px-2 py-2 text-left text-sm ' + (unreadIds.has(x.id) ? 'bg-white/10 font-semibold' : 'opacity-60')}
              onClick={() => { a.markRead(x.id); setOpen(false); nav(x.link) }}>
              <span className="block">{x.title}</span>
              <span className="block text-xs font-normal opacity-80">{x.body}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
