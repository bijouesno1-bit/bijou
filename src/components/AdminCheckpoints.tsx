import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { addDoc, collection, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, type Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

type Gate = { id: string; name: string; active: boolean }
type ScanLog = { id: string; ticketId: string; result: string; checkpoint?: string; at?: Timestamp }

const inp = 'w-full rounded-lg bg-black/40 border border-bijou-silver/40 px-3 py-2 text-bijou-ivory'
const btnGold = 'rounded-xl bg-bijou-gold text-bijou-ink px-4 py-2 font-semibold active:scale-95 transition disabled:opacity-50'
const btn = 'rounded-lg border border-bijou-gold/60 px-3 py-1 text-sm active:scale-95 transition'
const RESULT: Record<string, string> = { ok: 'Validé', used: 'Déjà utilisé', bad: 'Refusé', unknown: 'Inconnu' }

// Points de contrôle (portes) des agents + derniers scans.
export function AdminCheckpoints() {
  const [gates, setGates] = useState<Gate[]>([])
  const [scans, setScans] = useState<ScanLog[]>([])
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const g = await getDocs(query(collection(db, 'checkpoints'), orderBy('name')))
      setGates(g.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Gate, 'id'>) })))
      const s = await getDocs(query(collection(db, 'scans'), orderBy('at', 'desc'), limit(15)))
      setScans(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ScanLog, 'id'>) })))
      setMsg('')
    } catch {
      setMsg('Lecture impossible (règles Firestore publiées ?).')
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function add(e: FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (n.length < 2 || n.length > 40) { setMsg('Nom de porte : 2 à 40 caractères.'); return }
    if (gates.some(g => g.name.toLowerCase() === n.toLowerCase())) { setMsg('Cette porte existe déjà.'); return }
    setBusy(true)
    try {
      await addDoc(collection(db, 'checkpoints'), { name: n, active: true, createdAt: serverTimestamp() })
      setName('')
      await load()
    } catch {
      setMsg('Création refusée : règles Firestore à publier ?')
    }
    setBusy(false)
  }

  async function toggle(g: Gate) {
    try {
      await updateDoc(doc(db, 'checkpoints', g.id), { active: !g.active })
      await load()
    } catch {
      setMsg('Modification refusée.')
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-bijou-gold/40 bg-white/5 p-4 flex flex-col gap-3">
      <h2 className="text-bijou-goldlight">Points de contrôle</h2>
      <p className="text-xs text-bijou-silver">Les agents choisissent leur porte avant de scanner. Chaque scan enregistre la porte.</p>
      <form onSubmit={add} className="flex gap-2">
        <input className={inp} placeholder="Nom de la porte (ex. Entrée principale)" maxLength={40} value={name} onChange={e => setName(e.target.value)} />
        <button className={btnGold} disabled={busy}>Ajouter</button>
      </form>
      {gates.map(g => (
        <div key={g.id} className="flex items-center justify-between gap-2 text-sm">
          <span className={g.active ? '' : 'text-bijou-silver line-through'}>{g.name}</span>
          <button className={btn} onClick={() => toggle(g)}>{g.active ? 'Désactiver' : 'Réactiver'}</button>
        </div>
      ))}
      {msg && <p className="text-sm text-bijou-goldlight">{msg}</p>}
      <h3 className="text-sm text-bijou-goldlight">Derniers scans</h3>
      {scans.length === 0 && <p className="text-xs text-bijou-silver">Aucun scan enregistré.</p>}
      {scans.map(s => (
        <p key={s.id} className="text-xs">
          {s.at ? s.at.toDate().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' }) : ''} · {RESULT[s.result] ?? s.result} · …{s.ticketId.slice(-6)} · {s.checkpoint ?? 'sans porte'}
        </p>
      ))}
      <button className={btn} onClick={load}>Actualiser</button>
    </div>
  )
}
