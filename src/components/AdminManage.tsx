import { deleteEventTeam } from '../lib/eventCascade'
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { posterUrl, uploadProfile } from '../lib/cloudinary'
import { card, btn, input } from '../lib/ui'
import { Avatar } from './Avatar'
import { EventEditor, type Ev } from './EventEditor'

const ST: Record<string, string> = { pending: 'En attente', published: 'Publié', hidden: 'Masqué', refused: 'Refusé', draft: 'Brouillon' }
const small = ' px-3 py-1 text-sm'

function AllEvents() {
  const { user } = useAuth()
  const [list, setList] = useState<Ev[]>([])
  const [edit, setEdit] = useState('')
  const [msg, setMsg] = useState('')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    try {
      const s = await getDocs(collection(db, 'events'))
      setList(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Ev, 'id'>) })).sort((a, b) => (b.date || '').localeCompare(a.date || '')))
      setMsg('')
    } catch { setMsg('Impossible de charger les événements.') }
  }, [])
  useEffect(() => { load() }, [load])

  const audit = (action: string, id: string) =>
    addDoc(collection(db, 'auditLogs'), { action, target: id, by: user?.uid, at: serverTimestamp() }).catch(() => {})

  async function setStatus(ev: Ev, status: string, hiddenFrom?: string) {
    try {
      await updateDoc(doc(db, 'events', ev.id), hiddenFrom ? { status, hiddenFrom } : { status })
      audit('event_' + status, ev.id)
      load()
    } catch { setMsg('Action refusée.') }
  }

  async function remove(ev: Ev) {
    if (!window.confirm('Supprimer définitivement « ' + ev.title + ' » et ses types de billets ?')) return
    try {
      const tt = await getDocs(query(collection(db, 'ticketTypes'), where('eventId', '==', ev.id)))
      for (const t of tt.docs) await deleteDoc(t.ref)
      await deleteEventTeam(ev.id, (ev as unknown as { ownerId?: string }).ownerId)
      await deleteDoc(doc(db, 'events', ev.id))
      audit('event_delete', ev.id)
      load()
    } catch { setMsg('Suppression refusée.') }
  }

  const shown = list.filter(e => (e.title ?? '').toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <>
      <input className={input} placeholder="Rechercher un événement…" value={q} onChange={e => setQ(e.target.value)} />
      {msg && <p className="text-bijou-alert text-sm">{msg}</p>}
      {shown.map(ev => (
        <div key={ev.id} className={card}>
          <div className="flex items-center gap-3">
            {ev.poster
              ? <img src={posterUrl(ev.poster, 120)} alt="" className="h-14 w-12 shrink-0 rounded-lg object-cover bg-black/30" />
              : <div className="h-14 w-12 shrink-0 rounded-lg bg-black/30" />}
            <div className="min-w-0">
              <div className="font-semibold truncate">{ev.num ? '#' + ev.num + ' · ' : ''}{ev.title}</div>
              <div className="text-xs text-bijou-goldlight">{ST[ev.status ?? ''] ?? ev.status} · {ev.date}</div>
              {ev.ownerName && <div className="text-xs text-bijou-silver truncate">{ev.ownerName}</div>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btn + small} onClick={() => setEdit(edit === ev.id ? '' : ev.id)}>Modifier</button>
            {ev.status === 'published' && <button className={btn + small} onClick={() => setStatus(ev, 'hidden', 'admin')}>Masquer</button>}
            {ev.status === 'hidden' && <button className={btn + small} onClick={() => setStatus(ev, 'published')}>Réafficher</button>}
            <button className={btn + small} onClick={() => remove(ev)}>Supprimer</button>
          </div>
          {edit === ev.id && <EventEditor ev={ev} onDone={ok => { setEdit(''); if (ok) { audit('event_edit', ev.id); load() } }} />}
        </div>
      ))}
    </>
  )
}

type U = { id: string; name?: string; email?: string; role?: string; category?: string; photoUrl?: string }

function AllUsers() {
  const [list, setList] = useState<U[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const target = useRef('')

  const load = useCallback(async () => {
    try {
      const s = await getDocs(collection(db, 'users'))
      setList(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<U, 'id'>) })))
      setMsg('')
    } catch { setMsg('Impossible de charger les comptes.') }
  }, [])
  useEffect(() => { load() }, [load])

  async function setPhoto(id: string, url: string) {
    setBusy(id)
    try { await updateDoc(doc(db, 'users', id), { photoUrl: url }); await load() }
    catch { setMsg('Modification refusée.') }
    setBusy('')
  }

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    const id = target.current
    if (!f || !id) return
    setBusy(id)
    try { await setPhoto(id, await uploadProfile(f)) }
    catch (x) { setMsg(x instanceof Error && x.message ? x.message : 'Envoi impossible.'); setBusy('') }
  }

  const ql = q.trim().toLowerCase()
  const shown = list.filter(u => ((u.name ?? '') + ' ' + (u.email ?? '')).toLowerCase().includes(ql))
  return (
    <>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />
      <input className={input} placeholder="Rechercher un compte (nom, e-mail)…" value={q} onChange={e => setQ(e.target.value)} />
      {msg && <p className="text-bijou-alert text-sm">{msg}</p>}
      {shown.map(u => (
        <div key={u.id} className={card}>
          <div className="flex items-center gap-3">
            {u.photoUrl
              ? <Avatar url={u.photoUrl} size={48} />
              : <div className="h-12 w-12 shrink-0 rounded-full border-2 border-dashed border-bijou-silver/50" />}
            <div className="min-w-0">
              <div className="font-semibold truncate">{u.name || '(sans nom)'}</div>
              <div className="text-xs text-bijou-silver truncate">{u.email}</div>
              <div className="text-xs text-bijou-goldlight">{u.role}{u.category ? ' · ' + u.category : ''}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btn + small} disabled={busy === u.id} onClick={() => { target.current = u.id; ref.current?.click() }}>
              {busy === u.id ? 'Envoi…' : u.photoUrl ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
            {u.photoUrl && <button className={btn + small} disabled={busy === u.id} onClick={() => setPhoto(u.id, '')}>Retirer</button>}
          </div>
        </div>
      ))}
    </>
  )
}

export function AdminManage() {
  const [tab, setTab] = useState<'events' | 'users'>('events')
  return (
    <div className="flex flex-col gap-3 w-full border-t border-bijou-gold/30 pt-4 mt-2">
      <h2 className="text-bijou-goldlight text-lg">Gestion complète</h2>
      <div className="flex gap-2">
        <button className={btn + small} onClick={() => setTab('events')} style={tab === 'events' ? { borderWidth: 2 } : {}}>Tous les événements</button>
        <button className={btn + small} onClick={() => setTab('users')} style={tab === 'users' ? { borderWidth: 2 } : {}}>Comptes et photos</button>
      </div>
      {tab === 'events' ? <AllEvents /> : <AllUsers />}
    </div>
  )
}
