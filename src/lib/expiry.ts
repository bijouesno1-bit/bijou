import { collection, doc, runTransaction, serverTimestamp, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore'
import { db } from './firebase'

// Fait expirer les demandes approuvées, non payées, dont holdUntil est dépassé.
// Libère le stock bloqué (reserved) et écrit une entrée d'audit.
// Les billets gratuits (total 0) et les demandes sans holdUntil n'expirent jamais.
export async function sweepExpired(docs: QueryDocumentSnapshot<DocumentData>[]): Promise<number> {
  const now = Date.now()
  const due = docs.filter(d => {
    const x = d.data()
    return x.status === 'approved'
      && x.paymentStatus !== 'confirmed'
      && (x.total ?? 1) !== 0
      && x.holdUntil
      && x.holdUntil.toMillis() < now
  })
  let n = 0
  for (const d of due) {
    try {
      const done = await runTransaction(db, async tx => {
        const rRef = doc(db, 'requests', d.id)
        const rs = await tx.get(rRef)
        if (!rs.exists()) return false
        const cur = rs.data()
        if (cur.status !== 'approved' || cur.paymentStatus === 'confirmed') return false
        if (!cur.holdUntil || cur.holdUntil.toMillis() >= Date.now()) return false
        const tRef = doc(db, 'ticketTypes', cur.ticketTypeId)
        const ts = await tx.get(tRef)
        if (ts.exists()) {
          tx.update(tRef, { reserved: Math.max(0, (ts.data().reserved ?? 0) - cur.quantity) })
        }
        tx.update(rRef, { status: 'expired', decidedBy: 'system', decidedAt: serverTimestamp() })
        tx.set(doc(collection(db, 'auditLogs')), {
          requestId: d.id, action: 'expired', note: 'Délai de réservation dépassé', by: 'system', at: serverTimestamp(),
        })
        return true
      })
      if (done) n++
    } catch {
      /* ignoré : sera retenté à la prochaine ouverture */
    }
  }
  return n
}
