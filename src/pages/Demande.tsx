import { bg, card, btn, btnGold } from '../lib/ui'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { PAY_LABEL, STATUS_LABEL, refOf } from '../lib/requests'

type Req = {
  id: string; ticketName: string; quantity: number; total: number; customerName: string; phone?: string
  paymentMethod: string; status: string; adminNote?: string
  paymentStatus?: string; ticketTokens?: string[]; ownerId?: string; waSent?: boolean
}

const base = import.meta.env.BASE_URL

const MESSAGE: Record<string, string> = {
  approved: "Ta demande est approuvée. Effectue le paiement en suivant les instructions ci-dessous, puis attends la confirmation de l'organisateur : tes billets apparaîtront sur cette page.",
  refused: "L'organisateur n'a pas retenu ta demande. Aucun billet n'a été émis.",
  info_needed: "L'organisateur a besoin d'informations supplémentaires.",
  expired: "Le délai pour payer est dépassé : ta réservation a expiré. Refais une demande si des places sont encore disponibles.",
}

export default function Demande() {
  const { id } = useParams()
  const [r, setR] = useState<Req | null>(null)
  const [instr, setInstr] = useState('')
  const [orgWa, setOrgWa] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading')

  useEffect(() => {
    (async () => {
      let owner = ''
      try {
        const s = await getDoc(doc(db, 'requests', id ?? '_'))
        if (s.exists()) {
          const d = { id: s.id, ...(s.data() as Omit<Req, 'id'>) }
          owner = d.ownerId ?? ''
          setR(d); setState('ok')
        } else { setState('missing'); return }
      } catch { setState('error'); return }
      try {
        const p = await getDoc(owner ? doc(db, 'orgPayment', owner) : doc(db, 'settings', 'payment'))
        if (p.exists()) {
          const d = p.data() as { text?: string; organizerWa?: string }
          setInstr(d.text ?? '')
          setOrgWa(String(d.organizerWa ?? '').replace(/\D/g, ''))
        }
      } catch { /* ignore */ }
    })()
  }, [id])

  const paid = r?.paymentStatus === 'confirmed'

  const live = !!r && !paid && ((r.status === 'pending' && !!r.waSent) || r.status === 'approved')
  useEffect(() => {
    if (!id || !live) return
    return onSnapshot(doc(db, 'requests', id), s => {
      if (s.exists()) setR({ id: s.id, ...(s.data() as Omit<Req, 'id'>) })
    }, () => { /* droits ou réseau : on ignore */ })
  }, [id, live])
  const validateUrl = r ? window.location.origin + window.location.pathname + '#/valider/' + r.id : ''
  const waLink = r && orgWa
    ? 'https://wa.me/' + orgWa + '?text=' + encodeURIComponent(
        'Nouvelle réservation BIJOU ' + refOf(r.id) + '\n' +
        'Client : ' + r.customerName + (r.phone ? ' (' + r.phone + ')' : '') + '\n' +
        r.quantity + ' x ' + r.ticketName + '\n' +
        'Montant : ' + r.total.toLocaleString('fr-FR') + ' FCFA (' + (PAY_LABEL[r.paymentMethod] ?? r.paymentMethod) + ')\n' +
        'Je règle maintenant sur votre numéro de paiement.\n' +
        'Valider ou refuser : ' + validateUrl)
    : ''

  async function refresh() {
    if (!id) return
    try {
      const s = await getDoc(doc(db, 'requests', id))
      if (s.exists()) setR({ id: s.id, ...(s.data() as Omit<Req, 'id'>) })
    } catch { /* ignore */ }
  }

  async function sendWa() {
    if (!r || !waLink) return
    setErr('')
    window.open(waLink, '_blank')
    setBusy(true)
    try {
      await updateDoc(doc(db, 'requests', r.id), { waSent: true, waSentAt: serverTimestamp() })
      setR(prev => (prev ? { ...prev, waSent: true } : prev))
    } catch {
      setErr("L'envoi n'a pas pu être enregistré. Vérifie ta connexion puis réessaie.")
    }
    setBusy(false)
  }

  const step1 = !!r && r.status === 'pending' && !r.waSent
  const step2 = !!r && r.status === 'pending' && !!r.waSent
  const legacy = !!r && r.status === 'approved' && !paid

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
          <p className="font-semibold">Statut : {paid ? 'Validée, billets émis' : (STATUS_LABEL[r.status] ?? r.status)}</p>
          {paid && <p className="text-sm">Ton paiement est validé par l'organisateur. Tes billets sont prêts.</p>}
          {!paid && MESSAGE[r.status] && <p className="text-sm">{MESSAGE[r.status]}</p>}
          {r.adminNote && <p className="text-sm rounded-lg bg-black/30 p-2">Message de l'organisateur : {r.adminNote}</p>}

          {step1 && (
            <div className="rounded-lg bg-black/30 p-3 text-sm flex flex-col gap-2">
              <p className="font-semibold text-bijou-goldlight">Étape 1 sur 3 : prévenir l'organisateur</p>
              <p>Envoie d'abord le message préparé à l'organisateur sur WhatsApp. Les instructions de paiement s'affichent juste après.</p>
              <button className={btnGold} disabled={!waLink || busy} onClick={sendWa}>{busy ? 'Envoi…' : 'Envoyer sur WhatsApp'}</button>
              {!waLink && <p className="text-bijou-alert">Le numéro WhatsApp de l'organisateur n'est pas disponible.</p>}
              {err && <p className="text-bijou-alert">{err}</p>}
            </div>
          )}

          {step2 && (
            <div className="rounded-lg bg-black/30 p-3 text-sm flex flex-col gap-2 whitespace-pre-line">
              <p className="font-semibold text-bijou-goldlight">Étape 2 sur 3 : effectue ton paiement</p>
              <p>Message envoyé à l'organisateur. Paie maintenant {r.total.toLocaleString('fr-FR')} FCFA, depuis ton numéro{r.phone ? ' ' + r.phone : ''}, avec ton nom comme sur la demande.</p>
              {instr ? <p>{instr}</p> : <p className="text-bijou-alert">Instructions indisponibles : contacte l'organisateur.</p>}
              <p className="font-semibold text-bijou-goldlight">Étape 3 sur 3 : ton billet</p>
              <p>Dès que l'organisateur a vérifié ton paiement et validé, ton billet apparaît ici. Garde cette page.</p>
              {waLink && <a href={waLink} target="_blank" rel="noreferrer" className={btn + ' text-center'}>Renvoyer le message WhatsApp</a>}
            </div>
          )}

          {legacy && instr && (
            <div className="rounded-lg bg-black/30 p-3 text-sm whitespace-pre-line">
              <p className="font-semibold text-bijou-goldlight mb-1">Comment payer</p>
              {instr}
            </div>
          )}

          {paid && (r.ticketTokens ?? []).map((t, i) => (
            <Link key={t} to={`/billet/${t}`} className="rounded-xl bg-bijou-gold text-bijou-ink px-4 py-2 font-semibold text-center">
              Voir et imprimer mon billet {i + 1}/{r.ticketTokens!.length}
            </Link>
          ))}
          {!paid && r.status !== 'refused' && <button className={btn} onClick={refresh}>Actualiser ma demande</button>}
          <p className="text-xs text-bijou-silver">Garde cette page en favori : elle te permet de suivre ta demande et de retrouver tes billets.</p>
        </div>
      )}
      <Link to="/reserver" className={btn}>Retour aux événements</Link>
    </div>
  )
}
