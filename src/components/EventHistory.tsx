import { useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { card, input } from '../lib/ui'

type Ev = { id: string; title: string; date: string; venue?: string; city?: string; status?: string }
type Tt = { id: string; eventId: string; name: string; price: number; quantity: number; sold: number }

const money = (n: number) => n.toLocaleString('fr-FR') + ' FCFA'

function fmt(d: string) {
  const x = new Date(d)
  if (!d || isNaN(x.getTime())) return d || ''
  return x.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    + ' à ' + x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// Historique des événements passés : du plus récent au plus ancien.
export function EventHistory() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<'no' | 'loading' | 'ok' | 'error'>('no')
  const [events, setEvents] = useState<Ev[]>([])
  const [tickets, setTickets] = useState<Tt[]>([])
  const [year, setYear] = useState('all')

  async function load() {
    setState('loading')
    try {
      const [e, t] = await Promise.all([getDocs(collection(db, 'events')), getDocs(collection(db, 'ticketTypes'))])
      setEvents(e.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Ev, 'id'>) })))
      setTickets(t.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Tt, 'id'>) })))
      setState('ok')
    } catch {
      setState('error')
    }
  }

  const past = useMemo(() => {
    const now = Date.now()
    return events
      .filter(e => e.date && new Date(e.date).getTime() < now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [events])

  const years = useMemo(() => Array.from(new Set(past.map(e => String(new Date(e.date).getFullYear())))), [past])
  const shown = year === 'all' ? past : past.filter(e => String(new Date(e.date).getFullYear()) === year)

  return (
    <div className={card + ' max-w-md'}>
      <button
        className="flex items-center justify-between text-left text-bijou-goldlight font-semibold"
        onClick={() => { const v = !open; setOpen(v); if (v && state === 'no') load() }}
      >
        <span>Historique des événements passés</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-3">
          {state === 'loading' && <p className="text-sm text-bijou-silver">Chargement…</p>}
          {state === 'error' && <p className="text-sm text-bijou-alert">Impossible de charger l'historique.</p>}
          {state === 'ok' && (
            <>
              <select value={year} onChange={e => setYear(e.target.value)} className={input}>
                <option value="all">Toutes les années ({past.length})</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {shown.length === 0 && <p className="text-sm text-bijou-silver text-center">Aucun événement passé.</p>}
              {shown.map(ev => {
                const tts = tickets.filter(t => t.eventId === ev.id)
                const sold = tts.reduce((a, t) => a + (t.sold || 0), 0)
                const cap = tts.reduce((a, t) => a + (t.quantity || 0), 0)
                const rev = tts.reduce((a, t) => a + (t.sold || 0) * (t.price || 0), 0)
                return (
                  <div key={ev.id} className="rounded-lg border border-bijou-silver/30 bg-black/20 p-3 flex flex-col gap-1">
                    <p className="font-semibold">{ev.title}</p>
                    <p className="text-sm text-bijou-goldlight capitalize">{fmt(ev.date)}</p>
                    <p className="text-sm text-bijou-silver">{ev.venue}{ev.venue && ev.city ? ', ' : ''}{ev.city}</p>
                    <p className="text-xs text-bijou-silver">{ev.status === 'published' ? 'Publié' : 'Brouillon'}</p>
                    {tts.length > 0 && (
                      <div className="mt-1 text-sm border-t border-bijou-silver/20 pt-1">
                        {tts.map(t => (
                          <p key={t.id} className="flex justify-between gap-2">
                            <span>{t.name}</span>
                            <span className="text-bijou-silver">{t.sold || 0}/{t.quantity} · {money((t.sold || 0) * (t.price || 0))}</span>
                          </p>
                        ))}
                        <p className="flex justify-between gap-2 text-bijou-goldlight font-semibold mt-1">
                          <span>Total : {sold}/{cap} billets</span><span>{money(rev)}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
