import { useCallback, useState } from 'react'
import { addDoc, collection, doc, getDocs, query, runTransaction, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { refOf } from '../lib/requests'
import { globalLeft } from '../lib/capacity'

type Tk = { id: string; requestId: string; ticketTypeId: string; ticketName: string; holderName: string; seq: number; count: number; status: string }
const LABEL: Record<string, string> = { valid: 'Valide', used: 'Utilisé', cancelled: 'Annulé', revoked: 'Révoqué' }
const btn = 'rounded-lg border border-bijou-gold/60 px-2 py-1 text-xs active:scale-95 transition disabled:opacity-50'
const input = 'w-full rounded-lg bg-black/40 border border-bijou-silver/40 px-3 py-2 text-bijou-ivory'

export function AdminTickets({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<Tk[]>([])
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      const s = await getDocs(query(collection(db, 'tickets'), where('eventId', '==', eventId)))
      const rows = s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Tk, 'id'>) }))
      rows.sort((a, b) => (a.holderName || '').localeCompare(b.holderName || '') || a.seq - b.seq)
      setList(rows)
      setMsg('')
    } catch { setMsg('Lecture des billets impossible.') }
  }, [eventId])

  function log(action: string, id: string, note: string) {
    if (!user) return
    addDoc(collection(db, 'auditLogs'), { action, target: id, note, by: user.uid, at: serverTimestamp() }).catch(() => {})
  }

  async function run(t: Tk, action: string, note: string, job: () => Promise<void>) {
    setBusy(t.id); setMsg('')
    try {
      await job()
      log(action, t.id, note)
      await load()
      onDone()
    } catch (err) {
      setMsg(err instanceof Error && !('code' in err) ? err.message : 'Action refusée.')
    }
    setBusy('')
  }

  async function rename(t: Tk) {
    const v = window.prompt('Nouveau nom du titulaire :', t.holderName)
    if (v === null) return
    const n = v.trim().slice(0, 80)
    if (n.length < 2) { setMsg('Nom trop court.'); return }
    await run(t, 'ticket_rename', n, async () => { await updateDoc(doc(db, 'tickets', t.id), { holderName: n }) })
  }

  async function cancel(t: Tk) {
    if (!window.confirm('Annuler ce billet ? Il sera refusé au scan et la place sera libérée.')) return
    await run(t, 'ticket_cancel', refOf(t.requestId) + '-' + t.seq, async () => {
      await runTransaction(db, async tx => {
        const tRef = doc(db, 'tickets', t.id)
        const ts = await tx.get(tRef)
        if (!ts.exists()) throw new Error('Billet introuvable.')
        const cur = ts.data() as { status: string; ticketTypeId: string }
        if (cur.status !== 'valid') throw new Error('Seul un billet valide peut être annulé.')
        const yRef = doc(db, 'ticketTypes', cur.ticketTypeId)
        const ys = await tx.get(yRef)
        tx.update(tRef, { status: 'cancelled' })
        if (ys.exists()) tx.update(yRef, { sold: Math.max(0, ((ys.data() as { sold?: number }).sold ?? 0) - 1) })
      })
    })
  }

  async function restore(t: Tk) {
    if (!window.confirm('Réactiver ce billet ? Il reprend une place dans le stock.')) return
    await run(t, 'ticket_restore', refOf(t.requestId) + '-' + t.seq, async () => {
      const gl = await globalLeft(eventId)
      if (gl !== null && gl < 1) throw new Error('Capacité maximale de l’événement atteinte.')
      await runTransaction(db, async tx => {
        const tRef = doc(db, 'tickets', t.id)
        const ts = await tx.get(tRef)
        if (!ts.exists()) throw new Error('Billet introuvable.')
        const cur = ts.data() as { status: string; ticketTypeId: string }
        if (cur.status !== 'cancelled') throw new Error('Seul un billet annulé peut être réactivé.')
        const yRef = doc(db, 'ticketTypes', cur.ticketTypeId)
        const ys = await tx.get(yRef)
        if (!ys.exists()) throw new Error('Catégorie introuvable.')
        const y = ys.data() as { quantity: number; sold: number; reserved?: number }
        if (y.quantity - y.sold - (y.reserved ?? 0) < 1) throw new Error('Plus de place dans cette catégorie.')
        tx.update(tRef, { status: 'valid' })
        tx.update(yRef, { sold: y.sold + 1 })
      })
    })
  }

  async function remove(t: Tk) {
    const warn = t.status === 'used' ? 'Ce billet a DÉJÀ ÉTÉ UTILISÉ à l’entrée. ' : ''
    if (!window.confirm(warn + 'Supprimer définitivement ce billet ? Cette action est irréversible. Pour garder une trace, utilise plutôt « Annuler ».')) return
    await run(t, 'ticket_delete', refOf(t.requestId) + '-' + t.seq + ' · ' + t.status, async () => {
      await runTransaction(db, async tx => {
        const tRef = doc(db, 'tickets', t.id)
        const ts = await tx.get(tRef)
        if (!ts.exists()) throw new Error('Billet introuvable.')
        const cur = ts.data() as { status: string; ticketTypeId: string }
        const yRef = doc(db, 'ticketTypes', cur.ticketTypeId)
        const ys = await tx.get(yRef)
        if ((cur.status === 'valid' || cur.status === 'used') && ys.exists()) {
          tx.update(yRef, { sold: Math.max(0, ((ys.data() as { sold?: number }).sold ?? 0) - 1) })
        }
        tx.delete(tRef)
      })
    })
  }

  if (!open) return <button className={btn} onClick={() => { setOpen(true); load() }}>Gérer les billets émis</button>

  const s = q.trim().toLowerCase()
  const rows = list.filter(t => !s || (t.holderName || '').toLowerCase().includes(s) || (t.ticketName || '').toLowerCase().includes(s) || (refOf(t.requestId) + '-' + t.seq).toLowerCase().includes(s))

  return (
    <div className="rounded-lg border border-bijou-silver/30 bg-black/20 p-2 flex flex-col gap-2 text-sm">
      <div className="flex justify-between items-center">
        <p className="text-bijou-goldlight">Billets émis ({list.length})</p>
        <button className={btn} onClick={() => setOpen(false)}>Fermer</button>
      </div>
      <input className={input} placeholder="Rechercher (nom, référence, catégorie)" value={q} onChange={e => setQ(e.target.value)} />
      {msg && <p className="text-bijou-goldlight">{msg}</p>}
      {rows.length === 0 && <p className="text-bijou-silver">Aucun billet.</p>}
      {rows.slice(0, 50).map(t => (
        <div key={t.id} className="border-t border-bijou-silver/20 pt-2 flex flex-col gap-1">
          <p>{t.holderName} · {t.ticketName}</p>
          <p className="text-xs text-bijou-silver">{refOf(t.requestId)}-{t.seq} · {LABEL[t.status] ?? t.status}</p>
          <div className="flex gap-2 flex-wrap">
            <button className={btn} disabled={busy === t.id} onClick={() => rename(t)}>Modifier</button>
            {t.status === 'valid' && <button className={btn} disabled={busy === t.id} onClick={() => cancel(t)}>Annuler</button>}
            {t.status === 'cancelled' && <button className={btn} disabled={busy === t.id} onClick={() => restore(t)}>Réactiver</button>}
            <button className={btn} disabled={busy === t.id} onClick={() => remove(t)}>Supprimer</button>
          </div>
        </div>
      ))}
      {rows.length > 50 && <p className="text-xs text-bijou-silver">Affichage limité à 50 : affine la recherche.</p>}
    </div>
  )
}
