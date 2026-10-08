import { useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { newToken } from '../lib/token'

type R = {
  id: string; eventId: string; ticketTypeId: string; quantity: number; total: number
  paymentStatus?: string; ticketTokens?: string[]
}

const input = 'w-full rounded-lg bg-black/40 border border-bijou-silver/40 px-3 py-2 text-bijou-ivory'
const btnGold = 'rounded-xl bg-bijou-gold text-bijou-ink px-3 py-2 text-sm font-semibold active:scale-95 transition'

export function PayPanel({ r, onDone }: { r: R; onDone: () => void }) {
  const { user } = useAuth()
  const [txRef, setTxRef] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function confirmPayment() {
    const ok = window.confirm(r.total === 0 ? `Billet gratuit : émettre ${r.quantity} billet(s) ?` : `Confirmer la réception de ${r.total.toLocaleString('fr-FR')} FCFA et émettre ${r.quantity} billet(s) ?`)
    if (!ok) return
    setBusy(true)
    setErr('')
    try {
      await runTransaction(db, async tx => {
        const rRef = doc(db, 'requests', r.id)
        const tRef = doc(db, 'ticketTypes', r.ticketTypeId)
        const eRef = doc(db, 'events', r.eventId)
        const rs = await tx.get(rRef)
        const ts = await tx.get(tRef)
        const es = await tx.get(eRef)
        if (!rs.exists() || !ts.exists() || !es.exists()) throw new Error('Données introuvables.')
        const cur = rs.data() as { status: string; paymentStatus?: string; quantity: number; unitPrice: number; customerName: string }
        if (cur.status === 'expired') throw new Error('Réservation expirée : ré-accepte la demande (le stock sera revérifié) avant de confirmer le paiement.')
        if (cur.status !== 'approved') throw new Error('La demande doit être approuvée.')
        if (cur.paymentStatus === 'confirmed') throw new Error('Billets déjà émis.')
        const t = ts.data() as { sold: number; reserved?: number; persons?: number; zone?: string; validUntil?: string | null; kind?: string }
        const ev = es.data() as { title: string; date: string; venue: string; city: string }
        const tokens: string[] = []
        for (let i = 1; i <= cur.quantity; i++) {
          const tok = newToken()
          tokens.push(tok)
          tx.set(doc(db, 'tickets', tok), {
            requestId: r.id, eventId: r.eventId, ticketTypeId: r.ticketTypeId,
            eventTitle: ev.title, eventDate: ev.date, venue: ev.venue, city: ev.city,
            ticketName: (rs.data() as { ticketName: string }).ticketName,
            holderName: cur.customerName, seq: i, count: cur.quantity, price: cur.unitPrice,
            persons: t.persons ?? 1, zone: t.zone ?? '', validUntil: t.validUntil ?? null, kind: t.kind ?? 'classic',
            status: 'valid', createdAt: serverTimestamp(),
          })
        }
        tx.update(tRef, { reserved: Math.max(0, (t.reserved ?? 0) - cur.quantity), sold: t.sold + cur.quantity })
        tx.update(rRef, {
          paymentStatus: 'confirmed', paymentRef: txRef.trim(), ticketTokens: tokens,
          paidAt: serverTimestamp(), paidBy: user?.uid ?? '',
        })
        tx.set(doc(collection(db, 'auditLogs')), { requestId: r.id, action: 'paid', note: txRef.trim(), by: user?.uid ?? '', at: serverTimestamp() })
      })
      onDone()
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Émission impossible.')
    }
    setBusy(false)
  }

  if (r.paymentStatus === 'confirmed') {
    return (
      <div className="rounded-lg border border-bijou-ok/60 bg-bijou-ok/10 p-3 text-sm flex flex-col gap-1">
        <p className="text-bijou-ok font-semibold">Paiement confirmé · billets émis</p>
        {(r.ticketTokens ?? []).map((t, i) => (
          <Link key={t} to={`/billet/${t}`} className="underline text-bijou-goldlight">Voir le billet {i + 1}</Link>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-bijou-gold/40 p-3 flex flex-col gap-2">
      {r.total === 0
        ? <p className="text-sm">Billet gratuit : aucun paiement requis.</p>
        : <>
            <p className="text-sm">Paiement attendu : <b>{r.total.toLocaleString('fr-FR')} FCFA</b></p>
            <input className={input} placeholder="Référence de la transaction (facultatif)" value={txRef} onChange={e => setTxRef(e.target.value)} maxLength={80} />
          </>}
      {err && <p className="text-bijou-alert text-sm">{err}</p>}
      <button className={btnGold} disabled={busy} onClick={confirmPayment}>{busy ? 'Émission…' : r.total === 0 ? 'Émettre les billets gratuits' : 'Paiement reçu : émettre les billets'}</button>
    </div>
  )
}
