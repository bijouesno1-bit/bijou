import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { posterUrl } from '../lib/cloudinary'
import { useAutoScroll } from '../lib/useAutoScroll'

type Ev = { id: string; title: string; date: string; poster?: string }

function dShort(d: string) {
  const x = new Date(d)
  return !d || isNaN(x.getTime()) ? '' : x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Carrousel des événements à venir pour l'accueil.
// Défile seul ; un clic fige et centre l'affiche, un 2e clic relance, un 3e fige.
export default function EventRail() {
  const [events, setEvents] = useState<Ev[]>([])
  const rail = useRef<HTMLDivElement>(null)
  const toggle = useAutoScroll(rail, events.length > 1)

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
      } catch { /* carrousel masqué en cas d'erreur */ }
    })()
  }, [])

  if (events.length === 0) return null

  return (
    <div className="w-full max-w-md">
      <p className="mb-2 text-center text-sm text-bijou-goldlight">Événements à venir</p>
      <div ref={rail} onClick={e => { if (!(e.target as HTMLElement).closest('a,button')) toggle() }}
        className="flex w-full gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {events.map(ev => (
          <div key={ev.id} className="flex w-[72%] max-w-[16rem] shrink-0 flex-col gap-2 rounded-xl border border-bijou-gold/40 bg-white/5 p-2">
            {ev.poster
              ? <img src={posterUrl(ev.poster, 600)} alt={ev.title} loading="eager" className="w-full rounded-lg object-contain bg-black/30" />
              : <div className="aspect-[3/4] w-full rounded-lg bg-black/30" />}
            <div className="text-center">
              <p className="truncate text-sm font-semibold">{ev.title}</p>
              <p className="text-xs text-bijou-goldlight">{dShort(ev.date)}</p>
            </div>
            <Link to={'/reserver?evenement=' + ev.id} className="rounded-xl bg-bijou-gold px-3 py-1.5 text-center text-sm font-semibold text-bijou-ink active:scale-95 transition">Réserver</Link>
          </div>
        ))}
      </div>
    </div>
  )
}
