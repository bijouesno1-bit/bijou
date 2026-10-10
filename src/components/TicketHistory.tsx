import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { refOf } from '../lib/requests'
import { card, btn, input } from '../lib/ui'

type Tk = {
  id: string; requestId: string; eventId: string; ticketTypeId?: string; ticketName: string; holderName: string
  seq: number; count: number; status: string; gateId?: string; issuedBy?: string; issuedOffline?: boolean
  createdAt?: { toDate?: () => Date }
}
type Named = { id: string; name: string }
type Al = { agentId: string; ticketTypeId: string; ticketName: string; qty: number }
type Ev = { id: string; title: string; date?: string }

const LABEL: Record<string, string> = { valid: 'Valide', used: 'Utilisé', cancelled: 'Annulé', revoked: 'Révoqué', expired: 'Expiré' }
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const pad2 = (n: number) => String(n).padStart(2, '0')

function dayOf(t: Tk) {
  const d = t.createdAt?.toDate?.()
  return d ? d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) : ''
}
function whenOf(t: Tk) {
  const d = t.createdAt?.toDate?.()
  return d ? d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : ''
}

export function TicketHistory({ mode }: { mode: 'organizer' | 'agent' }) {
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const uid = user?.uid ?? ''
  const isOrg = mode === 'organizer'
  const gateIds = useMemo(() => profile?.gateIds ?? [], [profile?.gateIds])
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<Ev[]>([])
  const [evId, setEvId] = useState(isOrg ? '' : (profile?.eventId ?? ''))
  const [tickets, setTickets] = useState<Tk[]>([])
  const [agents, setAgents] = useState<Named[]>([])
  const [gates, setGates] = useState<Named[]>([])
  const [allocs, setAllocs] = useState<Al[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [fAgent, setFAgent] = useState('')
  const [fGate, setFGate] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fDate, setFDate] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!open || !isOrg || !uid || events.length > 0) return
    getDocs(query(collection(db, 'events'), where('ownerId', '==', uid)))
      .then(s => {
        const l = s.docs
          .map(d => { const x = d.data(); return { id: d.id, title: String(x.title ?? ''), date: String(x.date ?? '') } })
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        setEvents(l)
        setEvId(cur => cur || l[0]?.id || '')
      })
      .catch(() => setMsg('Impossible de charger vos événements.'))
  }, [open, isOrg, uid, events.length])

  const load = useCallback(async () => {
    if (!uid || !evId) return
    setLoading(true)
    setMsg('')
    try {
      const toTk = (d: { id: string; data: () => unknown }) => ({ id: d.id, ...(d.data() as Omit<Tk, 'id'>) })
      if (isOrg) {
        const [t, a, g, al] = await Promise.all([
          getDocs(query(collection(db, 'tickets'), where('eventId', '==', evId))),
          getDocs(query(collection(db, 'users'), where('ownerId', '==', uid), where('eventId', '==', evId))),
          getDocs(query(collection(db, 'gates'), where('ownerId', '==', uid), where('eventId', '==', evId))),
          getDocs(query(collection(db, 'allocations'), where('ownerId', '==', uid), where('eventId', '==', evId))),
        ])
        setTickets(t.docs.map(toTk))
        setAgents(a.docs.map(d => ({ id: d.id, name: String(d.data().name ?? '') })))
        setGates(g.docs.map(d => ({ id: d.id, name: String(d.data().name ?? '') })))
        setAllocs(al.docs.map(d => { const x = d.data(); return { agentId: String(x.agentId ?? ''), ticketTypeId: String(x.ticketTypeId ?? ''), ticketName: String(x.ticketName ?? ''), qty: Number(x.qty) || 0 } }))
      } else {
        const map = new Map<string, Tk>()
        const own = await getDocs(query(collection(db, 'tickets'), where('issuedBy', '==', uid), where('eventId', '==', evId)))
        own.docs.forEach(d => map.set(d.id, toTk(d)))
        for (const gid of gateIds) {
          try {
            const s = await getDocs(query(collection(db, 'tickets'), where('gateId', '==', gid), where('eventId', '==', evId)))
            s.docs.forEach(d => map.set(d.id, toTk(d)))
          } catch { /* lecture par porte refusée : on garde ses propres billets */ }
        }
        setTickets([...map.values()])
        try {
          const g = await getDocs(query(collection(db, 'gates'), where('eventId', '==', evId)))
          setGates(g.docs.map(d => ({ id: d.id, name: String(d.data().name ?? '') })).filter(x => gateIds.includes(x.id)))
        } catch { /* ignoré */ }
      }
    } catch { setMsg('Lecture des billets impossible (réseau ou droits).') }
    setLoading(false)
  }, [uid, evId, isOrg, gateIds])

  useEffect(() => { if (open) load() }, [open, load])

  const nameOf = (list: Named[], id?: string) => list.find(x => x.id === id)?.name ?? ''
  const rows = useMemo(() => {
    const toks = norm(q).split(/\s+/).filter(Boolean)
    return tickets
      .filter(t => (!fAgent || t.issuedBy === fAgent) && (!fGate || t.gateId === fGate) && (!fStatus || t.status === fStatus) && (!fDate || dayOf(t) === fDate))
      .filter(t => {
        if (toks.length === 0) return true
        const hay = norm([t.holderName, t.ticketName, refOf(t.requestId) + '-' + t.seq, t.id, nameOf(gates, t.gateId), nameOf(agents, t.issuedBy)].join(' '))
        return toks.every(k => hay.includes(k))
      })
      .sort((a, b) => (b.createdAt?.toDate?.()?.getTime() ?? 0) - (a.createdAt?.toDate?.()?.getTime() ?? 0))
  }, [tickets, fAgent, fGate, fStatus, fDate, q, gates, agents])

  function reprint(t: Tk) {
    if (t.status === 'used') return setMsg('Billet déjà utilisé : réimpression refusée.')
    if (t.status !== 'valid') return setMsg('Billet non valide : réimpression impossible.')
    addDoc(collection(db, 'auditLogs'), { action: 'ticket_reprint', target: t.id, note: t.holderName, by: uid, at: serverTimestamp() }).catch(() => {})
    nav('/billet/' + t.id)
  }

  const recon = agents.map(a => ({
    a,
    lines: allocs.filter(x => x.agentId === a.id).map(x => ({
      name: x.ticketName, qty: x.qty,
      done: tickets.filter(t => t.issuedBy === a.id && t.ticketTypeId === x.ticketTypeId).length,
    })),
  })).filter(r => r.lines.length > 0)

  if (!open) return <button className={btn} onClick={() => setOpen(true)}>{isOrg ? 'Historique des billets' : 'Historique de mes billets'}</button>
  return (
    <div className={card}>
      <h2 className="text-bijou-goldlight">{isOrg ? 'Historique des billets' : 'Historique de mes billets'}</h2>
      {isOrg && (
        <select className={input} value={evId} onChange={e => { setEvId(e.target.value); setFAgent(''); setFGate('') }}>
          {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      )}
      {isOrg && recon.length > 0 && (
        <div className="text-sm flex flex-col gap-1">
          <p className="text-bijou-silver">Émis / quota par agent</p>
          {recon.map(r => (
            <div key={r.a.id}>
              <p className="font-semibold">{r.a.name}</p>
              {r.lines.map(l => (
                <p key={l.name} className={'ml-3 ' + (l.done > l.qty ? 'text-bijou-alert' : '')}>
                  {l.name} : {l.done} / {l.qty}{l.done > l.qty ? ' — dépassement' : ''}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
      <input className={input} placeholder="Rechercher : nom, numéro de billet, porte, agent" value={q} onChange={e => setQ(e.target.value)} />
      <div className="flex gap-2 flex-wrap">
        {isOrg && (
          <select className={input} value={fAgent} onChange={e => setFAgent(e.target.value)}>
            <option value="">Tous les agents</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        <select className={input} value={fGate} onChange={e => setFGate(e.target.value)}>
          <option value="">Toutes les portes</option>
          {gates.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select className={input} value={fStatus} onChange={e => setFStatus(e.target.value)}>
          <option value="">Tous les états</option>
          <option value="valid">Valide</option>
          <option value="used">Utilisé</option>
          <option value="cancelled">Annulé</option>
        </select>
        <input className={input} type="date" value={fDate} onChange={e => setFDate(e.target.value)} />
      </div>
      {loading && <p className="text-sm text-bijou-silver">Chargement…</p>}
      {msg && <p className="text-bijou-alert text-sm">{msg}</p>}
      <p className="text-xs text-bijou-silver">{rows.length} billet(s)</p>
      {rows.slice(0, 100).map(t => (
        <div key={t.id} className="border-t border-bijou-silver/20 pt-2 text-sm flex flex-col gap-1">
          <p className="font-semibold">{t.holderName} · {t.ticketName}</p>
          <p className="text-xs text-bijou-silver">
            {refOf(t.requestId)}-{t.seq} · {LABEL[t.status] ?? t.status}
            {t.gateId ? ' · ' + (nameOf(gates, t.gateId) || 'porte') : ''}
            {isOrg && t.issuedBy ? ' · ' + (nameOf(agents, t.issuedBy) || 'agent') : ''}
            {t.issuedOffline ? ' · hors connexion' : ''}
            {whenOf(t) ? ' · ' + whenOf(t) : ''}
          </p>
          <div className="flex gap-2">
            <Link to={'/billet/' + t.id} className={btn}>Voir</Link>
            <button type="button" className={btn} onClick={() => reprint(t)}>Réimprimer</button>
          </div>
        </div>
      ))}
      <button className={btn} onClick={load}>Actualiser</button>
      <button className={btn} onClick={() => setOpen(false)}>Fermer</button>
    </div>
  )
}
