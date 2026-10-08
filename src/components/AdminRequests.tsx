import { useCallback, useEffect, useState } from 'react'
import { collection, doc, getDocs, orderBy, query, runTransaction, serverTimestamp, where, type Timestamp } from 'firebase/firestore'
import { PayPanel } from './PayPanel'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { PAY_LABEL, STATUS_LABEL, refOf } from '../lib/requests'
import { sweepExpired } from '../lib/expiry'

type Req = {
  id: string; eventId: string; ticketTypeId: string; ticketName: string; unitPrice: number; quantity: number; total: number
  customerName: string; phone: string; email?: string; paymentMethod: string; comment?: string
  status: string; adminNote?: string; createdAt?: Timestamp
}
type Log = { id: string; action: string; note?: string; at?: Timestamp }

const card = 'w-full max-w-md rounded-xl border border-bijou-gold/40 bg-white/5 p-4 flex flex-col gap-3'
const input = 'w-full rounded-lg bg-black/40 border border-bijou-silver/40 px-3 py-2 text-bijou-ivory'
const btn = 'rounded-xl border border-bijou-gold/60 px-3 py-2 text-sm font-medium active:scale-95 transition text-center'
const btnGold = 'rounded-xl bg-bijou-gold text-bijou-ink px-3 py-2 text-sm font-semibold active:scale-95 transition'
const COLOR: Record<string, string> = {
  pending: 'text-bijou-goldlight',
  approved: 'text-bijou-ok',
  refused: 'text-bijou-alert',
  info_needed: 'text-bijou-silver',
  expired: 'text-bijou-silver',
}
const TABS: [string, string][] = [
  ['pending', 'En attente'], ['info_needed', 'Infos'], ['approved', 'Approuvées'], ['refused', 'Refusées'], ['expired', 'Expirées'], ['all', 'Toutes'],
]

export function AdminRequests() {
  const { user } = useAuth()
  const [reqs, setReqs] = useState<Req[]>([])
  const [filter, setFilter] = useState('pending')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [logs, setLogs] = useState<Record<string, Log[] | undefined>>({})
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try {
      let s = await getDocs(query(collection(db, 'requests'), orderBy('createdAt', 'desc')))
      if ((await sweepExpired(s.docs)) > 0) {
        s = await getDocs(query(collection(db, 'requests'), orderBy('createdAt', 'desc')))
      }
      setReqs(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Req, 'id'>) })))
      setErr('')
    } catch {
      setErr('Lecture des demandes impossible (règles Firestore publiées ?).')
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function decide(r: Req, status: 'approved' | 'refused' | 'info_needed') {
    const note = (notes[r.id] ?? '').trim()
    if (status === 'info_needed' && !note) { setErr('Écris le message à envoyer au client.'); return }
    setBusy(r.id)
    setErr('')
    try {
      await runTransaction(db, async tx => {
        const rRef = doc(db, 'requests', r.id)
        const tRef = doc(db, 'ticketTypes', r.ticketTypeId)
        const rs = await tx.get(rRef)
        const ts = await tx.get(tRef)
        if (!rs.exists() || !ts.exists()) throw new Error('Demande ou catégorie introuvable.')
        const cur = rs.data() as Req
        if (cur.status === 'refused') throw new Error('Cette demande est déjà refusée.')
        if ((cur as { paymentStatus?: string }).paymentStatus === 'confirmed') throw new Error('Billets déjà émis : modification impossible.')
        const t = ts.data() as { quantity: number; sold: number; reserved?: number; holdMinutes?: number }
        let reserved = t.reserved ?? 0
        if (status === 'approved' && cur.status !== 'approved') {
          if (t.quantity - t.sold - reserved < cur.quantity) throw new Error('Stock insuffisant pour accepter cette demande.')
          reserved += cur.quantity
        } else if (status !== 'approved' && cur.status === 'approved') {
          reserved = Math.max(0, reserved - cur.quantity)
        }
        tx.update(tRef, { reserved })
        const free = ((cur as { total?: number }).total ?? 1) === 0
        const hold = status === 'approved' && cur.status !== 'approved' && !free
          ? { holdUntil: new Date(Date.now() + (t.holdMinutes ?? 60) * 60000) }
          : {}
        tx.update(rRef, { status, adminNote: note, decidedBy: user?.uid ?? '', decidedAt: serverTimestamp(), ...hold })
        tx.set(doc(collection(db, 'auditLogs')), { requestId: r.id, action: status, note, by: user?.uid ?? '', at: serverTimestamp() })
      })
      await load()
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Action impossible.')
    }
    setBusy('')
  }

  async function toggleLogs(id: string) {
    if (logs[id]) { setLogs({ ...logs, [id]: undefined }); return }
    try {
      const s = await getDocs(query(collection(db, 'auditLogs'), where('requestId', '==', id)))
      const l = s.docs
        .map(d => ({ id: d.id, ...(d.data() as Omit<Log, 'id'>) }))
        .sort((a, b) => (a.at?.toMillis() ?? 0) - (b.at?.toMillis() ?? 0))
      setLogs({ ...logs, [id]: l })
    } catch {
      setErr('Historique indisponible.')
    }
  }

  const shown = reqs.filter(r => filter === 'all' || r.status === filter)
  const count = (k: string) => (k === 'all' ? reqs.length : reqs.filter(r => r.status === k).length)

  return (
    <div className="w-full max-w-md flex flex-col gap-3">
      <h2 className="text-bijou-goldlight text-lg">Demandes de réservation</h2>
      <div className="flex flex-wrap gap-2">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={(filter === k ? btnGold : btn) + ' !px-3 !py-1'}>
            {label} ({count(k)})
          </button>
        ))}
      </div>
      {err && <p className="text-bijou-alert text-sm">{err}</p>}
      {shown.length === 0 && <p className="text-bijou-silver text-sm">Aucune demande dans cette catégorie.</p>}

      {shown.map(r => (
        <div key={r.id} className={card}>
          <div className="flex justify-between gap-2">
            <div>
              <p className="font-semibold">{r.customerName}</p>
              <p className="text-xs text-bijou-silver">{refOf(r.id)} · {r.createdAt ? r.createdAt.toDate().toLocaleString('fr-FR') : ''}</p>
            </div>
            <span className={'text-sm ' + (COLOR[r.status] ?? '')}>{STATUS_LABEL[r.status] ?? r.status}</span>
          </div>
          <p>{r.quantity} × {r.ticketName} · <b className="text-bijou-goldlight">{r.total.toLocaleString('fr-FR')} FCFA</b></p>
          <p className="text-sm text-bijou-silver">Paiement : {PAY_LABEL[r.paymentMethod] ?? r.paymentMethod}</p>
          <p className="text-sm"><a className="underline text-bijou-goldlight" href={`tel:${r.phone}`}>{r.phone}</a>{r.email ? ` · ${r.email}` : ''}</p>
          {r.comment && <p className="text-sm rounded-lg bg-black/30 p-2">{r.comment}</p>}
          {r.adminNote && <p className="text-xs text-bijou-silver">Note envoyée : {r.adminNote}</p>}
          {r.status === 'approved' ? <PayPanel r={r} onDone={load} /> : null}

          {r.status !== 'refused' && (
            <>
              <input className={input} placeholder="Message ou motif (visible par le client)" value={notes[r.id] ?? ''} onChange={e => setNotes({ ...notes, [r.id]: e.target.value })} />
              <div className="flex flex-wrap gap-2">
                {r.status !== 'approved' && <button className={btnGold} disabled={busy === r.id} onClick={() => decide(r, 'approved')}>Accepter</button>}
                {r.status !== 'approved' && <button className={btn} disabled={busy === r.id} onClick={() => decide(r, 'info_needed')}>Demander des infos</button>}
                <button className={btn} disabled={busy === r.id} onClick={() => decide(r, 'refused')}>Refuser</button>
              </div>
            </>
          )}
          <button className="text-xs underline text-bijou-silver self-start" onClick={() => toggleLogs(r.id)}>
            {logs[r.id] ? "Masquer l'historique" : "Voir l'historique"}
          </button>
          {logs[r.id] && (
            <div className="text-xs text-bijou-silver flex flex-col gap-1">
              {logs[r.id]!.length === 0 && <p>Aucune action enregistrée.</p>}
              {logs[r.id]!.map(l => (
                <p key={l.id}>{l.at ? l.at.toDate().toLocaleString('fr-FR') : ''} · {STATUS_LABEL[l.action] ?? l.action}{l.note ? ` — ${l.note}` : ''}</p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
