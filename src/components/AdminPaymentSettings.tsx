import { useEffect, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export function AdminPaymentSettings() {
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    getDoc(doc(db, 'settings', 'payment'))
      .then(s => { if (s.exists()) setText((s.data() as { text?: string }).text ?? '') })
      .catch(() => { /* ignore */ })
  }, [])

  async function save() {
    setMsg('')
    try {
      await setDoc(doc(db, 'settings', 'payment'), { text: text.trim(), updatedAt: serverTimestamp() })
      setMsg('Instructions enregistrées.')
    } catch {
      setMsg('Enregistrement refusé : règles Firestore à publier ?')
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-bijou-gold/40 bg-white/5 p-4 flex flex-col gap-3">
      <h2 className="text-bijou-goldlight">Instructions de paiement</h2>
      <p className="text-xs text-bijou-silver">Affichées au client dès que sa demande est approuvée (numéros Airtel/Moov, IBAN, lieu pour les espèces…).</p>
      <textarea
        className="w-full rounded-lg bg-black/40 border border-bijou-silver/40 px-3 py-2 text-bijou-ivory"
        rows={5} maxLength={1000} value={text} onChange={e => setText(e.target.value)}
        placeholder={'Airtel Money : 07 XX XX XX (Nom)\nMoov Money : 06 XX XX XX (Nom)\nIndique ta référence BJ-XXXXXX dans le message.'}
      />
      {msg && <p className="text-sm text-bijou-goldlight">{msg}</p>}
      <button className="rounded-xl border border-bijou-gold/60 px-4 py-2 font-medium active:scale-95 transition" onClick={save}>Enregistrer</button>
    </div>
  )
}
