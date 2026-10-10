import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { agentKey, createAgentAccount } from '../lib/agentAuth'
import { card, btn, btnGold, input } from '../lib/ui'

type Ev = { id: string; title: string; date: string; status?: string }
type Gate = { id: string; name: string; active: boolean }
type Agent = { id: string; name: string; phone: string; email: string; active: boolean; gateIds?: string[] }
type Tt = { id: string; name: string; quantity: number; sold: number; reserved?: number }
type Al = { id: string; agentId: string; ticketTypeId: string; qty: number }
const small = ' px-3 py-1 text-sm'
const left = (t: Tt) => (t.quantity || 0) - (t.sold || 0) - (t.reserved || 0)

export function OrgTeam() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const [events, setEvents] = useState<Ev[]>([])
  const [evId, setEvId] = useState('')
  const [gates, setGates] = useState<Gate[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [types, setTypes] = useState<Tt[]>([])
  const [allocs, setAllocs] = useState<Al[]>([])
  const [q, setQ] = useState<Record<string, string>>({})
  const [gname, setGname] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [sel, setSel] = useState<string[]>([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!uid) return
    getDocs(query(collection(db, 'events'), where('ownerId', '==', uid)))
      .then(s => {
        const l = s.docs
          .map(d => ({ id: d.id, ...(d.data() as Omit<Ev, 'id'>) }))
          .filter(e => e.status !== 'refused')
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        setEvents(l)
        setEvId(cur => cur || l[0]?.id || '')
      })
      .catch(() => setMsg('Impossible de charger vos événements.'))
  }, [uid])

  const load = useCallback(async () => {
    if (!uid || !evId) return
    try {
      const [g, a, t, al] = await Promise.all([
        getDocs(query(collection(db, 'gates'), where('ownerId', '==', uid), where('eventId', '==', evId))),
        getDocs(query(collection(db, 'users'), where('ownerId', '==', uid), where('eventId', '==', evId))),
        getDocs(query(collection(db, 'ticketTypes'), where('eventId', '==', evId), where('active', '==', true))),
        getDocs(query(collection(db, 'allocations'), where('ownerId', '==', uid), where('eventId', '==', evId))),
      ])
      setGates(g.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Gate, 'id'>) })).sort((x, y) => x.name.localeCompare(y.name)))
      setAgents(a.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Agent, 'id'>) })).sort((x, y) => x.name.localeCompare(y.name)))
      setTypes(t.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Tt, 'id'>) })))
      setAllocs(al.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Al, 'id'>) })))
    } catch { setMsg("Impossible de charger l'équipe.") }
  }, [uid, evId])
  useEffect(() => { load() }, [load])

  const others = (t: Tt, agentId: string) =>
    allocs.filter(x => x.ticketTypeId === t.id && x.agentId !== agentId).reduce((s, x) => s + (x.qty || 0), 0)
  const qv = (agentId: string, ttId: string) =>
    q[agentId + '|' + ttId] ?? String(allocs.find(x => x.agentId === agentId && x.ticketTypeId === ttId)?.qty ?? 0)

  async function addGate(e: FormEvent) {
    e.preventDefault()
    setMsg('')
    const n = gname.trim()
    if (!evId || n.length < 1) return setMsg('Saisissez le nom de la porte.')
    try {
      await setDoc(doc(collection(db, 'gates')), { eventId: evId, ownerId: uid, name: n.slice(0, 60), active: true, createdAt: serverTimestamp() })
      setGname('')
      load()
    } catch { setMsg('Création de la porte refusée.') }
  }

  async function toggleGate(g: Gate) {
    try { await updateDoc(doc(db, 'gates', g.id), { active: !g.active }); load() }
    catch { setMsg('Modification refusée.') }
  }

  async function removeGate(g: Gate) {
    if (!window.confirm('Supprimer la porte « ' + g.name + ' » ?')) return
    try {
      for (const a of agents) {
        if ((a.gateIds ?? []).includes(g.id)) await updateDoc(doc(db, 'users', a.id), { gateIds: (a.gateIds ?? []).filter(x => x !== g.id) })
      }
      await deleteDoc(doc(db, 'gates', g.id))
      load()
    } catch { setMsg('Suppression refusée.') }
  }

  async function addAgent(e: FormEvent) {
    e.preventDefault()
    setMsg('')
    const n = name.trim()
    const ph = phone.trim()
    const em = email.trim().toLowerCase()
    if (!evId) return setMsg('Choisissez un événement.')
    if (n.length < 2) return setMsg('Nom trop court.')
    if (ph.includes('@') || agentKey(ph).length < 8) return setMsg('Téléphone invalide.')
    if (em && !/^\S+@\S+\.\S+$/.test(em)) return setMsg('E-mail invalide.')
    if (pwd.length < 8) return setMsg('Mot de passe : 8 caractères minimum.')
    if (gates.length === 0) return setMsg("Créez d'abord au moins une porte.")
    if (sel.length === 0) return setMsg('Cochez au moins une porte pour cet agent.')
    setBusy(true)
    try {
      const keys = [agentKey(ph), ...(em ? [agentKey(em)] : [])]
      for (const k of keys) {
        if ((await getDoc(doc(db, 'agentLogins', k))).exists()) throw new Error('used')
      }
      const { uid: aid, authEmail } = await createAgentAccount(pwd)
      await setDoc(doc(db, 'users', aid), {
        role: 'agent', active: true, name: n, phone: ph, email: em, authEmail,
        ownerId: uid, eventId: evId, gateIds: sel, createdAt: serverTimestamp(), createdBy: uid,
      })
      for (const k of keys) await setDoc(doc(db, 'agentLogins', k), { authEmail, ownerId: uid, agentId: aid, eventId: evId })
      setName(''); setPhone(''); setEmail(''); setPwd(''); setSel([])
      setMsg("Agent enregistré. Communiquez-lui son numéro (ou e-mail) et son mot de passe.")
      load()
    } catch (x) {
      setMsg(x instanceof Error && x.message === 'used'
        ? 'Ce téléphone ou cet e-mail est déjà utilisé par un agent.'
        : 'Création impossible. Vérifiez la connexion.')
    }
    setBusy(false)
  }

  async function toggleAgentGate(a: Agent, gid: string) {
    const cur = a.gateIds ?? []
    const next = cur.includes(gid) ? cur.filter(x => x !== gid) : [...cur, gid]
    if (next.length === 0) return setMsg('Un agent doit garder au moins une porte.')
    try { await updateDoc(doc(db, 'users', a.id), { gateIds: next }); load() }
    catch { setMsg('Modification refusée.') }
  }

  async function toggleAgent(a: Agent) {
    try { await updateDoc(doc(db, 'users', a.id), { active: !a.active }); load() }
    catch { setMsg('Modification refusée.') }
  }

  async function removeAgent(a: Agent) {
    if (!window.confirm("Supprimer l'agent " + a.name + " ? Son accès sera définitivement retiré.")) return
    try {
      const al = await getDocs(query(collection(db, 'allocations'), where('ownerId', '==', uid), where('agentId', '==', a.id)))
      for (const d of al.docs) await deleteDoc(d.ref)
      for (const v of [a.phone, a.email]) {
        if (v) { try { await deleteDoc(doc(db, 'agentLogins', agentKey(v))) } catch { /* ignoré */ } }
      }
      await deleteDoc(doc(db, 'users', a.id))
      load()
    } catch { setMsg('Suppression refusée.') }
  }

  async function saveQuota(a: Agent) {
    setMsg('')
    const plan = types.map(t => ({ t, n: Math.max(0, Math.floor(Number(qv(a.id, t.id)) || 0)) }))
    for (const { t, n } of plan) {
      const free = left(t) - others(t, a.id)
      if (n > free) return setMsg('Stock insuffisant pour « ' + t.name + ' » : ' + Math.max(0, free) + ' disponible(s).')
    }
    try {
      for (const { t, n } of plan) {
        const exists = allocs.find(x => x.agentId === a.id && x.ticketTypeId === t.id)
        if (n === 0 && !exists) continue
        await setDoc(doc(db, 'allocations', evId + '_' + a.id + '_' + t.id), {
          eventId: evId, ownerId: uid, agentId: a.id, ticketTypeId: t.id, ticketName: t.name, qty: n, updatedAt: serverTimestamp(),
        })
      }
      setMsg('Quota enregistré pour ' + a.name + '.')
      load()
    } catch { setMsg('Enregistrement du quota refusé.') }
  }

  const activeGates = gates.filter(g => g.active)
  return (
    <div className={card}>
      <h2 className="text-bijou-goldlight">Mon équipe de contrôle</h2>
      {events.length === 0 && <p className="text-sm text-bijou-silver">Aucun événement pour le moment.</p>}
      {events.length > 0 && (
        <select className={input} value={evId} onChange={e => { setEvId(e.target.value); setSel([]); setQ({}) }}>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
        </select>
      )}
      {msg && <p className="text-sm text-bijou-goldlight">{msg}</p>}

      {evId && (
        <>
          <h3 className="text-sm text-bijou-goldlight mt-2">Portes</h3>
          <form onSubmit={addGate} className="flex gap-2">
            <input className={input} placeholder="Nom de la porte (ex. Entrée principale)" value={gname} onChange={e => setGname(e.target.value)} maxLength={60} />
            <button className={btnGold + ' shrink-0'}>Ajouter</button>
          </form>
          {gates.length === 0 && <p className="text-xs text-bijou-silver">Aucune porte : créez-en au moins une.</p>}
          {gates.map(g => (
            <div key={g.id} className="flex items-center justify-between gap-2 text-sm">
              <span className={g.active ? '' : 'text-bijou-silver line-through'}>{g.name}</span>
              <span className="flex gap-2">
                <button type="button" className={btn + small} onClick={() => toggleGate(g)}>{g.active ? 'Désactiver' : 'Activer'}</button>
                <button type="button" className={btn + small} onClick={() => removeGate(g)}>Supprimer</button>
              </span>
            </div>
          ))}

          <h3 className="text-sm text-bijou-goldlight mt-3">Ajouter un agent</h3>
          <form onSubmit={addAgent} className="flex flex-col gap-2">
            <input className={input} placeholder="Nom de l'agent" value={name} onChange={e => setName(e.target.value)} maxLength={80} />
            <input className={input} type="tel" placeholder="Téléphone (ex. 241 60 14 19 24)" value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} />
            <input className={input} type="email" placeholder="E-mail (facultatif)" value={email} onChange={e => setEmail(e.target.value)} maxLength={120} />
            <input className={input} type="text" placeholder="Mot de passe (8 caractères min.)" value={pwd} onChange={e => setPwd(e.target.value)} autoComplete="off" />
            <p className="text-xs text-bijou-silver">Portes de cet agent :</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {activeGates.length === 0 && <span className="text-bijou-silver">Créez d'abord une porte.</span>}
              {activeGates.map(g => (
                <label key={g.id} className="flex items-center gap-1">
                  <input type="checkbox" checked={sel.includes(g.id)} onChange={() => setSel(p => p.includes(g.id) ? p.filter(x => x !== g.id) : [...p, g.id])} />
                  {g.name}
                </label>
              ))}
            </div>
            <button className={btnGold} disabled={busy}>{busy ? 'Création…' : "Enregistrer l'agent"}</button>
          </form>

          <h3 className="text-sm text-bijou-goldlight mt-3">Agents de cet événement ({agents.length})</h3>
          {types.length === 0 && agents.length > 0 && (
            <p className="text-xs text-bijou-silver">Aucune catégorie de billet active : les quotas apparaîtront quand l'administrateur aura créé les types de billets.</p>
          )}
          {agents.map(a => (
            <div key={a.id} className="rounded-lg border border-bijou-silver/30 bg-black/20 p-3 flex flex-col gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{a.name}</p>
                <p className="text-xs text-bijou-silver truncate">{a.phone}{a.email ? ' · ' + a.email : ''} · {a.active ? 'actif' : 'désactivé'}</p>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                {gates.map(g => (
                  <label key={g.id} className="flex items-center gap-1">
                    <input type="checkbox" checked={(a.gateIds ?? []).includes(g.id)} onChange={() => toggleAgentGate(a, g.id)} />
                    {g.name}
                  </label>
                ))}
              </div>
              {types.length > 0 && (
                <div className="flex flex-col gap-1 border-t border-bijou-gold/20 pt-2">
                  <p className="text-xs text-bijou-goldlight">Quota de billets</p>
                  {types.map(t => (
                    <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">{t.name}<span className="block text-xs text-bijou-silver">Disponible : {Math.max(0, left(t) - others(t, a.id))}</span></span>
                      <div className="w-24">
                        <input className={input} type="number" min="0" value={qv(a.id, t.id)} onChange={e => setQ(p => ({ ...p, [a.id + '|' + t.id]: e.target.value }))} />
                      </div>
                    </div>
                  ))}
                  <button type="button" className={btn + small} onClick={() => saveQuota(a)}>Enregistrer le quota</button>
                </div>
              )}
              <div className="flex gap-2">
                <button type="button" className={btn + small} onClick={() => toggleAgent(a)}>{a.active ? 'Désactiver' : 'Activer'}</button>
                <button type="button" className={btn + small} onClick={() => removeAgent(a)}>Supprimer</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
