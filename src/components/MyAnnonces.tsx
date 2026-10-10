import { useCallback, useEffect, useState } from 'react'
import { collection, deleteDoc, doc, getDocs, query, updateDoc, where, type DocumentData } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { posterUrl } from '../lib/cloudinary'
import { card, btn } from '../lib/ui'
import { EventEditor, type Ev } from './EventEditor'

const small = ' px-3 py-1 text-sm'

export function MyAnnonces({ labels }: { labels?: Record<string, string> }) {
  const { user } = useAuth()
  const [list, setList] = useState<Ev[]>([])
  const [edit, setEdit] = useState('')
  const [msg, setMsg] = useState('')
  const L: Record<string, string> = { hidden: 'Masqué', ...(labels ?? {}) }

  const load = useCallback(async () => {
    if (!user) return
    try {
      const s = await getDocs(query(collection(db, 'events'), where('ownerId', '==', user.uid)))
      setList(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Ev, 'id'>) })).sort((a, b) => (b.date || '').localeCompare(a.date || '')))
      setMsg('')
    } catch { setMsg('Impossible de charger vos annonces.') }
  }, [user])
  useEffect(() => { load() }, [load])

  async function patch(ev: Ev, data: DocumentData) {
    try { await updateDoc(doc(db, 'events', ev.id), data); load() }
    catch { setMsg('Action refusée.') }
  }

  async function remove(ev: Ev) {
    if (!window.confirm('Supprimer définitivement « ' + ev.title + ' » ? Cette action est irréversible.')) return
    try { await deleteDoc(doc(db, 'events', ev.id)); load() }
    catch { setMsg('Suppression refusée.') }
  }

  return (
    <div className={card}>
      <h2 className="text-bijou-goldlight">Mes annonces</h2>
      {msg && <p className="text-bijou-alert text-sm">{msg}</p>}
      {list.map(m => {
        const ownerHidden = m.status === 'hidden' && m.hiddenFrom === 'owner'
        const canDelete = m.status === 'pending' || m.status === 'refused' || ownerHidden
        return (
          <div key={m.id} className="border-t border-bijou-gold/20 pt-2 text-sm flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {m.poster && <img src={posterUrl(m.poster, 120)} alt="" className="h-12 w-10 shrink-0 rounded-lg object-cover bg-black/30" />}
              <div className="min-w-0">
                <b className="block truncate">{m.title}</b>
                <div className={m.status === 'published' ? 'text-bijou-ok' : 'text-bijou-silver'}>{L[m.status ?? ''] ?? m.status}</div>
              </div>
            </div>
            {m.status === 'hidden' && !ownerHidden && <div className="text-xs text-bijou-alert">Masquée par l'administrateur.</div>}
            <div className="flex flex-wrap gap-2">
              <button className={btn + small} onClick={() => setEdit(edit === m.id ? '' : m.id)}>Modifier</button>
              {m.status === 'published' && <button className={btn + small} onClick={() => patch(m, { status: 'hidden', hiddenFrom: 'owner' })}>Masquer</button>}
              {ownerHidden && <button className={btn + small} onClick={() => patch(m, { status: 'published' })}>Réafficher</button>}
              {canDelete && <button className={btn + small} onClick={() => remove(m)}>Supprimer</button>}
            </div>
            {m.status === 'published' && <div className="text-xs text-bijou-silver">Pour supprimer une annonce publiée, masquez-la d'abord.</div>}
            {edit === m.id && <EventEditor ev={m} onDone={ok => { setEdit(''); if (ok) load() }} />}
          </div>
        )
      })}
    </div>
  )
}
