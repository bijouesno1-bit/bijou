import { bg, card, btn, btnGold, input } from '../lib/ui'
import { stockInfo } from '../lib/stock'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { PAY_LABEL } from '../lib/requests'
import { Venues } from '../components/Venues'

type Ev = { id: string; title: string; date: string; venue: string; city: string; description: string }
type Tt = { id: string; eventId: string; name: string; price: number; quantity: number; sold: number; reserved?: number; kind?: string; persons?: number; zone?: string; validUntil?: string | null }

const base = import.meta.env.BASE_URL

function fmtDate(d: string) {
  if (!d) return ''
  const x = new Date(d)
  return x.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    + ' à ' + x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function ReserveForm({ eventId, tt, left, ready, onClose }: { eventId: string; tt: Tt; left: number; ready: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [qty, setQty] = useState(1)
  const [pay, setPay] = useState('cash')
  const [allowed, setAllowed] = useState<string[]>(Object.keys(PAY_LABEL))
  useEffect(() => {
    getDoc(doc(db, 'settings', 'payment'))
      .then(s => {
        const m = (s.data() as { methods?: string[] } | undefined)?.methods
        if (Array.isArray(m)) {
          setAllowed(m)
          setPay(p => (m.includes(p) ? p : (m[0] ?? '')))
        }
      })
      .catch(() => { /* ignoré */ })
  }, [])
  const [comment, setComment] = useState('')
  const [hp, setHp] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const max = Math.max(1, Math.min(10, left))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    if (hp || !ready) return
    let last = 0
    try { last = Number(localStorage.getItem('bijou_last_req') || 0) } catch { /* ignore */ }
    if (Date.now() - last < 60000) { setErr('Patiente une minute avant une nouvelle demande.'); return }
    setBusy(true)
    try {
      const ref = await addDoc(collection(db, 'requests'), {
        eventId,
        ticketTypeId: tt.id,
        ticketName: tt.name,
        unitPrice: tt.price,
        quantity: qty,
        total: tt.price * qty,
        customerName: name.trim(),
        phone: phone.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        paymentMethod: pay,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      try { localStorage.setItem('bijou_last_req', String(Date.now())) } catch { /* ignore */ }
      nav(`/demande/${ref.id}`)
    } catch {
      setErr('Demande refusée : stock insuffisant ou informations invalides. Recharge la page et réessaie.')
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-lg border border-bijou-gold/30 bg-black/20 p-3">
      <input className={input} placeholder="Nom et prénom" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" />
      <input className={input} type="tel" placeholder="Téléphone" value={phone} onChange={e => setPhone(e.target.value)} required minLength={6} maxLength={20} autoComplete="tel" />
      <input className={input} type="email" placeholder="E-mail (facultatif)" value={email} onChange={e => setEmail(e.target.value)} maxLength={120} autoComplete="email" />
      <div className="flex gap-2">
        <select className={input} value={qty} onChange={e => setQty(Number(e.target.value))}>
          {Array.from({ length: max }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} billet{n > 1 ? 's' : ''}</option>)}
        </select>
        <select className={input} value={pay} onChange={e => setPay(e.target.value)}>
          {allowed.filter(k => k in PAY_LABEL).length === 0
            ? <option value="">Aucun moyen de paiement disponible</option>
            : allowed.filter(k => k in PAY_LABEL).map(k => <option key={k} value={k}>{PAY_LABEL[k]}</option>)}
        </select>
      </div>
      <textarea className={input} rows={2} placeholder="Commentaire (facultatif)" value={comment} onChange={e => setComment(e.target.value)} maxLength={300} />
      <input value={hp} onChange={e => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <p className="text-sm">Total : <b className="text-bijou-goldlight">{(tt.price * qty).toLocaleString('fr-FR')} FCFA</b></p>
      <p className="text-xs text-bijou-silver">Ta demande sera examinée par l'organisateur. Aucun billet n'est émis avant son accord et la confirmation du paiement.</p>
      {!ready && <p className="text-bijou-alert text-sm">Les réservations ne sont pas encore ouvertes.</p>}
      {err && <p className="text-bijou-alert text-sm">{err}</p>}
      <button className={btnGold} disabled={busy || !ready}>{busy ? 'Envoi…' : 'Envoyer ma demande'}</button>
      <button type="button" className={btn} onClick={onClose}>Annuler</button>
    </form>
  )
}

export default function Reserver() {
  const [events, setEvents] = useState<Ev[]>([])
  const [tickets, setTickets] = useState<Tt[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [open, setOpen] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    getDoc(doc(db, 'settings', 'payment'))
      .then(s => setReady(s.exists() && String((s.data() as { organizerWa?: string }).organizerWa ?? '').replace(/\D/g, '').length >= 8))
      .catch(() => setReady(false))
  }, [])

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
          <div className="flex flex-col gap-3 border-t border-bijou-gold/20 pt-3">
            {tickets.filter(t => t.eventId === ev.id).map(t => {
              const left = t.quantity - t.sold - (t.reserved ?? 0)
              return (
                <div key={t.id} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center gap-2">
                    <div>
                      <p className="font-medium">{t.name}</p>
                      {((t.persons ?? 1) > 1 || t.zone || (t.price === 0 && t.kind !== 'invitation')) && <p className="text-xs text-bijou-goldlight">{[(t.persons ?? 1) > 1 && `Valable pour ${t.persons} personnes`, t.zone, t.price === 0 && t.kind !== 'invitation' && 'Gratuit sur validation'].filter(Boolean).join(' · ')}</p>}
                      <p className="text-xs text-bijou-silver">{left > 0 ? `${left} place${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''}` : 'Complet'}{left > 0 && stockInfo(t).label && <span className="ml-2 font-semibold text-bijou-goldlight">{stockInfo(t).label}</span>}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {t.kind === 'invitation' ? <p className="text-bijou-goldlight font-semibold whitespace-nowrap">Entrée gratuite</p> : <p className="text-bijou-goldlight font-semibold whitespace-nowrap">{t.price.toLocaleString('fr-FR')} FCFA</p>}
                      {t.kind !== 'invitation' && left > 0 && open !== t.id && <button className={btn + ' py-1 text-sm'} onClick={() => setOpen(t.id)}>Réserver</button>}
                    </div>
                  </div>
                  {open === t.id && left > 0 && <ReserveForm eventId={ev.id} tt={t} left={left} ready={ready} onClose={() => setOpen('')} />}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <Venues />
      <Link to="/" className={btn}>Retour à l'accueil</Link>
    </div>
  )
}
