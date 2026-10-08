import { useEffect, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

type Pay = { organizerWa: string; airtel: string; moov: string; iban: string; cash: string }
const empty: Pay = { organizerWa: '', airtel: '', moov: '', iban: '', cash: '' }
const inp = 'w-full rounded-lg bg-black/40 border border-bijou-silver/40 px-3 py-2 text-bijou-ivory'

export function AdminPaymentSettings() {
  const [f, setF] = useState<Pay>(empty)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    getDoc(doc(db, 'settings', 'payment'))
      .then(s => { if (s.exists()) setF({ ...empty, ...(s.data() as Partial<Pay>) }) })
      .catch(() => { /* ignore */ })
  }, [])

  function set(k: keyof Pay, v: string) { setF(p => ({ ...p, [k]: v })) }

  async function save() {
    setMsg('')
    const wa = f.organizerWa.replace(/\D/g, '')
    if (wa.length < 8 || wa.length > 15) {
      setMsg('WhatsApp invalide : indicatif pays + numéro, sans + ni espaces (ex. 24107XXXXXXX).')
      return
    }
    const lines = [
      f.airtel.trim() && 'Airtel Money : ' + f.airtel.trim(),
      f.moov.trim() && 'Moov Money : ' + f.moov.trim(),
      f.iban.trim() && 'IBAN : ' + f.iban.trim(),
      f.cash.trim() && 'Espèces : ' + f.cash.trim(),
      'Indique ta référence BJ-XXXXXX dans le message du paiement.',
    ].filter(Boolean)
    try {
      await setDoc(doc(db, 'settings', 'payment'), {
        organizerWa: wa,
        airtel: f.airtel.trim(),
        moov: f.moov.trim(),
        iban: f.iban.trim(),
        cash: f.cash.trim(),
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
      {msg && <p className="text-sm text-bijou-goldlight">{msg}</p>}
      <button className="rounded-xl border border-bijou-gold/60 px-4 py-2 font-medium active:scale-95 transition" onClick={save}>Enregistrer</button>
    </div>
  )
}
