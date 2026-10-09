import { useState, type ReactNode } from 'react'
import { posterUrl } from '../lib/cloudinary'
import { card } from '../lib/ui'
import { pad } from '../lib/eventNum'
import { ViewModeBar, useViewMode, type Mode } from './ViewModes'

type E = { id: string; num?: number; title: string; date?: string; venue?: string; city?: string; status?: string; poster?: string; description?: string }

function fd(s?: string) {
  const x = new Date(s ?? '')
  if (!s || isNaN(x.getTime())) return ''
  return x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function AdminModes({ children }: { children: (m: Mode) => ReactNode }) {
  const [mode, setMode] = useViewMode('admin')
  return (<><ViewModeBar mode={mode} onChange={setMode} />{children(mode)}</>)
}

export function AdminEv({ ev, vm, children }: { ev: E; vm: Mode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  if (vm === 'large') return <div className={card}>{children}</div>
  const pub = ev.status === 'published'
  return (
    <div className={card}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex w-full items-center gap-3 text-left">
        {vm === 'medium' && (ev.poster
          ? <img src={posterUrl(ev.poster, 300)} alt={ev.title} loading="lazy" className="h-20 w-16 shrink-0 rounded-lg object-cover bg-black/30" />
          : <span className="block h-20 w-16 shrink-0 rounded-lg bg-black/30" />)}
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-bijou-goldlight">{ev.num ? 'N° ' + pad(ev.num) : '—'}</span>
          <span className="block truncate font-semibold">{ev.title}</span>
          <span className="block text-xs text-bijou-silver">{fd(ev.date)}{ev.city ? ' · ' + ev.city : ''}</span>
          {vm === 'medium' && ev.description ? <span className="block text-xs line-clamp-2">{ev.description}</span> : null}
        </span>
        <span className={'shrink-0 text-xs ' + (pub ? 'text-bijou-ok' : 'text-bijou-silver')}>{pub ? 'Publié' : 'Brouillon'}</span>
        <svg viewBox="0 0 24 24" className={'h-5 w-5 shrink-0 transition-transform ' + (open ? 'rotate-180' : '')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && <div className="mt-3 flex flex-col gap-2 border-t border-bijou-gold/20 pt-3">{children}</div>}
    </div>
  )
}
