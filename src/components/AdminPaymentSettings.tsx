import { useEffect, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

type Pay = { organizerWa: string; airtel: string; moov: string; iban: string; cash: string; methods: string[] }
const empty: Pay = { organizerWa: '', airtel: '', moov: '', iban: '', cash: '', methods: [] }

// moyens de paiement proposables ; need = champ de coordonnées obligatoire pour l'activer
const METHODS: { key: string; label: string; need?: 'airtel' | 'moov' | 'iban' }[] = [
  { key: 'airtel', label: 'Airtel Money', need: 'airtel' },
  { key: 'moov', label: 'Moov Money', need: 'moov' },
  { key: 'virement', label: 'Virement bancaire', need: 'iban' },
  { key: 'cash', label: 'Espèces' },
]
const inp = 'w-full rounded-lg bg-black/40 border border-bijou-silver/40 px-3 py-2 text-bijou-ivory'

export function AdminPaymentSettings() {
  const [f, setF] = useState<Pay>(empty)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    getDoc(doc(db, 'settings', 'payment'))
      .then(s => {
        if (!s.exists()) return
        const d = s.data() as Partial<Pay>
        const derived = METHODS.filter(m => !m.need || String(d[m.need] ?? '').trim()).map(m => m.key)
        setF({ ...empty, ...d, methods: Array.isArray(d.methods) ? d.methods : derived })
      })
      .catch(() => { /* ignore */ })
  }, [])

  function set(k: Exclude<keyof Pay, 'methods'>, v: string) { setF(p => ({ ...p, [k]: v })) }
  function toggleMethod(key: string) {
    setF(p => ({ ...p, methods: p.methods.includes(key) ? p.methods.filter(x => x !== key) : [...p.methods, key] }))
  }

  async function save() {
    setMsg('')
    const wa = f.organizerWa.replace(/\D/g, '')
    if (wa.length < 8 || wa.length > 15) {
      setMsg('WhatsApp invalide : indicatif pays + numéro, sans + ni espaces (ex. 24107XXXXXXX).')
      return
    }
    if (f.methods.length === 0) {
      setMsg('Active au moins un moyen de paiement.')
      return
    }
    const miss = METHODS.filter(m => f.methods.includes(m.key) && m.need && !f[m.need].trim())
    if (miss.length) {
      setMsg('Renseigne les coordonnées de : ' + miss.map(m => m.label).join(', ') + '.')
      return
    }
    const lines = [
      f.methods.includes('airtel') && f.airtel.trim() && 'Airtel Money : ' + f.airtel.trim(),
      f.methods.includes('moov') && f.moov.trim() && 'Moov Money : ' + f.moov.trim(),
      f.methods.includes('virement') && f.iban.trim() && 'IBAN : ' + f.iban.trim(),
      f.methods.includes('cash') && f.cash.trim() && 'Espèces : ' + f.cash.trim(),
      'Indique ta référence BJ-XXXXXX dans le message du paiement.',
    ].filter(Boolean)
    try {
      await setDoc(doc(db, 'settings', 'payment'), {
        organizerWa: wa,
        airtel: f.airtel.trim(),
        moov: f.moov.trim(),
        iban: f.iban.trim(),
        cash: f.cash.trim(),
        methods: f.methods,
        text: lines.join('\n'),
        updatedAt: serverTimestamp(),
      })
      setF(p => ({ ...p, organizerWa: wa }))
      setMsg('Paramètres enregistrés.')
    } catch {
      setMsg('Enregistrement refusé : règles Firestore à publier ?')
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-bijou-gold/40 bg-white/5 p-4 flex flex-col gap-3">
      <h2 className="text-bijou-goldlight">Paiement et notifications</h2>
      <label className="text-xs text-bijou-silver">WhatsApp de l'organisateur (obligatoire) : reçoit les notifications de demandes</label>
      <input className={inp} inputMode="tel" maxLength={20} placeholder="24107XXXXXXX" value={f.organizerWa} onChange={e => set('organizerWa', e.target.value)} />
      <p className="text-xs text-bijou-silver">Sans ce numéro, les réservations restent fermées.</p>
      <label className="text-xs text-bijou-silver">Airtel Money (numéro et nom)</label>
      <input className={inp} maxLength={100} placeholder="07 XX XX XX (Nom)" value={f.airtel} onChange={e => set('airtel', e.target.value)} />
      <label className="text-xs text-bijou-silver">Moov Money (numéro et nom)</label>
      <input className={inp} maxLength={100} placeholder="06 XX XX XX (Nom)" value={f.moov} onChange={e => set('moov', e.target.value)} />
      <label className="text-xs text-bijou-silver">IBAN (facultatif)</label>
      <input className={inp} maxLength={100} value={f.iban} onChange={e => set('iban', e.target.value)} />
      <label className="text-xs text-bijou-silver">Espèces : lieu de remise (facultatif)</label>
      <input className={inp} maxLength={100} value={f.cash} onChange={e => set('cash', e.target.value)} />
      <p className="text-xs text-bijou-silver">
        Active les moyens de paiement proposés aux clients. Un moyen coché doit avoir ses coordonnées renseignées ci-dessus.
      </p>
      {METHODS.map(m => (
        <label key={m.key} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.methods.includes(m.key)} onChange={() => toggleMethod(m.key)} />
          {m.label}
        </label>
      ))}
      {msg && <p className="text-sm text-bijou-goldlight">{msg}</p>}
      <button className="rounded-xl border border-bijou-gold/60 px-4 py-2 font-medium active:scale-95 transition" onClick={save}>Enregistrer</button>
    </div>
  )
}
