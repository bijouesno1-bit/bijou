import { useCallback, useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

type V = { id: string; name: string; kind: string; hours: string; phone: string; active: boolean }
const card = 'w-full max-w-md rounded-xl border border-bijou-gold/40 bg-white/5 p-4 flex flex-col gap-3'
const input = 'w-full rounded-lg bg-black/40 border border-bijou-silver/40 px-3 py-2 text-bijou-ivory'
const btn = 'rounded-xl border border-bijou-gold/60 px-3 py-2 text-sm font-medium active:scale-95 transition text-center'
const btnGold = 'rounded-xl bg-bijou-gold text-bijou-ink px-4 py-2 font-semibold active:scale-95 transition'
const empty = { name: '', kind: 'vente', description: '', hours: '', phone: '', email: '', mapUrl: '' }

export function AdminVenues() {
  const [list, setList] = useState<V[]>([])
  const [f, setF] = useState(empty)
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const s = await getDocs(collection(db, 'venues'))
      setList(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<V, 'id'>) })))
    } catch { setMsg('Lecture des lieux impossible.') }
  }, [])
  useEffect(() => { load() }, [load])

  function set(k: keyof typeof empty, v: string) { setF(p => ({ ...p, [k]: v })) }

  function locate() {
    if (!navigator.geolocation) { setMsg('Position non disponible sur cet appareil.'); return }
    navigator.geolocation.getCurrentPosition(
      p => {
        const lat = p.coords.latitude, lng = p.coords.longitude
        setPos({ lat, lng })
        set('mapUrl', 'https://www.google.com/maps?q=' + lat + ',' + lng)
        setMsg('Position enregistrée : lien carte rempli.')
      },
      () => setMsg('Position refusée ou indisponible. Tu peux coller un lien carte à la main.'),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  async function save() {
    if (!f.name.trim()) { setMsg('Le nom est obligatoire.'); return }
    if (f.mapUrl.trim() && !f.mapUrl.trim().startsWith('https://')) { setMsg('Le lien carte doit commencer par https://'); return }
    setBusy(true); setMsg('')
    try {
      await addDoc(collection(db, 'venues'), {
        name: f.name.trim().slice(0, 80), kind: f.kind, description: f.description.trim().slice(0, 300),
        hours: f.hours.trim().slice(0, 120), phone: f.phone.trim().slice(0, 30), email: f.email.trim().slice(0, 100),
        mapUrl: f.mapUrl.trim().slice(0, 300), lat: pos ? pos.lat : null, lng: pos ? pos.lng : null,
        active: true, createdAt: serverTimestamp(),
      })
      setF(empty); setPos(null); setMsg('Lieu ajouté.')
      await load()
    } catch { setMsg('Enregistrement refusé.') }
    setBusy(false)
  }

  async function toggle(v: V) {
    try { await updateDoc(doc(db, 'venues', v.id), { active: !v.active }); await load() } catch { setMsg('Mise à jour refusée.') }
  }
  async function remove(v: V) {
    if (!window.confirm('Supprimer « ' + v.name + ' » ?')) return
    try { await deleteDoc(doc(db, 'venues', v.id)); await load() } catch { setMsg('Suppression refusée.') }
  }

  return (
    <div className={card}>
      <h2 className="text-bijou-goldlight font-semibold">Lieux de vente et de distribution</h2>
      <p className="text-xs text-bijou-silver">Les informations saisies ici sont publiques : mets des numéros professionnels, avec l'indicatif (241…).</p>
      {list.map(v => (
        <div key={v.id} className="rounded-lg border border-bijou-silver/30 p-2 text-sm flex flex-col gap-1">
          <p><b>{v.name}</b> · {v.kind === 'vente' ? 'Vente' : 'Distribution'} · {v.active ? 'actif' : 'masqué'}</p>
          {v.hours && <p className="text-bijou-silver">{v.hours}</p>}
          <div className="flex gap-2">
            <button className={btn} onClick={() => toggle(v)}>{v.active ? 'Masquer' : 'Activer'}</button>
            <button className={btn} onClick={() => remove(v)}>Supprimer</button>
          </div>
        </div>
      ))}
      <input className={input} placeholder="Nom du lieu" value={f.name} onChange={e => set('name', e.target.value)} />
      <select className={input} value={f.kind} onChange={e => set('kind', e.target.value)}>
        <option value="vente">Point de vente</option>
        <option value="distribution">Point de distribution</option>
      </select>
      <textarea className={input} rows={2} placeholder="Situation (ex. en face de la pharmacie, 2e étage)" value={f.description} onChange={e => set('description', e.target.value)} />
      <input className={input} placeholder="Heures d'ouverture (ex. 9h-18h)" value={f.hours} onChange={e => set('hours', e.target.value)} />
      <input className={input} type="tel" placeholder="Téléphone / WhatsApp (ex. 24101234567)" value={f.phone} onChange={e => set('phone', e.target.value)} />
      <input className={input} type="email" placeholder="E-mail (facultatif)" value={f.email} onChange={e => set('email', e.target.value)} />
      <input className={input} placeholder="Lien carte (https://…)" value={f.mapUrl} onChange={e => set('mapUrl', e.target.value)} />
      <button className={btn} onClick={locate}>Utiliser ma position</button>
      {msg && <p className="text-sm text-bijou-goldlight">{msg}</p>}
      <button className={btnGold} disabled={busy} onClick={save}>{busy ? 'Enregistrement…' : 'Ajouter le lieu'}</button>
    </div>
  )
}
