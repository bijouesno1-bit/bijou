import { AgentLoginForm } from '../components/AgentLoginForm'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDoc, collection, doc, getDocs, query, runTransaction, serverTimestamp, where } from 'firebase/firestore'
import jsQR from 'jsqr'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { LoginForm } from '../components/LoginForm'
import { refOf } from '../lib/requests'
import { ScanGuide } from '../components/ScanGuide'
import { KIND_LABEL, KIND_PLAIN } from '../lib/kinds'

type Tk = { requestId: string; ticketName: string; eventTitle: string; holderName: string; seq: number; count: number; status: string; usedAt?: { toDate: () => Date }; persons?: number; zone?: string; validUntil?: string | null; kind?: string }
type Res = { kind: 'ok' | 'used' | 'bad' | 'unknown' | 'error'; t?: Tk }
type Det = { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> }

const base = import.meta.env.BASE_URL
const bg = 'min-h-screen bg-gradient-to-br from-[#07070C]/60 to-bijou-navy/60 text-bijou-ivory p-5 flex flex-col items-center gap-4'
const btn = 'rounded-xl border border-bijou-gold/60 px-4 py-2 font-medium active:scale-95 transition text-center'
const btnGold = 'rounded-xl bg-bijou-gold text-bijou-ink px-4 py-2 font-semibold active:scale-95 transition'
const input = 'w-full rounded-lg bg-black/40 border border-bijou-silver/40 px-3 py-2 text-bijou-ivory'

function extractToken(raw: string) {
  let s = raw.trim()
  if (s.startsWith('BIJOU:')) s = s.slice(6)
  const i = s.indexOf('/billet/')
  if (i >= 0) s = s.slice(i + 8)
  return s.split(/[?#]/)[0].trim()
}

function Camera({ onCode }: { onCode: (s: string) => void }) {
  const vref = useRef<HTMLVideoElement>(null)
  const cb = useRef(onCode)
  cb.current = onCode
  const [err, setErr] = useState('')

  useEffect(() => {
    let stop = false
    let raf = 0
    let stream: MediaStream | null = null
    const canvas = document.createElement('canvas')
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Det }).BarcodeDetector
    const det = BD ? new BD({ formats: ['qr_code'] }) : null

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        const v = vref.current
        if (!v || stop) { stream.getTracks().forEach(t => t.stop()); return }
        v.srcObject = stream
        await v.play()
        const tick = async () => {
          if (stop) return
          if (v.readyState >= 2 && v.videoWidth) {
            let code = ''
            try {
              if (det) {
                const r = await det.detect(v)
                code = r[0]?.rawValue ?? ''
              } else {
                canvas.width = v.videoWidth
                canvas.height = v.videoHeight
                const c = canvas.getContext('2d', { willReadFrequently: true })
                if (c) {
                  c.drawImage(v, 0, 0)
                  const im = c.getImageData(0, 0, canvas.width, canvas.height)
                  code = jsQR(im.data, im.width, im.height)?.data ?? ''
                }
              }
            } catch { /* ignore */ }
            if (code && !stop) { cb.current(code); return }
          }
          raf = requestAnimationFrame(tick)
        }
        tick()
      } catch {
        setErr("Caméra indisponible : autorise l'accès à la caméra, ou utilise la saisie manuelle.")
      }
    }
    start()
    return () => { stop = true; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()) }
  }, [])

  return err
    ? <p className="text-bijou-alert text-sm text-center max-w-md">{err}</p>
    : <video ref={vref} playsInline muted className="w-full max-w-md rounded-xl border border-bijou-gold/40" />
}

export default function Scan() {
  const { user, profile, isStaff, loading, logout } = useAuth()
  const [res, setRes] = useState<Res | null>(null)
  const [busy, setBusy] = useState(false)
  const [manual, setManual] = useState('')
  const [gates, setGates] = useState<{ id: string; name: string }[]>([])
  const [gate, setGate] = useState(() => { try { return localStorage.getItem('bijou_gate') ?? '' } catch { return '' } })
  const gateName = gates.find(g => g.id === gate)?.name ?? ''
  const myGateIds = profile?.gateIds ?? []
  const isTeamAgent = profile?.role === 'agent' && myGateIds.length > 0
  useEffect(() => {
    if (!user || !isStaff || !isTeamAgent || !profile?.eventId) return
    let off = false
    getDocs(query(collection(db, 'gates'), where('eventId', '==', profile.eventId)))
      .then(snap => {
        if (off) return
        const list = snap.docs.map(d => ({ id: d.id, name: String(d.data().name ?? '') })).filter(g => myGateIds.includes(g.id))
        setGates(list)
        setGate(g => (list.some(x => x.id === g) ? g : (list[0]?.id ?? '')))
      })
      .catch(() => {})
    return () => { off = true }
  }, [user, isStaff, isTeamAgent, profile?.eventId])

  useEffect(() => {
    if (!user || !isStaff || (profile?.role === 'agent' && (profile?.gateIds?.length ?? 0) > 0)) return
    getDocs(query(collection(db, 'checkpoints'), where('active', '==', true)))
      .then(s => setGates(
        s.docs
          .map(d => ({ id: d.id, name: String((d.data() as { name?: string }).name ?? '') }))
          .filter(g => g.name)
          .sort((a, b) => a.name.localeCompare(b.name))
      ))
      .catch(() => { /* ignoré : les scans restent possibles sans porte */ })
  }, [user, isStaff])

  function meta(t: unknown) {
    const x = t as { eventId?: string; ticketTypeId?: string; ticketName?: string; kind?: string }
    return {
      ...(x.eventId ? { eventId: x.eventId } : {}),
      ...(x.ticketTypeId ? { ticketTypeId: x.ticketTypeId } : {}),
      ...(x.ticketName ? { ticketName: x.ticketName } : {}),
      free: x.kind === 'invitation',
    }
  }

  async function check(raw: string) {
    const token = extractToken(raw)
    if (!user || busy) return
    if (!token || token.length > 200 || token.includes('/')) { setRes({ kind: 'unknown' }); return }
    if (!navigator.onLine) { setRes({ kind: 'error' }); return }
    setBusy(true)
    try {
      const ref = doc(db, 'tickets', token)
      const r = await runTransaction(db, async (tx): Promise<Res> => {
        const s = await tx.get(ref)
        if (!s.exists()) return { kind: 'unknown' }
        const t = s.data() as Tk
        if (t.status === 'used') return { kind: 'used', t }
        if (t.status !== 'valid') return { kind: 'bad', t }
        if (t.validUntil && new Date(t.validUntil).getTime() < Date.now()) return { kind: 'bad', t: { ...t, status: 'expired' } }
        tx.update(ref, { status: 'used', usedAt: serverTimestamp(), usedBy: user.uid })
        tx.set(doc(collection(db, 'scans')), { ticketId: token, result: 'ok', ...meta(t), by: user.uid, at: serverTimestamp(), ...(gateName ? { checkpoint: gateName, checkpointId: gate } : {}) })
        return { kind: 'ok', t }
      })
      setRes(r)
      try { navigator.vibrate?.(r.kind === 'ok' ? 120 : [300, 100, 300]) } catch { /* ignoré */ }
      if (r.kind !== 'ok') addDoc(collection(db, 'scans'), { ticketId: token, result: r.kind, ...('t' in r ? meta(r.t) : {}), by: user.uid, at: serverTimestamp(), ...(gateName ? { checkpoint: gateName, checkpointId: gate } : {}) }).catch(() => {})
    } catch {
      setRes({ kind: 'error' })
    }
    setBusy(false)
  }

  if (loading) return <div className={bg}>Chargement…</div>
  if (!user) return (
    <div className={bg}>
      <img src={`${base}brand/logo-sombre.svg`} alt="BIJOU" className="w-48" />
      <h1 className="text-xl text-bijou-goldlight">BIJOU Scan</h1>
      <AgentLoginForm />
      <details className="w-full max-w-md text-sm text-bijou-silver">
        <summary className="cursor-pointer text-center">Connexion administrateur</summary>
        <LoginForm />
      </details>
      <Link to="/" className={btn}>Retour à l'accueil</Link>
    </div>
  )
  if (!isStaff) return (
    <div className={bg}>
      <h1 className="text-xl text-bijou-goldlight">Accès non autorisé</h1>
      <p className="text-sm text-bijou-silver text-center max-w-md">Ce compte n'est ni administrateur ni agent de contrôle.</p>
      <button className={btn} onClick={logout}>Se déconnecter</button>
    </div>
  )

  if (res) {
    const t = res.t
    const style = res.kind === 'ok' ? 'bg-green-600' : res.kind === 'error' ? 'bg-orange-500' : res.kind === 'used' ? 'bg-red-800' : 'bg-bijou-alert'
    const title = { ok: 'VALIDE', used: 'DÉJÀ UTILISÉ', bad: 'BILLET REFUSÉ', unknown: 'BILLET INCONNU', error: 'VÉRIFICATION NÉCESSAIRE' }[res.kind]
    return (
      <div className={`min-h-screen ${style} text-white p-6 flex flex-col items-center justify-center gap-4 text-center`}>
        <p className="text-4xl font-bold">{title}</p>
        {t && <>
          <p className="text-3xl font-bold">{t.holderName}</p>
          <p>{t.eventTitle} · {t.ticketName}</p>
          {(t.persons ?? 1) > 1 && <p className="text-2xl font-bold">{t.persons} personnes autorisées</p>}
          {t.kind && !KIND_PLAIN.includes(t.kind) && <p className="text-lg font-bold uppercase tracking-widest">{KIND_LABEL[t.kind] ?? t.kind}</p>}
          {t.zone && <p>{t.zone}</p>}
          {res.kind === 'bad' && <p>{t.status === 'expired' ? 'Billet expiré' : t.status === 'revoked' ? 'Billet révoqué' : 'Billet annulé ou non valide'}</p>}
          <p className="font-mono text-2xl font-bold">{refOf(t.requestId)}-{t.seq} ({t.seq}/{t.count})</p>
          {res.kind === 'ok' && <p className="text-sm opacity-90 max-w-xs">Compare le nom et la référence avec le billet. À l'écran : bandeau doré animé. Sur papier : logo BIJOU en filigrane.</p>}
          {res.kind === 'used' && t.usedAt && <p className="text-lg font-semibold">Déjà entré le {t.usedAt.toDate().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</p>}
        </>}
        {res.kind === 'error' && <>
          <p className="text-xl">Le serveur n'a pas répondu : ce billet n'est ni validé ni refusé.</p>
          <p>Ne fais pas entrer sans vérification. Contrôle la connexion et ton rôle, puis scanne à nouveau.</p>
        </>}
        {res.kind !== 'ok' && <ScanGuide />}
        <button className="rounded-xl bg-white text-black px-6 py-3 font-semibold" onClick={() => { setRes(null); setManual('') }}>Scanner le suivant</button>
      </div>
    )
  }

  return (
    <div className={bg}>
      <h1 className="text-xl text-bijou-goldlight">BIJOU Scan</h1>
      {gates.length > 0 && (
        <select className={input + ' max-w-md'} value={gate} onChange={e => { setGate(e.target.value); try { localStorage.setItem('bijou_gate', e.target.value) } catch { /* ignoré */ } }}>
          <option value="">Choisir ma porte…</option>
          {gates.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      )}
      {gates.length > 0 && !gateName && <p className="text-sm text-bijou-goldlight">Choisis ta porte : sans elle, tes scans ne sont rattachés à aucun point de contrôle.</p>}
      <Camera onCode={check} />
      <form className="w-full max-w-md flex gap-2" onSubmit={e => { e.preventDefault(); check(manual) }}>
        <input className={input} placeholder="Code ou lien du billet" value={manual} onChange={e => setManual(e.target.value)} />
        <button className={btnGold} disabled={busy}>OK</button>
      </form>
      <ScanGuide />
      <button className={btn} onClick={logout}>Se déconnecter</button>
      <Link to="/" className={btn}>Retour à l'accueil</Link>
    </div>
  )
}
