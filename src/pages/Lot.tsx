import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import * as QRCode from 'qrcode'
import { db } from '../lib/firebase'
import { refOf } from '../lib/requests'

type Fmt = 'a4' | 'a5' | 'a6' | 't80'
const PAGE: Record<Fmt, string> = { a4: 'A4', a5: 'A5', a6: 'A6', t80: '80mm 130mm' }
const LABEL: Record<Fmt, string> = { a4: 'A4 (grille)', a5: 'A5', a6: 'A6', t80: 'Ticket 80 mm' }
type Card = { tok: string; requestId: string; ticketName: string; eventTitle: string; eventDate: string; venue: string; city: string; holderName: string; seq: number; count: number; persons?: number; zone?: string; qr: string }

function fmtDate(d: string) {
  if (!d) return ''
  const x = new Date(d)
  return x.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' à ' + x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const CSS = `
.lot-root{background:#fff;color:#111;min-height:100vh;padding:12px;font-family:sans-serif}
.lot-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center}
.lot-bar select,.lot-bar button,.lot-bar a{padding:8px 12px;border:1px solid #888;border-radius:8px;background:#fff;color:#111;font-size:15px;text-decoration:none}
.sheet.a4{display:grid;grid-template-columns:1fr 1fr;gap:6mm}
.lot-card{border:1.5px solid #111;border-radius:3mm;padding:4mm;text-align:center;break-inside:avoid;page-break-inside:avoid;display:flex;flex-direction:column;align-items:center;gap:1.5mm}
.lot-card h2{font-size:14pt;margin:0}
.lot-card p{margin:0;font-size:10pt}
.lot-card .tn{background:#111;color:#f3d98b;border-radius:99px;padding:1mm 4mm;font-weight:700}
.lot-card img.qr{width:42mm;height:42mm}
.a5 .lot-card,.a6 .lot-card,.t80 .lot-card{break-after:page;page-break-after:always;border:none}
.a5 .lot-card:last-child,.a6 .lot-card:last-child,.t80 .lot-card:last-child{break-after:auto;page-break-after:auto}
.a5 img.qr{width:80mm;height:80mm}
.a6 img.qr{width:60mm;height:60mm}
.t80 img.qr{width:58mm;height:58mm}
.t80 .lot-card{width:74mm}
@media print{.noprint{display:none!important}.lot-root{padding:0}}
`

export default function Lot() {
  const { id } = useParams()
  const [fmt, setFmt] = useState<Fmt>('a4')
  const [auth, setAuth] = useState<'wait' | 'in' | 'out'>('wait')
  const [cards, setCards] = useState<Card[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'empty' | 'error'>('loading')

  useEffect(() => onAuthStateChanged(getAuth(), u => setAuth(u ? 'in' : 'out')), [])

  useEffect(() => {
    if (auth !== 'in') return
    ;(async () => {
      try {
        const b = await getDoc(doc(db, 'batches', id ?? '_'))
        if (!b.exists()) { setState('empty'); return }
        const arr = Object.values(b.data()).find(v => Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') as string[] | undefined
        if (!arr) { setState('empty'); return }
        const out: Card[] = []
        for (const tok of arr) {
          const s = await getDoc(doc(db, 'tickets', tok))
          if (!s.exists()) continue
          const d = s.data() as Omit<Card, 'tok' | 'qr'>
          out.push({ ...d, tok, qr: await QRCode.toDataURL('BIJOU:' + tok, { width: 360, margin: 1, errorCorrectionLevel: 'M' }) })
        }
        setCards(out)
        setState(out.length ? 'ok' : 'empty')
      } catch { setState('error') }
    })()
  }, [auth, id])

  return (
    <div className="lot-root">
      <style>{CSS + '@page{size:' + PAGE[fmt] + ';margin:' + (fmt === 't80' ? '2mm' : '8mm') + '}'}</style>
      <div className="lot-bar noprint">
        <select value={fmt} onChange={e => setFmt(e.target.value as Fmt)}>
          {(Object.keys(LABEL) as Fmt[]).map(k => <option key={k} value={k}>{LABEL[k]}</option>)}
        </select>
        <button onClick={() => window.print()} disabled={state !== 'ok'}>Imprimer / PDF</button>
        <Link to="/admin">Retour admin</Link>
      </div>
      {auth === 'out' && <p className="noprint">Connecte-toi d'abord à l'espace organisateur, puis rouvre cette page.</p>}
      {auth === 'in' && state === 'loading' && <p className="noprint">Chargement…</p>}
      {state === 'empty' && <p className="noprint">Lot introuvable ou vide.</p>}
      {state === 'error' && <p className="noprint">Erreur de chargement du lot.</p>}
      <div className={'sheet ' + fmt}>
        {cards.map(c => (
          <div className="lot-card" key={c.tok}>
            <h2>{c.eventTitle}</h2>
            <p>{fmtDate(c.eventDate)}</p>
            <p>{c.venue}, {c.city}</p>
            <p className="tn">{c.ticketName}</p>
            <p><i>Invitation : entrée gratuite</i></p>
            <img className="qr" src={c.qr} alt="QR code du billet" />
            <p style={{ fontFamily: 'monospace' }}>{refOf(c.requestId)}-{c.seq}</p>
            <p>{c.holderName} · billet {c.seq}/{c.count}</p>
            {((c.persons ?? 1) > 1 || c.zone) && <p>{[(c.persons ?? 1) > 1 && 'Valable pour ' + c.persons + ' personnes', c.zone].filter(Boolean).join(' · ')}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
