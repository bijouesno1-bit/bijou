import { useCallback, useEffect, useState } from 'react'
import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { nextEventNum } from '../lib/eventNum'
import { posterUrl } from '../lib/cloudinary'
import { card, btn, btnGold } from '../lib/ui'

type A = {
  id: string; title: string; date: string; venue: string; city: string; description?: string
  category?: string; ownerName?: string; businessName?: string; contactPhone?: string; contactEmail?: string
  lat?: number; lng?: number; maxCapacity?: number; poster?: string; logo?: string; photos?: string[]
}
const CAT: Record<string, string> = { particulier: 'Particulier', etablissement: 'Établissement', entreprise: 'Entreprise' }

function waNumber(p?: string) {
  let d = (p ?? '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length <= 9) d = '241' + d.replace(/^0+/, '')
  return d
}
const when = (s: string) => { const x = new Date(s); return isNaN(x.getTime()) ? s : x.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) }

export function AdminAnnonces() {
  const { user } = useAuth()
  const [list, setList] = useState<A[]>([])
  const [msg, setMsg] = useState('')
  const [notice, setNotice] = useState<{ text: string; href: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const s = await getDocs(query(collection(db, 'events'), where('status', '==', 'pending')))
      setList(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<A, 'id'>) })))
      setMsg('')
    } catch { setMsg('Impossible de charger les annonces.') }
  }, [])
  useEffect(() => { load() }, [load])

  const audit = (action: string, id: string) =>
    addDoc(collection(db, 'auditLogs'), { action, target: id, by: user?.uid, at: serverTimestamp() }).catch(() => {})

  async function accept(a: A) {
    try {
      const num = await nextEventNum()
      await updateDoc(doc(db, 'events', a.id), { status: 'published', num, approvedAt: serverTimestamp() })
      audit('annonce_accept', a.id)
      const text = `Bonjour ${a.ownerName ?? ''}, votre événement « ${a.title} » est validé et publié sur BIJOU. Il restera affiché jusqu'au ${when(a.date)}. Merci de votre confiance !`
      setNotice({ text: `« ${a.title} » publié.`, href: `https://wa.me/${waNumber(a.contactPhone)}?text=${encodeURIComponent(text)}` })
      load()
    } catch { setMsg('Acceptation refusée.') }
  }

  async function refuse(a: A) {
    const reason = window.prompt('Motif du refus (facultatif) :') ?? null
    if (reason === null) return
    try {
      await updateDoc(doc(db, 'events', a.id), { status: 'refused', refusalReason: reason.trim().slice(0, 200), refusedAt: serverTimestamp() })
      audit('annonce_refuse', a.id)
      const text = `Bonjour ${a.ownerName ?? ''}, nous ne pouvons pas publier « ${a.title} » pour le moment.${reason.trim() ? ' Motif : ' + reason.trim() : ''}`
      setNotice({ text: `« ${a.title} » refusé.`, href: `https://wa.me/${waNumber(a.contactPhone)}?text=${encodeURIComponent(text)}` })
      load()
    } catch { setMsg('Refus impossible.') }
  }

  return (
    <>
      {msg && <p className="text-bijou-alert text-sm">{msg}</p>}
      {notice && (
        <div className={card}>
          <p className="text-sm text-bijou-ok">{notice.text}</p>
          <a className={btnGold} target="_blank" rel="noreferrer" href={notice.href}>Prévenir l'organisateur sur WhatsApp</a>
        </div>
      )}
      {list.length === 0 && <p className="text-sm text-bijou-silver">Aucune annonce en attente.</p>}
      {list.map(a => (
        <div key={a.id} className={card}>
          <div className="flex items-center gap-3">
            {a.logo && <img src={posterUrl(a.logo, 120)} alt="" className="h-12 w-12 rounded-lg object-cover bg-black/30" />}
            <div className="min-w-0">
              <div className="font-semibold truncate">{a.title}</div>
              <div className="text-xs text-bijou-goldlight">{CAT[a.category ?? ''] ?? a.category}{a.businessName ? ' · ' + a.businessName : ''}</div>
            </div>
          </div>
          {a.poster && <img src={posterUrl(a.poster, 400)} alt={a.title} loading="lazy" className="w-full rounded-lg object-cover bg-black/30" />}
          <p className="text-sm text-bijou-silver">{when(a.date)} · {a.venue}, {a.city}</p>
          {a.description && <p className="text-sm">{a.description}</p>}
          <p className="text-xs text-bijou-silver">
            {a.ownerName} · {a.contactPhone}{a.contactEmail ? ' · ' + a.contactEmail : ''}
            {a.maxCapacity ? ` · ${a.maxCapacity} places` : ''}
          </p>
          {typeof a.lat === 'number' && typeof a.lng === 'number' && (
            <a className="text-xs underline text-bijou-goldlight" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${a.lat},${a.lng}`}>Voir la position</a>
          )}
          {a.category !== 'particulier' && <p className="text-xs text-bijou-goldlight">À encaisser : 10 000 F CFA</p>}
          <div className="flex gap-2">
            <button className={btnGold} onClick={() => accept(a)}>Accepter</button>
            <button className={btn} onClick={() => refuse(a)}>Refuser</button>
          </div>
        </div>
      ))}
    </>
  )
}
