import { TicketHistory } from './TicketHistory'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocFromCache, getDocs, getDocsFromCache, onSnapshot, query, serverTimestamp, setDoc, where, type DocumentReference, type Query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { newToken } from '../lib/token'
import { bg, card, btn, btnGold, input } from '../lib/ui'

type Alloc = { ticketTypeId: string; ticketName: string; qty: number }
type TType = { id: string; name: string; price: number; zone: string; validUntil: string | null }
type Ev = { title: string; date: string; venue: string; city: string }
type Gate = { id: string; name: string }
type Issued = { id: string; ticketTypeId: string; holderName: string; ticketName: string; pending: boolean; at: number }

async function readDoc(ref: DocumentReference) {
  if (!navigator.onLine) return getDocFromCache(ref)
  try { return await getDoc(ref) } catch { return getDocFromCache(ref) }
}
async function readDocs(q: Query) {
  if (!navigator.onLine) return getDocsFromCache(q)
  try { return await getDocs(q) } catch { return getDocsFromCache(q) }
}

export function AgentIssue({ onBack }: { onBack: () => void }) {
  const { user, profile } = useAuth()
  const evId = profile?.eventId ?? ''
  const ownerId = profile?.ownerId ?? ''
  const gateIds = useMemo(() => profile?.gateIds ?? [], [profile?.gateIds])
  const [ev, setEv] = useState<Ev | null>(null)
  const [types, setTypes] = useState<TType[]>([])
  const [gates, setGates] = useState<Gate[]>([])
  const [gate, setGate] = useState('')
  const [allocs, setAllocs] = useState<Alloc[]>([])
  const [issued, setIssued] = useState<Issued[]>([])
  const [sel, setSel] = useState('')
  const [holder, setHolder] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [ready, setReady] = useState(false)
  const [last, setLast] = useState('')
  const [locked, setLocked] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => {
    if (!user || !evId) { setReady(true); return }
    let off = false
    ;(async () => {
      try {
        const es = await readDoc(doc(db, 'events', evId))
        if (off) return
        if (!es.exists()) { setErr("Cet événement n'existe plus : accès terminé."); setReady(true); return }
        const e = es.data() as Record<string, unknown>
        setEv({ title: String(e.title ?? ''), date: String(e.date ?? ''), venue: String(e.venue ?? ''), city: String(e.city ?? '') })
        const ts = await readDocs(query(collection(db, 'ticketTypes'), where('eventId', '==', evId), where('active', '==', true)))
        const gs = await readDocs(query(collection(db, 'gates'), where('eventId', '==', evId)))
        if (off) return
        setTypes(ts.docs.map(d => {
          const x = d.data()
          return { id: d.id, name: String(x.name ?? ''), price: typeof x.price === 'number' ? x.price : 0, zone: String(x.zone ?? ''), validUntil: typeof x.validUntil === 'string' ? x.validUntil : null }
        }))
        const list = gs.docs.map(d => ({ id: d.id, name: String(d.data().name ?? '') })).filter(g => gateIds.includes(g.id))
        setGates(list)
        let saved = ''
        try { saved = localStorage.getItem('bijou_gate') ?? '' } catch { /* ignoré */ }
        setGate(list.some(g => g.id === saved) ? saved : (list[0]?.id ?? ''))
      } catch {
        if (!off) setErr("Données non chargées. Ouvrez cet écran une fois avec du réseau avant de partir.")
      }
      if (!off) setReady(true)
    })()
    return () => { off = true }
  }, [user, evId, gateIds])

  useEffect(() => {
    if (!user || !evId) return
    const u1 = onSnapshot(
      query(collection(db, 'allocations'), where('agentId', '==', user.uid), where('eventId', '==', evId)),
      s => setAllocs(s.docs.map(d => { const x = d.data(); return { ticketTypeId: String(x.ticketTypeId ?? ''), ticketName: String(x.ticketName ?? ''), qty: Number(x.qty) || 0 } })),
      () => {}
    )
    const u2 = onSnapshot(
      query(collection(db, 'tickets'), where('issuedBy', '==', user.uid), where('eventId', '==', evId)),
      { includeMetadataChanges: true },
      s => setIssued(s.docs.map(d => {
        const x = d.data({ serverTimestamps: 'estimate' })
        const c = x.createdAt as { toMillis?: () => number } | undefined
        return { id: d.id, ticketTypeId: String(x.ticketTypeId ?? ''), holderName: String(x.holderName ?? ''), ticketName: String(x.ticketName ?? ''), pending: d.metadata.hasPendingWrites, at: c && typeof c.toMillis === 'function' ? c.toMillis() : 0 }
      })),
      () => {}
    )
    return () => { u1(); u2() }
  }, [user, evId])

  const curSel = sel && allocs.some(a => a.ticketTypeId === sel) ? sel : (allocs.find(a => a.qty > 0)?.ticketTypeId ?? allocs[0]?.ticketTypeId ?? '')
  const a = allocs.find(x => x.ticketTypeId === curSel)
  const left = a ? Math.max(0, a.qty - issued.filter(i => i.ticketTypeId === a.ticketTypeId).length) : 0
  const low = a ? left > 0 && left <= Math.max(1, Math.ceil(a.qty * 0.2)) : false
  const pending = issued.filter(i => i.pending).length
  const shown = [...issued].sort((x, y) => y.at - x.at).slice(0, 8)

  function issue() {
    setMsg('')
    if (!user || !ev || !a || locked) return
    const tt = types.find(x => x.id === a.ticketTypeId)
    if (!tt) return setMsg('Catégorie introuvable ou inactive.')
    if (!gate) return setMsg('Aucune porte affectée.')
    if (left <= 0) return setMsg('Fin de stock : votre quota est épuisé pour cette catégorie.')
    setLocked(true)
    setTimeout(() => setLocked(false), 800)
    const tok = newToken()
    const rid = doc(collection(db, 'tickets')).id
    setDoc(doc(db, 'tickets', tok), {
      requestId: rid, eventId: evId, ticketTypeId: tt.id,
      eventTitle: ev.title, eventDate: ev.date, venue: ev.venue, city: ev.city,
      ticketName: tt.name || a.ticketName, holderName: holder.trim().slice(0, 80) || 'Client', seq: 1, count: 1, price: tt.price,
      persons: 1, zone: tt.zone, validUntil: tt.validUntil, status: 'valid',
      createdAt: serverTimestamp(), issuedBy: user.uid, gateId: gate, ownerId, issuedOffline: !navigator.onLine, issuedAt: serverTimestamp(),
    }).catch(() => setMsg("Un billet a été refusé à la synchronisation. Prévenez l'organisateur."))
    setLast(tok)
    setHolder('')
  }

  return (
    <div className={bg}>
      <h1 className="text-xl text-bijou-goldlight">Émettre des billets</h1>
      <div className={card}>
        <p className="text-sm text-bijou-silver text-center">{ev?.title}</p>
        <p className={'text-sm text-center ' + (online ? 'text-bijou-ok' : 'text-bijou-alert')}>{online ? 'En ligne' : 'Hors connexion : les billets seront envoyés au retour du réseau'}</p>
        <p className="text-sm text-center text-bijou-silver">{pending > 0 ? pending + " billet(s) en attente d'envoi" : 'Synchronisé'}</p>
      </div>
      {!ready && <p className="text-bijou-silver">Chargement…</p>}
      {err && <p className="text-bijou-alert text-sm text-center max-w-md">{err}</p>}
      {ready && !err && (
        <div className={card}>
          {gates.length > 1 && (
            <select className={input} value={gate} onChange={e => { setGate(e.target.value); try { localStorage.setItem('bijou_gate', e.target.value) } catch { /* ignoré */ } }}>
              {gates.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
          {gates.length === 1 && <p className="text-sm text-bijou-silver text-center">Porte : {gates[0].name}</p>}
          {allocs.length === 0 ? (
            <p className="text-sm text-bijou-silver text-center">Aucun quota attribué. Demandez à l'organisateur de vous en donner un.</p>
          ) : (
            <>
              <select className={input} value={curSel} onChange={e => setSel(e.target.value)}>
                {allocs.map(x => <option key={x.ticketTypeId} value={x.ticketTypeId}>{x.ticketName}</option>)}
              </select>
              <p className="text-center text-lg">Reste : <b>{left}</b> / {a?.qty ?? 0}</p>
              {low && <p className="text-center text-sm text-bijou-goldlight">Attention : il vous reste peu de billets ({left}).</p>}
              {left === 0 && <p className="text-center text-sm text-bijou-alert">Fin de stock : émission bloquée.</p>}
              <input className={input} placeholder="Nom du client (facultatif)" value={holder} onChange={e => setHolder(e.target.value)} maxLength={80} />
              <button className={btnGold} disabled={left <= 0 || locked} onClick={issue}>Émettre 1 billet</button>
            </>
          )}
          {msg && <p className="text-bijou-alert text-sm text-center">{msg}</p>}
          {last && <Link to={'/billet/' + last} className={btn}>Voir le dernier billet émis</Link>}
        </div>
      )}
      {shown.length > 0 && (
        <div className={card}>
          <h2 className="text-bijou-goldlight text-sm">Derniers billets émis</h2>
          {shown.map(i => (
            <p key={i.id} className="text-sm flex justify-between gap-2">
              <Link to={'/billet/' + i.id} className="underline truncate">{i.holderName} · {i.ticketName}</Link>
              <span className={i.pending ? 'text-bijou-goldlight' : 'text-bijou-ok'}>{i.pending ? 'en attente' : 'envoyé'}</span>
            </p>
          ))}
        </div>
      )}
      <TicketHistory mode="agent" />
      <button className={btn} onClick={onBack}>Retour au scan</button>
    </div>
  )
}
