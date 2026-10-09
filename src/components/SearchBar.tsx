import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { input } from '../lib/ui'

type Ev = { id: string; title: string; date: string; venue: string; city: string; description?: string; status?: string }
type Rq = { id: string; customerName?: string; phone?: string; email?: string; ticketName?: string; eventId?: string; status?: string }

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function dateText(d: string) {
  if (!d) return ''
  const x = new Date(d)
  if (isNaN(x.getTime())) return d
  const long = x.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hm = x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${long} ${hm} ${x.toLocaleDateString('fr-FR')} ${d.slice(0, 10)}`
}

function shortDate(d: string) {
  if (!d) return ''
  const x = new Date(d)
  if (isNaN(x.getTime())) return d
  return x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' +
    x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function match(hay: string, q: string) {
  const toks = norm(q).split(/\s+/).filter(Boolean)
  return toks.length > 0 && toks.every(t => hay.includes(t))
}

export function SearchBar() {
  const { isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [events, setEvents] = useState<Ev[]>([])
  const [reqs, setReqs] = useState<Rq[]>([])
  const [loaded, setLoaded] = useState<'no' | 'loading' | 'ok' | 'error'>('no')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || loaded !== 'no') return
    setLoaded('loading')
    ;(async () => {
      try {
        let evs: Ev[] = []
        if (isAdmin) {
          try {
            const s = await getDocs(collection(db, 'events'))
            evs = s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Ev, 'id'>) }))
          } catch { /* repli sur les événements publiés */ }
          try {
            const r = await getDocs(collection(db, 'requests'))
            setReqs(r.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Rq, 'id'>) })))
          } catch { /* ignoré */ }
        }
        if (evs.length === 0) {
          const s = await getDocs(query(collection(db, 'events'), where('status', '==', 'published')))
          evs = s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Ev, 'id'>) }))
        }
        setEvents(evs)
        setLoaded('ok')
      } catch {
        setLoaded('error')
      }
    })()
  }, [open, loaded, isAdmin])

  useEffect(() => { if (open) setTimeout(() => ref.current?.focus(), 50) }, [open])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  const titleOf = useMemo(() => new Map(events.map(e => [e.id, e.title])), [events])

  const evRes = useMemo(() => {
    if (!q.trim()) return []
    return events
      .filter(e => match(norm([e.title, e.venue, e.city, e.description ?? '', dateText(e.date)].join(' ')), q))
      .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' }))
      .slice(0, 30)
  }, [events, q])

  const rqRes = useMemo(() => {
    if (!q.trim() || !isAdmin) return []
    return reqs
      .filter(r => match(norm([r.customerName ?? '', r.phone ?? '', (r.phone ?? '').replace(/\D/g, ''), r.email ?? '', r.ticketName ?? '', titleOf.get(r.eventId ?? '') ?? ''].join(' ')), q))
      .sort((a, b) => (a.customerName || '').localeCompare(b.customerName || '', 'fr', { sensitivity: 'base' }))
      .slice(0, 30)
  }, [reqs, q, isAdmin, titleOf])

  const close = () => { setOpen(false); setQ('') }
  const empty = q.trim() && loaded === 'ok' && evRes.length === 0 && rqRes.length === 0

  return (
    <>
      <button aria-label="Rechercher" onClick={() => setOpen(v => !v)} className="p-2 text-bijou-ink">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
        </svg>
      </button>
      {open && (
        <div className="print:hidden fixed top-14 inset-x-0 bottom-0 z-[65] bg-bijou-ink/98 text-bijou-ivory overflow-y-auto p-4" style={{ backgroundColor: 'rgba(7,7,12,0.98)' }}>
          <div className="mx-auto max-w-md flex flex-col gap-3">
            <div className="flex gap-2">
              <input ref={ref} type="search" value={q} onChange={e => setQ(e.target.value)} className={input}
                placeholder={isAdmin ? 'Événement, date, ville, nom, numéro, e-mail…' : 'Événement, date, ville, lieu…'} />
              <button onClick={close} aria-label="Fermer" className="px-3 text-bijou-goldlight">✕</button>
            </div>
            {loaded === 'loading' && <p className="text-sm text-bijou-silver text-center">Chargement…</p>}
            {loaded === 'error' && <p className="text-sm text-bijou-alert text-center">Recherche indisponible pour le moment.</p>}
            {empty && <p className="text-sm text-bijou-silver text-center">Aucun résultat.</p>}
            {evRes.length > 0 && <p className="text-xs tracking-widest text-bijou-goldlight">ÉVÉNEMENTS ({evRes.length})</p>}
            {evRes.map(e => (
              <Link key={e.id} onClick={close}
                to={isAdmin && e.status !== 'published' ? '/admin?t=evenements' : '/reserver?evenement=' + e.id}
                className="rounded-xl border border-bijou-gold/40 px-4 py-3 active:scale-95 transition">
                <p className="font-semibold">{e.title}{e.status && e.status !== 'published' ? <span className="ml-2 text-xs text-bijou-silver">({e.status})</span> : null}</p>
                <p className="text-sm text-bijou-goldlight">{shortDate(e.date)}</p>
                <p className="text-sm text-bijou-silver">{e.venue}{e.venue && e.city ? ', ' : ''}{e.city}</p>
              </Link>
            ))}
            {rqRes.length > 0 && <p className="text-xs tracking-widest text-bijou-goldlight mt-2">DEMANDES ({rqRes.length})</p>}
            {rqRes.map(r => (
              <Link key={r.id} to="/admin?t=demandes" onClick={close} className="rounded-xl border border-bijou-silver/30 px-4 py-3 active:scale-95 transition">
                <p className="font-semibold">{r.customerName || 'Sans nom'}</p>
                <p className="text-sm text-bijou-silver">{r.phone}{r.phone && r.email ? ' · ' : ''}{r.email}</p>
                <p className="text-sm text-bijou-goldlight">{titleOf.get(r.eventId ?? '') ?? ''}{r.ticketName ? ' · ' + r.ticketName : ''}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
