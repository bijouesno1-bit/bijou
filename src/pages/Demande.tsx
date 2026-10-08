import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { PAY_LABEL, STATUS_LABEL, refOf } from '../lib/requests'

type Req = {
  id: string; ticketName: string; quantity: number; total: number; customerName: string
  paymentMethod: string; status: string; adminNote?: string
}

const base = import.meta.env.BASE_URL
const bg = 'min-h-screen bg-gradient-to-br from-[#07070C] to-bijou-navy text-bijou-ivory p-5 flex flex-col items-center gap-4'
const card = 'w-full max-w-md rounded-xl border border-bijou-gold/40 bg-white/5 p-4 flex flex-col gap-3'
const btn = 'rounded-xl border border-bijou-gold/60 px-4 py-2 font-medium active:scale-95 transition text-center'

const MESSAGE: Record<string, string> = {
  pending: "Ta demande a bien été reçue. Elle attend la décision de l'organisateur. Ce n'est pas encore un billet.",
  approved: "Ta demande est approuvée. Le paiement doit maintenant être effectué : l'organisateur te communiquera les instructions. Ton billet ne sera émis qu'après confirmation du paiement.",
  refused: "Ta demande n'a pas été retenue.",
  info_needed: "L'organisateur a besoin d'informations supplémentaires.",
}

export default function Demande() {
  const { id } = useParams()
  const [r, setR] = useState<Req | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading')

  useEffect(() => {
    (async () => {
      try {
        const s = await getDoc(doc(db, 'requests', id ?? '_'))
        if (s.exists()) { setR({ id: s.id, ...(s.data() as Omit<Req, 'id'>) }); setState('ok') }
        else setState('missing')
      } catch { setState('error') }
    })()
  }, [id])

  const wa = import.meta.env.VITE_ADMIN_WHATSAPP as string | undefined
  const waLink = r && wa
    ? `https://wa.me/${wa}?text=${encodeURIComponent(
        `Nouvelle demande BIJOU ${refOf(r.id)} : ${r.customerName}, ${r.quantity} x ${r.ticketName}, ${r.total.toLocaleString('fr-FR')} FCFA (${PAY_LABEL[r.paymentMethod] ?? r.paymentMethod}). Lien : ${location.origin}${base}#/admin`
      )}`
    : ''

  return (
    <div className={bg}>
      <img src={`${base}brand/logo-sombre.svg`} alt="BIJOU" className="w-48" />
      <h1 className="text-xl text-bijou-goldlight">Ma demande</h1>
      {state === 'loading' && <p className="text-bijou-silver">Chargement…</p>}
      {state === 'missing' && <p className="text-bijou-alert text-center">Demande introuvable. Vérifie le lien.</p>}
      {state === 'error' && <p className="text-bijou-alert text-center">Impossible de charger la demande. Réessaie.</p>}
      {state === 'ok' && r && (
        <div className={card}>
          <p className="text-sm text-bijou-silver">Référence</p>
          <p className="text-2xl font-semibold text-bijou-goldlight">{refOf(r.id)}</p>
          <p>{r.quantity} × {r.ticketName} · {r.total.toLocaleString('fr-FR')} FCFA</p>
          <p className="text-sm text-bijou-silver">Paiement envisagé : {PAY_LABEL[r.paymentMethod] ?? r.paymentMethod}</p>
          <p className="font-semibold">Statut : {STATUS_LABEL[r.status] ?? r.status}</p>
          <p className="text-sm">{MESSAGE[r.status] ?? ''}</p>
          {r.adminNote && <p className="text-sm rounded-lg bg-black/30 p-2">Message de l'organisateur : {r.adminNote}</p>}
          {waLink && r.status === 'pending' && (
            <a href={waLink} target="_blank" rel="noreferrer" className="rounded-xl bg-bijou-gold text-bijou-ink px-4 py-2 font-semibold text-center">
              Prévenir l'organisateur sur WhatsApp
            </a>
          )}
          <p className="text-xs text-bijou-silver">Garde cette page en favori : elle te permet de suivre ta demande.</p>
        </div>
      )}
      <Link to="/reserver" className={btn}>Retour aux événements</Link>
    </div>
  )
}
