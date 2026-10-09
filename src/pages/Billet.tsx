import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import * as QRCode from 'qrcode'
import { db } from '../lib/firebase'
import { refOf } from '../lib/requests'
import { Venues } from '../components/Venues'
import { KIND_CARD, KIND_LABEL, KIND_PLAIN } from '../lib/kinds'

type Tk = {
  requestId: string; ticketName: string; eventTitle: string; eventDate: string
  venue: string; city: string; holderName: string; seq: number; count: number; status: string; persons?: number; zone?: string; validUntil?: string | null; kind?: string
}

const base = import.meta.env.BASE_URL
const bg = 'min-h-screen bg-gradient-to-br from-[#07070C]/60 to-bijou-navy/60 text-bijou-ivory p-5 flex flex-col items-center gap-4 print:bg-white print:p-0'
const btn = 'rounded-xl border border-bijou-gold/60 px-4 py-2 font-medium active:scale-95 transition text-center print:hidden'
const STATE_LABEL: Record<string, string> = { used: 'Billet déjà utilisé', cancelled: 'Billet annulé', revoked: 'Billet révoqué' }

function fmt(d: string) {
  if (!d) return ''
  const x = new Date(d)
  return x.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    + ' à ' + x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function Billet() {
  const { token } = useParams()
  const [t, setT] = useState<Tk | null>(null)
  const [qr, setQr] = useState('')
  const [now, setNow] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i) }, [])
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading')

  useEffect(() => {
    (async () => {
      try {
        const s = await getDoc(doc(db, 'tickets', token ?? '_'))
        if (!s.exists()) { setState('missing'); return }
        setT(s.data() as Tk)
        setQr(await QRCode.toDataURL('BIJOU:' + (token ?? ''), { width: 360, margin: 2, errorCorrectionLevel: 'M' }))
        setState('ok')
      } catch { setState('error') }
    })()
  }, [token])

  return (
    <div className={bg}>
      {state === 'loading' && <p className="text-bijou-silver">Chargement…</p>}
      {state === 'missing' && <p className="text-bijou-alert text-center">Billet introuvable. Vérifie le lien.</p>}
      {state === 'error' && <p className="text-bijou-alert text-center">Impossible de charger le billet. Réessaie.</p>}
      {state === 'ok' && t && (
        <div className={'relative isolate overflow-hidden w-full max-w-sm rounded-2xl border-2 bg-bijou-ivory text-bijou-ink p-5 flex flex-col items-center gap-3 ' + (KIND_CARD[t.kind ?? 'classic'] ?? KIND_CARD.classic)}>
          <div aria-hidden="true" className="pointer-events-none absolute -inset-1/2 -z-10 opacity-[0.09] -rotate-[25deg]" style={{ backgroundImage: "url(" + base + "brand/logo-clair.svg)", backgroundSize: "140px auto", backgroundRepeat: "repeat" }} />
          <img src={`${base}brand/logo-clair.svg`} alt="BIJOU" className="w-40" />
          <p className="text-xs uppercase tracking-widest opacity-60">Billet authentique</p>
          <h1 className="text-xl font-bold text-center">{t.eventTitle}</h1>
          <p className="text-sm text-center capitalize">{fmt(t.eventDate)}</p>
          <p className="text-sm text-center">{t.venue}, {t.city}</p>
          <div className="rounded-full bg-bijou-ink text-bijou-goldlight px-4 py-1 font-semibold">{t.ticketName}</div>
          {t.kind && !KIND_PLAIN.includes(t.kind) && (
            <p className="rounded bg-bijou-gold text-bijou-ink px-2 py-0.5 text-xs font-bold uppercase tracking-widest">{KIND_LABEL[t.kind] ?? t.kind}</p>
          )}
          {t.kind === 'invitation' && <p className="text-sm italic">Invitation : entrée gratuite</p>}
          {qr && <img src={qr} alt="QR code du billet" className="w-56 h-56" />}
          <p className="font-mono text-sm">{refOf(t.requestId)}-{t.seq}</p>
          <p className="bijou-live rounded px-3 py-0.5 text-xs font-semibold print:hidden">Vérifié en direct · {now.toLocaleString('fr-FR')}</p>
          {t.kind === 'invitation' && <p className="text-sm">Entrée gratuite</p>}
          <p className="text-sm">{t.holderName} · billet {t.seq}/{t.count}</p>
          {((t.persons ?? 1) > 1 || t.zone) && <p className="text-sm">{[(t.persons ?? 1) > 1 && `Valable pour ${t.persons} personnes`, t.zone].filter(Boolean).join(' · ')}</p>}
          {t.validUntil && <p className="text-xs">Valable jusqu'au {new Date(t.validUntil).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</p>}
          {t.status !== 'valid' && (
            <p className="rounded-lg bg-bijou-alert text-white px-3 py-1 text-sm font-semibold">{STATE_LABEL[t.status] ?? 'Billet non valide'}</p>
          )}
        </div>
      )}
      {state === 'ok' && <button className={btn} onClick={() => window.print()}>Imprimer / Enregistrer en PDF</button>}
      <div className="print:hidden w-full max-w-sm"><Venues /></div>
      <Link to="/" className={btn}>Retour à l'accueil</Link>
    </div>
  )
}
