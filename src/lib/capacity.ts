import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from './firebase'

// Places restantes au niveau de l'événement (null = pas de limite globale).
export async function globalLeft(eventId: string): Promise<number | null> {
  if (!eventId) return null
  const e = await getDoc(doc(db, 'events', eventId))
  const max = Number((e.data() as { maxCapacity?: number | null } | undefined)?.maxCapacity ?? 0)
  if (!(max > 0)) return null
  const s = await getDocs(query(collection(db, 'ticketTypes'), where('eventId', '==', eventId)))
  const taken = s.docs.reduce((a, d) => {
    const t = d.data() as { sold?: number; reserved?: number }
    return a + (t.sold ?? 0) + (t.reserved ?? 0)
  }, 0)
  return Math.max(0, max - taken)
}
