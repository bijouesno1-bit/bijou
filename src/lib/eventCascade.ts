import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore'
import { db } from './firebase'
import { agentKey } from './agentAuth'

// Supprime l'équipe d'un événement : quotas, agents (profils + annuaire de connexion), portes.
export async function deleteEventTeam(eventId: string, ownerId?: string) {
  if (!ownerId) return
  const mine = (c: string) => query(collection(db, c), where('ownerId', '==', ownerId), where('eventId', '==', eventId))
  const [g, a, al] = await Promise.all([getDocs(mine('gates')), getDocs(mine('users')), getDocs(mine('allocations'))])
  for (const d of al.docs) await deleteDoc(d.ref)
  for (const d of a.docs) {
    const x = d.data() as { phone?: string; email?: string }
    for (const v of [x.phone, x.email]) {
      if (v) { try { await deleteDoc(doc(db, 'agentLogins', agentKey(v))) } catch { /* ignoré */ } }
    }
    await deleteDoc(d.ref)
  }
  for (const d of g.docs) await deleteDoc(d.ref)
}
