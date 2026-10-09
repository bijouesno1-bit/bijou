import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { posterUrl } from '../lib/cloudinary'
import { bg, card, btnGold } from '../lib/ui'
import { useAutoScroll } from '../lib/useAutoScroll'

type Ev = { id: string; title: string; date: string; venue: string; city: string; description?: string; poster?: string }

function fmtDate(d: string) {
  if (!d) return ''
  const x = new Date(d)
  return x.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    + ' à ' + x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function Annonces() {
  const [events, setEvents] = useState<Ev[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const rail = useRef<HTMLDivElement>(null)
  useAutoScroll(rail, state === 'ok' && events.length > 1)

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

  return (
    <div className={bg}>
      <h1 className="text-xl text-bijou-goldlight">Événements à venir</h1>
      {state === 'loading' && <p className="text-bijou-silver">Chargement…</p>}
      {state === 'error' && <p className="text-bijou-alert text-center">Impossible de charger les annonces. Réessaie dans un instant.</p>}
      {state === 'ok' && events.length === 0 && <p className="text-bijou-silver text-center">Aucun événement à venir pour le moment.</p>}
      {state === 'ok' && events.length > 0 && (
        <div ref={rail} className="flex w-full gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
          {events.map(ev => (
            <div key={ev.id} className={card + ' shrink-0 w-[85%] max-w-sm'}>
              {ev.poster && <img src={posterUrl(ev.poster, 800)} alt={ev.title} loading="lazy" className="w-full rounded-lg object-contain bg-black/30" />}
              <div className="text-center">
                <p className="text-lg font-semibold">{ev.title}</p>
                <p className="text-sm text-bijou-goldlight capitalize">{fmtDate(ev.date)}</p>
                <p className="text-sm text-bijou-silver">{ev.venue}, {ev.city}</p>
              </div>
              <Link to={'/reserver?evenement=' + ev.id} className={btnGold + ' w-full text-center'}>Réserver</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
