import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { getApps, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'
import { addDoc, collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db, firebaseConfig } from '../lib/firebase'
import { useAuth } from '../lib/auth'

type Agent = { id: string; name: string; email: string; active: boolean }
const inp = 'w-full rounded-lg bg-black/40 border border-bijou-silver/40 px-3 py-2 text-bijou-ivory'
const btnGold = 'rounded-xl bg-bijou-gold text-bijou-ink px-4 py-2 font-semibold active:scale-95 transition disabled:opacity-50'
const btn = 'rounded-lg border border-bijou-gold/60 px-3 py-1 text-sm active:scale-95 transition'

const secondAuth = () => getAuth(getApps().find(a => a.name === 'agents') ?? initializeApp(firebaseConfig, 'agents'))

export function AdminAgents() {
  const { user } = useAuth()
  const [list, setList] = useState<Agent[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const s = await getDocs(query(collection(db, 'users'), where('role', '==', 'agent')))
      setList(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Agent, 'id'>) })))
    } catch { setMsg('Impossible de charger les agents.') }
  }, [])
  useEffect(() => { load() }, [load])

  async function add(e: FormEvent) {
    e.preventDefault()
    setMsg('')
    const n = name.trim(), em = email.trim().toLowerCase()
    if (n.length < 2) return setMsg('Nom trop court.')
    if (!/^\S+@\S+\.\S+$/.test(em)) return setMsg('E-mail invalide.')
    if (pwd.length < 8) return setMsg('Mot de passe : 8 caractères minimum.')
    if (!user) return
    setBusy(true)
    const sa = secondAuth()
    try {
      const c = await createUserWithEmailAndPassword(sa, em, pwd)
      await setDoc(doc(db, 'users', c.user.uid), { role: 'agent', active: true, email: em, name: n, createdAt: serverTimestamp(), createdBy: user.uid })
      addDoc(collection(db, 'auditLogs'), { action: 'agent_create', target: c.user.uid, by: user.uid, at: serverTimestamp() }).catch(() => {})
      setName(''); setEmail(''); setPwd('')
      setMsg('Agent créé. Communique-lui son e-mail et son mot de passe.')
      load()
    } catch (err) {
      const code = (err as { code?: string }).code
      setMsg(code === 'auth/email-already-in-use' ? 'Cet e-mail est déjà utilisé.' : 'Création impossible. Vérifie la connexion et tes droits.')
    }
    try { await signOut(sa) } catch { /* ignore */ }
    setBusy(false)
  }

  async function toggle(a: Agent) {
    if (!user) return
    try {
      await updateDoc(doc(db, 'users', a.id), { active: !a.active })
      addDoc(collection(db, 'auditLogs'), { action: a.active ? 'agent_disable' : 'agent_enable', target: a.id, by: user.uid, at: serverTimestamp() }).catch(() => {})
      load()
    } catch { setMsg('Modification refusée.') }
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-bijou-gold/40 bg-white/5 p-4 flex flex-col gap-3">
      <h2 className="text-lg text-bijou-goldlight">Agents de contrôle</h2>
      <form onSubmit={add} className="flex flex-col gap-2">
        <input className={inp} placeholder="Nom de l'agent" value={name} onChange={e => setName(e.target.value)} />
        <input className={inp} type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} />
        <input className={inp} type="text" placeholder="Mot de passe initial (8+)" value={pwd} onChange={e => setPwd(e.target.value)} autoComplete="off" />
        <button className={btnGold} disabled={busy}>{busy ? 'Création…' : 'Ajouter l\'agent'}</button>
      </form>
      {msg && <p className="text-sm text-bijou-goldlight">{msg}</p>}
      {list.length === 0 && <p className="text-sm text-bijou-silver">Aucun agent pour l'instant.</p>}
      {list.map(a => (
        <div key={a.id} className="flex items-center justify-between gap-2 border-t border-bijou-silver/20 pt-2">
          <div className="min-w-0">
            <p className="truncate">{a.name}</p>
            <p className="text-xs text-bijou-silver truncate">{a.email} · {a.active ? 'actif' : 'désactivé'}</p>
          </div>
          <button className={btn} onClick={() => toggle(a)}>{a.active ? 'Désactiver' : 'Activer'}</button>
        </div>
      ))}
    </div>
  )
}
