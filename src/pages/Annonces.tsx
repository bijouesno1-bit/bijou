import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { posterUrl } from '../lib/cloudinary'
import { bg, card, btnGold } from '../lib/ui'
import { useAutoScroll } from '../lib/useAutoScroll'
import { pad } from '../lib/eventNum'
import { ViewModeBar, useViewMode } from '../components/ViewModes'

type Ev = { id: string; num?: number; title: string; date: string; venue: string; city: string; description?: string; poster?: string }

function fmtDate(d: string) {
  if (!d) return ''
  const x = new Date(d)
  return x.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    + ' à ' + x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function dShort(d: string) {
  const x = new Date(d)
  return !d || isNaN(x.getTime()) ? '' : x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
function hShort(d: string) {
  const x = new Date(d)
  return !d || isNaN(x.getTime()) ? '' : x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
const num = (ev: Ev) => (ev.num ? 'N° ' + pad(ev.num) : '')

export default function Annonces() {
  const [events, setEvents] = useState<Ev[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [mode, setMode] = useViewMode('annonces2')
  const [openId, setOpenId] = useState('')
  const rail = useRef<HTMLDivElement>(null)
  const toggleScroll = useAutoScroll(rail, state === 'ok' && events.length > 1 && mode === 'large', 50, 10000, events.length)
  const loopEvents = events.length > 1 ? [...events, ...events, ...events] : events

  useEffect(() => {
    (async () => {
      try {
        const s = await getDocs(query(collection(db, 'events'), where('status', '==', 'published')))
        const limit = Date.now() - 6 * 3600 * 1000
        setEvents(
          s.docs
            .map(d => ({ id: d.id, ...(d.data() as Omit<Ev, 'id'>) }))
            .filter(ev => !ev.date || new Date(ev.date).getTime() > limit)
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        )
        setState('ok')
      } catch {
        setState('error')
      }
    })()
  }, [])

  const has = state === 'ok' && events.length > 0

  return (
    <div className={bg}>
      <h1 className="text-xl text-bijou-goldlight">Événements à venir</h1>
      {has && <ViewModeBar mode={mode} onChange={setMode} />}
      {state === 'loading' && <p className="text-bijou-silver">Chargement…</p>}
      {state === 'error' && <p className="text-bijou-alert text-center">Impossible de charger les annonces. Réessaie dans un instant.</p>}
      {state === 'ok' && events.length === 0 && <p className="text-bijou-silver text-center">Aucun événement à venir pour le moment.</p>}

      {has && mode === 'large' && (
        <div ref={rail} onClick={e => { if (!(e.target as HTMLElement).closest("a,button")) toggleScroll() }} className="flex w-full gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
          {loopEvents.map((ev, i) => (
            <div key={ev.id + '-' + i} className={card + ' shrink-0 w-[85%] max-w-sm'}>
              {ev.poster && <img src={posterUrl(ev.poster, 800)} alt={ev.title} loading="eager" className="w-full rounded-lg object-contain bg-black/30" />}
              <div className="text-center">
                <p className="text-xs text-bijou-silver">{num(ev)}</p>
                <p className="text-lg font-semibold">{ev.title}</p>
                <p className="text-sm text-bijou-goldlight capitalize">{fmtDate(ev.date)}</p>
                <p className="text-sm text-bijou-silver">{ev.venue}, {ev.city}</p>
              </div>
              <Link to={'/reserver?evenement=' + ev.id} className={btnGold + ' w-full text-center'}>Réserver</Link>
            </div>
          ))}
        </div>
      )}

      {has && mode === 'medium' && (
        <div className="w-full max-w-md flex flex-col gap-3">
          {events.map(ev => (
            <div key={ev.id} className="flex gap-3 rounded-xl border border-bijou-gold/40 bg-white/5 p-3">
              {ev.poster
                ? <img src={posterUrl(ev.poster, 300)} alt={ev.title} loading="lazy" className="h-28 w-24 shrink-0 rounded-lg object-cover bg-black/30" />
                : <div className="h-28 w-24 shrink-0 rounded-lg bg-black/30" />}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-xs text-bijou-silver">{num(ev)}</p>
                <p className="font-semibold leading-tight">{ev.title}</p>
                <p className="text-xs text-bijou-goldlight">{dShort(ev.date)} · {hShort(ev.date)}</p>
                <p className="text-xs text-bijou-silver">{ev.venue}, {ev.city}</p>
                {ev.description && <p className="text-xs text-bijou-ivory/80 line-clamp-2">{ev.description}</p>}
                <Link to={'/reserver?evenement=' + ev.id} className={btnGold + ' mt-auto self-start px-3 py-1 text-sm'}>Réserver</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {has && mode === 'compact' && (
        <div className="w-full max-w-md flex flex-col gap-1.5">
          {events.map(ev => {
            const on = openId === ev.id
            return (
              <div key={ev.id} className="rounded-xl border border-bijou-gold/40 bg-white/5">
                <button onClick={() => setOpenId(o => (o === ev.id ? '' : ev.id))} aria-expanded={on} className="flex w-full items-center gap-2 px-2 py-1 text-left">
                  <span className="w-10 shrink-0 text-[10px] text-bijou-goldlight">{num(ev) || '—'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{ev.title}</span>
                    <span className="block text-[11px] text-bijou-silver">{dShort(ev.date)} · {hShort(ev.date)} · {ev.city}</span>
                  </span>
                  <svg viewBox="0 0 24 24" className={'h-4 w-4 shrink-0 text-bijou-goldlight transition-transform ' + (on ? 'rotate-180' : '')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {on && (
                  <div className="flex flex-col gap-2 border-t border-bijou-gold/20 px-2 py-2">
                    <p className="text-sm text-bijou-goldlight capitalize">{fmtDate(ev.date)}</p>
                    <p className="text-sm text-bijou-silver">{ev.venue}, {ev.city}</p>
                    {ev.description && <p className="text-sm">{ev.description}</p>}
                    <Link to={'/reserver?evenement=' + ev.id} className={btnGold + ' w-full text-center'}>Réserver</Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
