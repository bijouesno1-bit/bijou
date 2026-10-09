import { collection, doc, getDoc, getDocs, runTransaction, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'

export const pad = (n?: number) => (n ? String(n).padStart(3, '0') : '')

type TS = { seconds?: number; nanoseconds?: number }
const ms = (t?: TS) => (t?.seconds ?? 0) * 1000 + (t?.nanoseconds ?? 0) / 1e6

// Prochain numéro d'événement (compteur atomique).
export async function nextEventNum(): Promise<number> {
  const ref = doc(db, 'settings', 'counters')
  return runTransaction(db, async tx => {
    const s = await tx.get(ref)
    const n = ((s.data() as { events?: number } | undefined)?.events ?? 0) + 1
    tx.set(ref, { events: n }, { merge: true })
    return n
  })
}

// Numérote les anciens événements dans l'ordre de leur création.
export async function backfillEventNums(): Promise<number> {
  const s = await getDocs(collection(db, 'events'))
  const all = s.docs.map(d => ({ ref: d.ref, ...(d.data() as { num?: number; createdAt?: TS }) }))
  const missing = all.filter(e => !e.num).sort((a, b) => ms(a.createdAt) - ms(b.createdAt))
  let n = Math.max(0, ...all.map(e => e.num ?? 0))
  for (const e of missing) { n++; await updateDoc(e.ref, { num: n }) }
  const cref = doc(db, 'settings', 'counters')
  const cur = ((await getDoc(cref)).data() as { events?: number } | undefined)?.events ?? 0
  if (cur < n) await setDoc(cref, { events: n }, { merge: true })
  return missing.length
}
