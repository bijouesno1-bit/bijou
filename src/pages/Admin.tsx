import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AdminPaymentSettings } from '../components/AdminPaymentSettings'
import { AdminRequests } from '../components/AdminRequests'
import { AdminAgents } from '../components/AdminAgents'
import { LoginForm } from '../components/LoginForm'
import { CopyUid } from '../components/CopyUid'
import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'

type Ev = { id: string; title: string; date: string; venue: string; city: string; description: string; status: string }
type Tt = { id: string; eventId: string; name: string; price: number; quantity: number; sold: number; active: boolean }

const base = import.meta.env.BASE_URL
const bg = 'min-h-screen bg-gradient-to-br from-[#07070C] to-bijou-navy text-bijou-ivory p-5 flex flex-col items-center gap-4'
const card = 'w-full max-w-md rounded-xl border border-bijou-gold/40 bg-white/5 p-4 flex flex-col gap-3'
const input = 'w-full rounded-lg bg-black/40 border border-bijou-silver/40 px-3 py-2 text-bijou-ivory'
const btn = 'rounded-xl border border-bijou-gold/60 px-4 py-2 font-medium active:scale-95 transition text-center'
const btnGold = 'rounded-xl bg-bijou-gold text-bijou-ink px-4 py-2 font-semibold active:scale-95 transition'

function Header({ title }: { title: string }) {
  return (
    <>
      <img src={`${base}brand/logo-sombre.svg`} alt="BIJOU" className="w-48" />
      <h1 className="text-xl text-bijou-goldlight">{title}</h1>
    </>
  )
}

function NotAdmin() {
  const { user, logout } = useAuth()
  return (
    <div className={bg}>
      <Header title="Accès non autorisé" />
      <div className={card}>
        <p className="text-sm text-bijou-silver">
          Ce compte n'est pas encore déclaré administrateur. Dans la console Firebase, ouvre Firestore, crée la collection <b>users</b>
          et un document dont l'ID est l'UID ci-dessous, avec les champs <b>role</b> (string) = admin et <b>active</b> (boolean) = true. Puis recharge cette page.
        </p>
        <CopyUid uid={user?.uid ?? ""} />
        <button className={btn} onClick={logout}>Se déconnecter</button>
      </div>
    </div>
  )
}

function TicketForm({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [qty, setQty] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      await addDoc(collection(db, 'ticketTypes'), {
        eventId, name: name.trim(), price: Number(price), quantity: Number(qty),
        sold: 0, active: true, createdAt: serverTimestamp(),
      })
      setName(''); setPrice(''); setQty('')
      onDone()
    } catch {
      window.alert('Création refusée : vérifie ton accès administrateur.')
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 border-t border-bijou-gold/20 pt-3">
      <input className={input} placeholder="Catégorie (ex. VIP)" value={name} onChange={e => setName(e.target.value)} required />
      <div className="flex gap-2">
        <input className={input} type="number" min="0" placeholder="Prix FCFA" value={price} onChange={e => setPrice(e.target.value)} required />
        <input className={input} type="number" min="1" placeholder="Billets" value={qty} onChange={e => setQty(e.target.value)} required />
      </div>
      <button className={btn}>+ Ajouter la catégorie</button>
    </form>
  )
}

function Dashboard() {
  const { logout } = useAuth()
  const [events, setEvents] = useState<Ev[]>([])
  const [tickets, setTickets] = useState<Tt[]>([])
  const [err, setErr] = useState('')
  const [f, setF] = useState({ title: '', date: '', venue: '', city: 'Libreville', description: '' })
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })

  const load = useCallback(async () => {
    try {
      const e = await getDocs(query(collection(db, 'events'), orderBy('createdAt', 'desc')))
      const t = await getDocs(collection(db, 'ticketTypes'))
      setEvents(e.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Ev, 'id'>) })))
      setTickets(t.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Tt, 'id'>) })))
      setErr('')
    } catch {
      setErr('Lecture impossible : vérifie que la base Firestore est créée et que ton compte est admin.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function createEvent(e: FormEvent) {
    e.preventDefault()
    try {
      await addDoc(collection(db, 'events'), { ...f, title: f.title.trim(), status: 'draft', createdAt: serverTimestamp() })
      setF({ ...f, title: '', date: '', venue: '', description: '' })
      load()
    } catch {
      setErr('Création refusée.')
    }
  }

  async function toggle(ev: Ev) {
    await updateDoc(doc(db, 'events', ev.id), { status: ev.status === 'published' ? 'draft' : 'published' })
    load()
  }

  return (
    <div className={bg}>
      <Header title="BIJOU Admin" />
      {err && <p className="text-bijou-alert text-sm max-w-md text-center">{err}</p>}

      <AdminPaymentSettings />
      <AdminRequests />
      <AdminAgents />

      <form onSubmit={createEvent} className={card}>
        <h2 className="text-bijou-goldlight">Nouvel événement</h2>
        <input className={input} placeholder="Titre" value={f.title} onChange={set('title')} required />
        <input className={input} type="datetime-local" value={f.date} onChange={set('date')} required />
        <input className={input} placeholder="Lieu" value={f.venue} onChange={set('venue')} required />
        <input className={input} placeholder="Ville" value={f.city} onChange={set('city')} required />
        <textarea className={input} placeholder="Description" rows={3} value={f.description} onChange={set('description')} />
        <button className={btnGold}>Créer (brouillon)</button>
      </form>

      {events.map(ev => (
        <div key={ev.id} className={card}>
          <div className="flex justify-between gap-2">
            <div>
              <p className="font-semibold">{ev.title}</p>
              <p className="text-sm text-bijou-silver">{ev.venue}, {ev.city} · {ev.date ? new Date(ev.date).toLocaleString('fr-FR') : ''}</p>
            </div>
            <span className={ev.status === 'published' ? 'text-bijou-ok text-sm' : 'text-bijou-silver text-sm'}>
              {ev.status === 'published' ? 'Publié' : 'Brouillon'}
            </span>
          </div>
          {tickets.filter(t => t.eventId === ev.id).map(t => (
            <p key={t.id} className="text-sm">• {t.name} : {t.price.toLocaleString('fr-FR')} FCFA · {t.sold}/{t.quantity} vendus</p>
          ))}
          <TicketForm eventId={ev.id} onDone={load} />
          <button className={btn} onClick={() => toggle(ev)}>{ev.status === 'published' ? 'Dépublier' : 'Publier'}</button>
        </div>
      ))}

      <button className={btn} onClick={logout}>Se déconnecter</button>
      <Link to="/" className={btn}>Retour à l'accueil</Link>
    </div>
  )
}

export default function Admin() {
  const { user, isAdmin, loading } = useAuth()
  if (loading) return <div className={bg}>Chargement…</div>
  if (!user) return <Login />
  if (!isAdmin) return <NotAdmin />
  return <Dashboard />
}

function Login() {
  return (
    <div className={bg}>
      <Header title="Espace organisateur" />
      <LoginForm />
      <Link to="/" className={btn}>Retour à l'accueil</Link>
    </div>
  )
}
