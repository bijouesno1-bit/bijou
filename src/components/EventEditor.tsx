import { useState } from 'react'
import { doc, updateDoc, type DocumentData } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { PosterInput } from './PosterInput'
import { btn, btnGold, input } from '../lib/ui'

export type Ev = {
  id: string; title: string; date: string; venue?: string; city?: string; description?: string
  status?: string; hiddenFrom?: string; poster?: string; photos?: string[]
  contactPhone?: string; contactEmail?: string; ownerName?: string; ownerId?: string; num?: number | string
}

export function EventEditor({ ev, onDone }: { ev: Ev; onDone: (saved: boolean) => void }) {
  const d0 = ev.date && ev.date.length > 16 ? ev.date.slice(0, 16) : (ev.date ?? '')
  const photos0 = ev.photos ?? []
  const [title, setTitle] = useState(ev.title ?? '')
  const [date, setDate] = useState(d0)
  const [venue, setVenue] = useState(ev.venue ?? '')
  const [city, setCity] = useState(ev.city ?? '')
  const [phone, setPhone] = useState(ev.contactPhone ?? '')
  const [description, setDescription] = useState(ev.description ?? '')
  const [poster, setPoster] = useState(ev.poster ?? '')
  const [p1, setP1] = useState(photos0[0] ?? '')
  const [p2, setP2] = useState(photos0[1] ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    const t = title.trim().slice(0, 120)
    if (t.length < 2) { setErr('Titre trop court.'); return }
    setBusy(true)
    setErr('')
    try {
      const data: DocumentData = {
        title: t, venue: venue.trim(), city: city.trim(),
        description: description.trim().slice(0, 1000),
        contactPhone: phone.trim().slice(0, 20), poster,
        photos: [p1, p2, ...photos0.slice(2)].filter(Boolean),
      }
      if (date !== d0) data.date = date
      await updateDoc(doc(db, 'events', ev.id), data)
      onDone(true)
    } catch {
      setErr('Enregistrement refusé.')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-bijou-gold/20 pt-3">
      <input className={input} placeholder="Titre" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} />
      <input className={input} type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
      <input className={input} placeholder="Lieu" value={venue} onChange={e => setVenue(e.target.value)} />
      <input className={input} placeholder="Ville" value={city} onChange={e => setCity(e.target.value)} />
      <input className={input} type="tel" placeholder="Téléphone de contact" value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} />
      <textarea className={input} rows={4} placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} />
      <PosterInput url={poster} onChange={setPoster} label="Affiche principale" />
      <PosterInput url={p1} onChange={setP1} label="Photo 2" compact />
      <PosterInput url={p2} onChange={setP2} label="Photo 3" compact />
      {err && <p className="text-bijou-alert text-sm">{err}</p>}
      <div className="flex gap-2">
        <button type="button" className={btnGold} disabled={busy} onClick={save}>{busy ? 'Envoi…' : 'Enregistrer'}</button>
        <button type="button" className={btn} disabled={busy} onClick={() => onDone(false)}>Annuler</button>
      </div>
    </div>
  )
}
