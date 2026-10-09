import { AdminEv, AdminModes } from '../components/AdminEv'
import type { Mode } from '../components/ViewModes'
import { pad } from '../lib/eventNum'
import { bg, card, btn, btnGold, input } from '../lib/ui'
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminPaymentSettings } from '../components/AdminPaymentSettings'
import { AdminDashboard } from '../components/AdminDashboard'
import { AdminRequests } from '../components/AdminRequests'
import { AdminAnnonces } from '../components/AdminAnnonces'
import { AdminAgents } from '../components/AdminAgents'
import { AdminCheckpoints } from '../components/AdminCheckpoints'
import { LoginForm } from '../components/LoginForm'
import { CopyUid } from '../components/CopyUid'
import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { StockLine } from '../components/StockLine'
import { FreeIssue } from '../components/FreeIssue'
import { AdminVenues } from '../components/AdminVenues'
import { AdminQr } from '../components/AdminQr'
import { AdminTickets } from '../components/AdminTickets'
import { EventStats } from '../components/EventStats'
import { EventHistory } from '../components/EventHistory'
import { DemoPack, deleteEventDeep } from '../components/DemoPack'
import { nextEventNum } from '../lib/eventNum'
import { PosterInput } from '../components/PosterInput'

type Ev = { num?: number; id: string; title: string; date: string; venue: string; city: string; description: string; status: string; maxCapacity?: number | null; poster?: string }
type Tt = { id: string; eventId: string; name: string; price: number; quantity: number; sold: number; reserved?: number; active: boolean; kind?: string; persons?: number; zone?: string; validUntil?: string | null }

const base = import.meta.env.BASE_URL
const TITLES: Record<string, string> = { tableau: 'Tableau de bord', demandes: 'Demandes de réservation', annonces: 'Annonces en attente', evenements: 'Événements', equipe: 'Agents et portes', reglages: 'Réglages' }

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
  const [kind, setKind] = useState('classic')
  const [persons, setPersons] = useState('2')
  const [zone, setZone] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [holdMin, setHoldMin] = useState('60')

  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      await addDoc(collection(db, 'ticketTypes'), {
        eventId, name: name.trim(), price: kind === 'invitation' ? 0 : Number(price), quantity: Number(qty),
        sold: 0, active: true, createdAt: serverTimestamp(),
        kind, persons: kind === 'group' ? Math.min(50, Math.max(2, Number(persons) || 2)) : 1,
        zone: zone.trim().slice(0, 60), validUntil: validUntil || null,
        holdMinutes: Math.min(10080, Math.max(5, Number(holdMin) || 60)),
      })
      setName(''); setPrice(''); setQty(''); setZone(''); setValidUntil('')
      onDone()
    } catch {
      window.alert('Création refusée : vérifie ton accès administrateur.')
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 border-t border-bijou-gold/20 pt-3">
      <input className={input + ' placeholder:text-xs'} placeholder="Catégorie/dénomination" value={name} onChange={e => setName(e.target.value)} required />
      <div className="flex gap-2">
        {kind !== 'invitation' && <input className={input} type="number" min="0" placeholder="Prix FCFA" value={price} onChange={e => setPrice(e.target.value)} required />}
        <input className={input + ' placeholder:text-xs'} type="number" min="1" placeholder="Nombre de billet en chiffre" value={qty} onChange={e => setQty(e.target.value)} required />
      </div>
      <select className={input} value={kind} onChange={e => setKind(e.target.value)}>
        <option value="classic">Classique</option>
        <option value="individual">Individuel</option>
        <option value="vip">VIP</option>
        <option value="premium">Premium</option>
        <option value="group">Groupe (plusieurs personnes)</option>
        <option value="invitation">Billet gratuit (sans prix, émis par l'organisateur)</option>
      </select>
      {kind === 'group' && <input className={input} type="number" min="2" max="50" placeholder="Personnes par billet" value={persons} onChange={e => setPersons(e.target.value)} />}
      <input className={input} placeholder="Zone / rang / table (facultatif)" value={zone} onChange={e => setZone(e.target.value)} />
      <label className="text-xs text-bijou-silver">Valable jusqu'au (facultatif)
        <input className={input} type="datetime-local" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
      </label>
      <label className="text-xs text-bijou-silver">Blocage d'une demande en attente (minutes)
        <input className={input} type="number" min="5" max="10080" value={holdMin} onChange={e => setHoldMin(e.target.value)} />
      </label>
      <button className={btn}>+ Ajouter la catégorie</button>
    </form>
  )
}

function Dashboard() {
  const { logout } = useAuth()
  const [sp] = useSearchParams()
  const t = sp.get('t') ?? 'tableau'
  const [events, setEvents] = useState<Ev[]>([])
  const [tickets, setTickets] = useState<Tt[]>([])
  const [err, setErr] = useState('')
  const [f, setF] = useState({ title: '', date: '', venue: '', city: 'Libreville', description: '' })
  const [cap, setCap] = useState('')
  const [poster, setPoster] = useState('')
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

  async function setMax(ev: Ev) {
    const v = window.prompt("Capacité maximale de l'événement (vide ou 0 = illimitée) :", ev.maxCapacity ? String(ev.maxCapacity) : '')
    if (v === null) return
    const n = Math.floor(Number(v) || 0)
    try { await updateDoc(doc(db, 'events', ev.id), { maxCapacity: n > 0 ? n : null }); load() } catch { setErr('Mise à jour refusée.') }
  }

  async function createEvent(e: FormEvent) {
    e.preventDefault()
    try {
      await addDoc(collection(db, 'events'), { num: await nextEventNum(), ...f, title: f.title.trim(), status: 'draft', ...(poster ? { poster } : {}), ...(Number(cap) > 0 ? { maxCapacity: Math.floor(Number(cap)) } : {}), createdAt: serverTimestamp() })
      setF({ ...f, title: '', date: '', venue: '', description: '' })
      setCap('')
      setPoster('')
      load()
    } catch {
      setErr('Création refusée.')
    }
  }

  async function setEventPoster(ev: Ev, url: string) {
    try { await updateDoc(doc(db, 'events', ev.id), { poster: url }); load() } catch { setErr('Mise à jour refusée.') }
  }

  async function toggle(ev: Ev) {
    await updateDoc(doc(db, 'events', ev.id), { status: ev.status === 'published' ? 'draft' : 'published' })
    load()
  }

  return (
    <div className={bg}>
      <h1 className="text-xl text-bijou-goldlight">{TITLES[t] ?? TITLES.tableau}</h1>
      {err && <p className="text-bijou-alert text-sm max-w-md text-center">{err}</p>}

      {t === 'tableau' && <AdminDashboard />}
      {t === 'reglages' && <AdminPaymentSettings />}
      {t === 'demandes' && <AdminRequests />}
      {t === 'annonces' && <AdminAnnonces />}
      {t === 'reglages' && <AdminVenues />}
      {t === 'reglages' && <AdminQr events={events} />}
      {t === 'equipe' && <AdminAgents />}
      {t === 'equipe' && <AdminCheckpoints />}

      <div className={t === 'evenements' ? 'contents' : 'hidden'}>
        <EventHistory />
        <DemoPack />
      <form onSubmit={createEvent} className={card}>
        <h2 className="text-bijou-goldlight">Nouvel événement</h2>
        <input className={input} placeholder="Titre" value={f.title} onChange={set('title')} required />
        <input className={input} type="datetime-local" value={f.date} onChange={set('date')} required />
        <input className={input} placeholder="Lieu" value={f.venue} onChange={set('venue')} required />
        <input className={input} placeholder="Ville" value={f.city} onChange={set('city')} required />
        <input className={input} type="number" min="1" placeholder="Capacité maximale de l'événement (facultatif)" value={cap} onChange={e => setCap(e.target.value)} />
        <textarea className={input} placeholder="Description" rows={3} value={f.description} onChange={set('description')} />
        <PosterInput url={poster} onChange={setPoster} label="Affiche ou photo publicitaire (facultatif)" />
        <button className={btnGold}>Créer (brouillon)</button>
      </form>

      <AdminModes>{(vm: Mode) => events.map(ev => (
        <AdminEv key={ev.id} ev={ev} vm={vm}>
          <div className="flex justify-between gap-2">
            <div>
              <p className="font-semibold">{ev.num ? <span className="mr-2 text-xs text-bijou-goldlight">N° {pad(ev.num)}</span> : null}{ev.title}</p>
              <p className="text-sm text-bijou-silver">{ev.venue}, {ev.city} · {ev.date ? new Date(ev.date).toLocaleString('fr-FR') : ''}</p>
            </div>
            <span className={ev.status === 'published' ? 'text-bijou-ok text-sm' : 'text-bijou-silver text-sm'}>
              {ev.status === 'published' ? 'Publié' : 'Brouillon'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-bijou-silver">{ev.maxCapacity ? 'Capacité max : ' + ev.maxCapacity + ' (prises ' + tickets.filter(t => t.eventId === ev.id).reduce((a, t) => a + t.sold + (t.reserved ?? 0), 0) + ')' : 'Capacité max : illimitée'}</span>
            <button className={btn} onClick={() => setMax(ev)}>Capacité</button>
          </div>
          <PosterInput url={ev.poster ?? ''} onChange={u => setEventPoster(ev, u)} compact />
          <EventStats tickets={tickets.filter(t => t.eventId === ev.id)} />
          <AdminTickets eventId={ev.id} onDone={load} />
          {tickets.filter(t => t.eventId === ev.id).map(t => (
            <div key={t.id}><StockLine t={t} />{t.kind === 'invitation' && <FreeIssue tt={t} onDone={() => load()} />}</div>
          ))}
          <TicketForm eventId={ev.id} onDone={load} />
          <button className={btn} onClick={() => toggle(ev)}>{ev.status === 'published' ? 'Dépublier' : 'Publier'}</button>
          <button className={btn + ' text-bijou-alert'} onClick={async () => { if (!window.confirm('Supprimer « ' + ev.title + ' » et ses billets ?')) return; try { await deleteEventDeep(ev.id); setEvents(x => x.filter(e => e.id !== ev.id)); setTickets(x => x.filter(t => t.eventId !== ev.id)) } catch { window.alert('Suppression refusée.') } }}>Supprimer</button>
        </AdminEv>
      ))}</AdminModes>

      </div>
      <button className={btn} onClick={logout}>Se déconnecter</button>
      <Link to="/" className={btn + ' w-full max-w-md'}>Retour à l'accueil</Link>
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
      <Header title="Espace administrateur" />
      <LoginForm />
      <Link to="/" className={btn + ' w-full max-w-md'}>Retour à l'accueil</Link>
    </div>
  )
}
