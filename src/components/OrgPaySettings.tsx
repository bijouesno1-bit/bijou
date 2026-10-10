import { useEffect, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { card, btnGold, input } from '../lib/ui'

const tail = (s: string) => s.replace(/\D/g, '').slice(-8)

export function OrgPaySettings() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const [wa, setWa] = useState('')
  const [airtel, setAirtel] = useState('')
  const [moov, setMoov] = useState('')
  const [cash, setCash] = useState('')
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)

  useEffect(() => {
    if (!uid) return
    getDoc(doc(db, 'orgPayment', uid))
      .then(s => {
        if (!s.exists()) return
        const d = s.data() as { organizerWa?: string; airtel?: string; moov?: string; cash?: string }
        setWa(d.organizerWa ?? ''); setAirtel(d.airtel ?? ''); setMoov(d.moov ?? ''); setCash(d.cash ?? '')
      })
      .catch(() => {})
  }, [uid])

  async function save() {
    setMsg(''); setOk(false)
    const w = wa.replace(/\D/g, '')
    if (w.length < 8 || w.length > 15) return setMsg('WhatsApp invalide : indicatif pays + numéro, sans + ni espaces (ex. 24107XXXXXXX).')
    const nums = [airtel, moov].filter(x => x.trim())
    if (nums.length === 0 && !cash.trim()) return setMsg('Renseigne au moins un numéro Mobile Money ou un point de paiement en espèces.')
    if (nums.some(n => tail(n) === tail(w))) return setMsg('Le numéro Mobile Money doit être différent du numéro WhatsApp qui reçoit les messages.')
    if (airtel.trim() && moov.trim() && tail(airtel) === tail(moov)) return setMsg('Les numéros Airtel et Moov doivent être différents.')
    const methods = [airtel.trim() && 'airtel', moov.trim() && 'moov', cash.trim() && 'cash'].filter(Boolean) as string[]
    const text = [
      airtel.trim() && 'Airtel Money : ' + airtel.trim(),
      moov.trim() && 'Moov Money : ' + moov.trim(),
      cash.trim() && 'Espèces : ' + cash.trim(),
      'Indique ta référence BJ-XXXXXX dans le message du paiement.',
    ].filter(Boolean).join('\n')
    try {
      await setDoc(doc(db, 'orgPayment', uid), { organizerWa: w, airtel: airtel.trim(), moov: moov.trim(), cash: cash.trim(), methods, text, updatedAt: serverTimestamp() })
      setOk(true); setMsg('Numéros enregistrés.')
    } catch { setMsg('Enregistrement refusé.') }
  }

  return (
    <div className={card}>
      <h2 className="text-bijou-goldlight">Mes numéros de paiement</h2>
      <p className="text-xs text-bijou-silver">Le numéro WhatsApp reçoit les messages de réservation. Les numéros Mobile Money reçoivent les dépôts et doivent être différents. Ils ne s'affichent au client qu'après l'envoi du message WhatsApp.</p>
      <input className={input} placeholder="WhatsApp (ex. 24107XXXXXXX)" inputMode="numeric" value={wa} onChange={e => setWa(e.target.value)} />
      <input className={input} placeholder="Airtel Money (facultatif)" inputMode="numeric" value={airtel} onChange={e => setAirtel(e.target.value)} />
      <input className={input} placeholder="Moov Money (facultatif)" inputMode="numeric" value={moov} onChange={e => setMoov(e.target.value)} />
      <input className={input} placeholder="Espèces : lieu de paiement (facultatif)" value={cash} onChange={e => setCash(e.target.value)} />
      {msg && <p className={'text-sm ' + (ok ? 'text-bijou-ok' : 'text-bijou-alert')}>{msg}</p>}
      <button className={btnGold} onClick={save}>Enregistrer</button>
    </div>
  )
}
