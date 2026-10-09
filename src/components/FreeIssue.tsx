import { useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { newToken } from '../lib/token'

type Props = { tt: { id: string; eventId: string; name: string }; onDone: () => void }
type Mode = 'unit' | 'group' | 'lot'

const input = 'w-full rounded-lg bg-black/40 border border-bijou-silver/40 px-3 py-2 text-bijou-ivory'
const btn = 'rounded-xl border border-bijou-gold/60 px-3 py-2 text-sm font-medium active:scale-95 transition text-center'
const btnGold = 'rounded-xl bg-bijou-gold text-bijou-ink px-3 py-2 text-sm font-semibold active:scale-95 transition'

const linkOf = (tok: string) => `${window.location.origin}${window.location.pathname}#/billet/${tok}`
const waOf = (tok: string) => 'https://wa.me/?text=' + encodeURIComponent('Votre billet BIJOU : ' + linkOf(tok))

export function FreeIssue({ tt, onDone }: Props) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('unit')
  const [holder, setHolder] = useState('')
  const [qty, setQty] = useState('10')
  const [persons, setPersons] = useState('2')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [tokens, setTokens] = useState<string[]>([])
  const [batchId, setBatchId] = useState('')

  async function issue() {
    const count = mode === 'lot' ? Math.min(50, Math.max(1, Math.floor(Number(qty) || 1))) : 1
    const per = mode === 'group' ? Math.min(50, Math.max(2, Math.floor(Number(persons) || 2))) : 1
    const name = holder.trim().slice(0, 80) || 'Invité'
    if (!window.confirm(`Émettre ${count} billet(s) gratuit(s) « ${tt.name} » ?`)) return
    setBusy(true)
    setErr('')
    setTokens([])
    try {
      const bRef = doc(collection(db, 'batches'))
      setBatchId(bRef.id)
      const toks: string[] = []
      await runTransaction(db, async tx => {
        const tRef = doc(db, 'ticketTypes', tt.id)
        const eRef = doc(db, 'events', tt.eventId)
        const ts = await tx.get(tRef)
        const es = await tx.get(eRef)
        if (!ts.exists() || !es.exists()) throw new Error('Données introuvables.')
        const t = ts.data() as { name: string; quantity: number; sold: number; reserved?: number; zone?: string; validUntil?: string | null }
        const ev = es.data() as { title: string; date: string; venue: string; city: string }
        const left = t.quantity - t.sold - (t.reserved ?? 0)
        if (count > left) throw new Error(`Stock insuffisant : ${Math.max(0, left)} place(s) libre(s).`)
        toks.length = 0
        for (let i = 1; i <= count; i++) {
          const tok = newToken()
          toks.push(tok)
          tx.set(doc(db, 'tickets', tok), {
            requestId: bRef.id, eventId: tt.eventId, ticketTypeId: tt.id,
            eventTitle: ev.title, eventDate: ev.date, venue: ev.venue, city: ev.city,
            ticketName: t.name, holderName: name, seq: i, count, price: 0,
            persons: per, zone: t.zone ?? '', validUntil: t.validUntil ?? null, kind: 'invitation',
            status: 'valid', createdAt: serverTimestamp(),
          })
        }
        tx.update(tRef, { sold: t.sold + count })
        tx.set(bRef, { eventId: tt.eventId, ticketTypeId: tt.id, ticketName: t.name, holderName: name, mode, count, persons: per, tokens: toks, createdAt: serverTimestamp(), createdBy: user?.uid ?? '' })
        tx.set(doc(collection(db, 'auditLogs')), { requestId: bRef.id, action: 'free_issue', note: `${mode} x${count}`, by: user?.uid ?? '', at: serverTimestamp() })
      })
      setTokens([...toks])
      onDone()
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Émission impossible.')
    }
    setBusy(false)
  }

  if (!open) return <button className={btn + ' ml-3 mt-1'} onClick={() => setOpen(true)}>Émettre des billets gratuits</button>
  return (
    <div className="ml-3 mt-1 rounded-lg border border-bijou-gold/40 p-3 flex flex-col gap-2">
      <select className={input} value={mode} onChange={e => setMode(e.target.value as Mode)}>
        <option value="unit">À l'unité (1 billet)</option>
        <option value="group">Groupe (1 billet, plusieurs personnes)</option>
        <option value="lot">Lot (plusieurs billets d'un coup)</option>
      </select>
      <input className={input} placeholder="Bénéficiaire ou groupe (facultatif)" value={holder} onChange={e => setHolder(e.target.value)} maxLength={80} />
      {mode === 'group' && <input className={input} type="number" min="2" max="50" placeholder="Personnes par billet" value={persons} onChange={e => setPersons(e.target.value)} />}
      {mode === 'lot' && <input className={input} type="number" min="1" max="50" placeholder="Nombre de billets (max 50)" value={qty} onChange={e => setQty(e.target.value)} />}
      {err && <p className="text-bijou-alert text-sm">{err}</p>}
      <button className={btnGold} disabled={busy} onClick={issue}>{busy ? 'Émission…' : 'Émettre'}</button>
      {tokens.length > 0 && (
        <div className="flex flex-col gap-1 text-sm">
          <p className="text-bijou-ok font-semibold">{tokens.length} billet(s) émis</p>
          <Link to={"/lot/" + batchId} className={btn}>Imprimer le lot</Link>
          {tokens.map((tok, i) => (
            <p key={tok} className="flex gap-3">
              <Link to={`/billet/${tok}`} className="underline text-bijou-goldlight">Billet {i + 1}</Link>
              <a href={waOf(tok)} target="_blank" rel="noreferrer" className="underline text-bijou-goldlight">WhatsApp</a>
            </p>
          ))}
          <button className={btn} onClick={() => { navigator.clipboard?.writeText(tokens.map(linkOf).join('\n')).then(() => window.alert('Liens copiés.')).catch(() => {}) }}>Copier tous les liens</button>
        </div>
      )}
      <button className={btn} onClick={() => setOpen(false)}>Fermer</button>
    </div>
  )
}
