import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'

type Ev = { id: string; title: string; date: string; venue: string; city: string; description: string }
type Tt = { id: string; eventId: string; name: string; price: number; quantity: number; sold: number }

const base = import.meta.env.BASE_URL
const bg = 'min-h-screen bg-gradient-to-br from-[#07070C] to-bijou-navy text-bijou-ivory p-5 flex flex-col items-center gap-4'
const card = 'w-full max-w-md rounded-xl border border-bijou-gold/40 bg-white/5 p-4 flex flex-col gap-3'
const btn = 'rounded-xl border border-bijou-gold/60 px-4 py-2 font-medium active:scale-95 transition text-center'

function fmtDate(d: string) {
  if (!d) return ''
  const x = new Date(d)
  return x.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    + ' à ' + x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function Reserver() {
  const [events, setEvents] = useState<Ev[]>([])
  const [tickets, setTickets] = useState<Tt[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    (async () => {
      try {
        const e = await getDocs(query(collection(db, 'events'), where('status', '==', 'published')))
        const t = await getDocs(query(collection(db, 'ticketTypes'), where('active', '==', true)))
        const limit = Date.now() - 6 * 3600 * 1000
        const evs = e.docs
          .map(d => ({ id: d.id, ...(d.data() as Omit<Ev, 'id'>) }))
          .filter(ev => !ev.date || new Date(ev.date).getTime() > limit)
          .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        setEvents(evs)
        setTickets(t.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Tt, 'id'>) })))
        setState('ok')
      } catch {
        setState('error')
      }
    })()
  }, [])

  return (
    <div className={bg}>
      <img src={`${base}brand/logo-sombre.svg`} alt="BIJOU" className="w-48" />
      <h1 className="text-xl text-bijou-goldlight">Événements</h1>

      {state === 'loading' && <p className="text-bijou-silver">Chargement…</p>}
      {state === 'error' && <p className="text-bijou-alert text-center">Impossible de charger les événements. Réessaie dans un instant.</p>}
      {state === 'ok' && events.length === 0 && <p className="text-bijou-silver text-center">Aucun événement à venir pour le moment.</p>}

      {events.map(ev => (
        <div key={ev.id} className={card}>
          <div>
            <p className="text-lg font-semibold">{ev.title}</p>
            <p className="text-sm text-bijou-goldlight capitalize">{fmtDate(ev.date)}</p>
            <p className="text-sm text-bijou-silver">{ev.venue}, {ev.city}</p>
          </div>
          {ev.description && <p className="text-sm">{ev.description}</p>}
          <div className="flex flex-col gap-2 border-t border-bijou-gold/20 pt-3">
            {tickets.filter(t => t.eventId === ev.id).map(t => {
              const left = t.quantity - t.sold
              return (
                <div key={t.id} className="flex justify-between items-center gap-2">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-bijou-silver">{left > 0 ? `${left} place${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''}` : 'Complet'}</p>
                  </div>
                  <p className="text-bijou-goldlight font-semibold whitespace-nowrap">{t.price.toLocaleString('fr-FR')} FCFA</p>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-bijou-silver text-center">Réservation en ligne bientôt disponible.</p>
        </div>
      ))}

      <Link to="/" className={btn}>Retour à l'accueil</Link>
    </div>
  )
}
