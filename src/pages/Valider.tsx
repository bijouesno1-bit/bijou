import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { addDoc, collection, doc, getDoc, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { newToken } from '../lib/token'
import { LoginForm } from '../components/LoginForm'
import { PAY_LABEL, STATUS_LABEL, refOf } from '../lib/requests'
import { bg, card, btn, btnGold, input } from '../lib/ui'

type Req = {
  id: string; eventId: string; ticketTypeId: string; ticketName: string; unitPrice: number; quantity: number; total: number
  customerName: string; phone?: string; paymentMethod: string; status: string; paymentStatus?: string
  ownerId?: string; waSent?: boolean; ticketTokens?: string[]
}

const base = import.meta.env.BASE_URL

export default function Valider() {
  const { id } = useParams()
  const { user, isAdmin, isOrganizer, loading, logout } = useAuth()
  const [r, setR] = useState<Req | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading')
  const [step, setStep] = useState<'view' | 'confirm' | 'refuse'>('view')
  const [txRef, setTxRef] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState('')

  const load = useCallback(async () => {
    try {
      const s = await getDoc(doc(db, 'requests', id ?? '_'))
      if (s.exists()) { setR({ id: s.id, ...(s.data() as Omit<Req, 'id'>) }); setState('ok') }
      else setState('missing')
    } catch { setState('error') }
  }, [id])
  useEffect(() => { load() }, [load])

  const mine = !!user && !!r && (isAdmin || (isOrganizer && r.ownerId === user.uid))
  const open = !!r && (r.status === 'pending' || r.status === 'approved') && r.paymentStatus !== 'confirmed'

  const clientDigits = (() => {
    const d = (r?.phone ?? '').replace(/\D/g, '')
    if (!d) return ''
    if (d.startsWith('241') && d.length >= 11) return d
    return '241' + d.replace(/^0+/, '')
  })()
  const trackUrl = r ? window.location.origin + window.location.pathname + '#/demande/' + r.id : ''
  const waClient = r && r.paymentStatus === 'confirmed' && clientDigits
    ? 'https://wa.me/' + clientDigits + '?text=' + encodeURIComponent(
        'BIJOU ' + refOf(r.id) + '\nBonjour ' + r.customerName + ', ton paiement est validé. Voici ton billet :\n' + (r.ticketTokens ?? []).map((tk, i) => ((r.ticketTokens ?? []).length > 1 ? 'Billet ' + (i + 1) + '/' + (r.ticketTokens ?? []).length + ' : ' : '') + window.location.origin + window.location.pathname + '#/billet/' + tk).join('\n') + '\nSuivi de ta demande : ' + trackUrl)
    : ''

  async function validate() {
    if (!user || !r || busy) return
    setBusy(true); setErr('')
    try {
      await runTransaction(db, async tx => {
        const rRef = doc(db, 'requests', r.id)
        const rs = await tx.get(rRef)
        if (!rs.exists()) throw new Error('Demande introuvable.')
        const cur = rs.data() as { status: string; paymentStatus?: string; waSent?: boolean; quantity: number; unitPrice: number; customerName: string; ticketName: string; ticketTypeId: string; eventId: string }
        if (cur.paymentStatus === 'confirmed') throw new Error('Billets déjà émis.')
        if (cur.status !== 'pending' && cur.status !== 'approved') throw new Error('Cette demande ne peut plus être validée.')
        if (cur.status === 'pending' && cur.waSent !== true) throw new Error("Le client n'a pas envoyé le message WhatsApp : validation impossible.")
        const tRef = doc(db, 'ticketTypes', cur.ticketTypeId)
        const eRef = doc(db, 'events', cur.eventId)
        const ts = await tx.get(tRef)
        const es = await tx.get(eRef)
        if (!ts.exists() || !es.exists()) throw new Error('Données introuvables.')
        const t = ts.data() as { quantity: number; sold: number; reserved?: number; persons?: number; zone?: string; validUntil?: string | null; kind?: string }
        const ev = es.data() as { title: string; date: string; venue: string; city: string }
        const held = cur.status === 'approved' ? cur.quantity : 0
        const left = t.quantity - t.sold - (t.reserved ?? 0) + held
        if (cur.quantity > left) throw new Error('Stock insuffisant : ' + Math.max(0, left) + ' place(s) restante(s).')
        const tokens: string[] = []
        for (let i = 1; i <= cur.quantity; i++) {
          const tok = newToken()
          tokens.push(tok)
          tx.set(doc(db, 'tickets', tok), {
            requestId: r.id, eventId: cur.eventId, ticketTypeId: cur.ticketTypeId,
            eventTitle: ev.title, eventDate: ev.date, venue: ev.venue, city: ev.city,
            ticketName: cur.ticketName, holderName: cur.customerName, seq: i, count: cur.quantity, price: cur.unitPrice,
            persons: t.persons ?? 1, zone: t.zone ?? '', validUntil: t.validUntil ?? null, kind: t.kind ?? 'classic',
            status: 'valid', createdAt: serverTimestamp(),
          })
        }
        tx.update(tRef, cur.status === 'approved'
          ? { sold: t.sold + cur.quantity, reserved: Math.max(0, (t.reserved ?? 0) - cur.quantity) }
          : { sold: t.sold + cur.quantity })
        tx.update(rRef, { status: 'paid', paymentStatus: 'confirmed', paymentRef: txRef.trim().slice(0, 60), ticketTokens: tokens, paidAt: serverTimestamp(), paidBy: user.uid })
        
      })
      setStep('view')
      addDoc(collection(db, 'auditLogs'), { requestId: r.id, action: 'paid', note: txRef.trim().slice(0, 60), by: user.uid, at: serverTimestamp() }).catch(() => {})
      setDone('Réservation validée : les billets sont émis. Envoie-lui maintenant ses billets sur WhatsApp.')
      await load()
    } catch (x) {
      setErr(x instanceof Error && !('code' in x) ? x.message : 'Validation refusée par le serveur.')
    }
    setBusy(false)
  }

  async function refuse() {
    if (!user || !r || busy) return
    setBusy(true); setErr('')
    try {
      await updateDoc(doc(db, 'requests', r.id), { status: 'refused', adminNote: note.trim().slice(0, 200), decidedAt: serverTimestamp() })
      addDoc(collection(db, 'auditLogs'), { requestId: r.id, action: 'request_refused', note: note.trim().slice(0, 200), by: user.uid, at: serverTimestamp() }).catch(() => {})
      setStep('view')
      setDone('Demande refusée. Le client en est informé sur sa page de suivi.')
      await load()
    } catch { setErr('Refus impossible (droits ou réseau).') }
    setBusy(false)
  }

  return (
    <div className={bg}>
      <img src={`${base}brand/logo-sombre.svg`} alt="BIJOU" className="w-48" />
      <h1 className="text-xl text-bijou-goldlight">Valider une réservation</h1>
      {(loading || state === 'loading') && <p className="text-bijou-silver">Chargement…</p>}
      {!loading && !user && (
        <>
          <p className="text-sm text-bijou-silver text-center max-w-md">Connecte-toi avec ton compte organisateur pour traiter cette demande.</p>
          <LoginForm />
        </>
      )}
      {user && state === 'missing' && <p className="text-bijou-alert text-center">Demande introuvable. Vérifie le lien.</p>}
      {user && state === 'error' && <p className="text-bijou-alert text-center">Impossible de charger la demande. Réessaie.</p>}
      {user && state === 'ok' && r && !mine && (
        <div className={card}>
          <p className="text-sm text-bijou-silver text-center">Cette demande n'appartient pas à ton compte.</p>
          <button className={btn} onClick={logout}>Se déconnecter</button>
        </div>
      )}
      {user && state === 'ok' && r && mine && (
        <div className={card}>
          <p className="text-sm text-bijou-silver">Référence</p>
          <p className="text-2xl font-semibold text-bijou-goldlight">{refOf(r.id)}</p>
          <p><b>{r.customerName}</b>{r.phone ? ' · ' + r.phone : ''}</p>
          <p>{r.quantity} × {r.ticketName} · {r.total.toLocaleString('fr-FR')} FCFA</p>
          <p className="text-sm text-bijou-silver">Paiement : {PAY_LABEL[r.paymentMethod] ?? r.paymentMethod}</p>
          <p className={'text-sm ' + (r.waSent ? 'text-bijou-ok' : 'text-bijou-alert')}>{r.waSent ? 'Message WhatsApp reçu du client.' : "Le client n'a pas envoyé le message WhatsApp."}</p>
          <p className="font-semibold">Statut : {r.paymentStatus === 'confirmed' ? 'Validée, billets émis' : (STATUS_LABEL[r.status] ?? r.status)}</p>
          {done && <p className="text-bijou-ok text-sm">{done}</p>}
          {err && <p className="text-bijou-alert text-sm">{err}</p>}

          {open && step === 'view' && (
            <>
              <p className="text-sm">Vérifie sur ton téléphone de paiement que <b>{r.total.toLocaleString('fr-FR')} FCFA</b> sont arrivés et que le nom du déposant correspond à <b>{r.customerName}</b>.</p>
              <button className={btnGold} disabled={r.status === 'pending' && !r.waSent} onClick={() => { setErr(''); setStep('confirm') }}>Valider</button>
              <button className={btn} onClick={() => { setErr(''); setStep('refuse') }}>Refuser</button>
            </>
          )}
          {open && step === 'confirm' && (
            <>
              <p className="text-sm text-bijou-goldlight">Confirmation finale : les billets seront émis et visibles par le client. Action irréversible.</p>
              <input className={input} placeholder="Référence de la transaction (facultatif)" value={txRef} onChange={e => setTxRef(e.target.value)} maxLength={60} />
              <button className={btnGold} disabled={busy} onClick={validate}>{busy ? 'Validation…' : 'Confirmer la validation'}</button>
              <button className={btn} disabled={busy} onClick={() => setStep('view')}>Retour</button>
            </>
          )}
          {open && step === 'refuse' && (
            <>
              <input className={input} placeholder="Motif du refus (facultatif)" value={note} onChange={e => setNote(e.target.value)} maxLength={200} />
              <button className={btnGold} disabled={busy} onClick={refuse}>{busy ? 'Envoi…' : 'Confirmer le refus'}</button>
              <button className={btn} disabled={busy} onClick={() => setStep('view')}>Retour</button>
            </>
          )}
          {waClient && <a href={waClient} target="_blank" rel="noreferrer" className={btnGold + ' text-center'}>Envoyer les billets au client sur WhatsApp</a>}
          {r.paymentStatus === 'confirmed' && (r.ticketTokens ?? []).map((t, i) => (
            <Link key={t} to={'/billet/' + t} className={btn}>Voir le billet {i + 1}/{r.ticketTokens!.length}</Link>
          ))}
        </div>
      )}
      <Link to="/organisateur" className={btn}>Retour à mon espace</Link>
    </div>
  )
}
