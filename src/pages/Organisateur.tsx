import { OrgTeam } from '../components/OrgTeam'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { MyAnnonces } from '../components/MyAnnonces'
import { Link } from 'react-router-dom'
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { bg, card, btn, btnGold, input } from '../lib/ui'
import { PosterInput } from '../components/PosterInput'

const base = import.meta.env.BASE_URL
const CATS = [
  { key: 'particulier', label: 'Particulier', hint: 'Gratuit' },
  { key: 'etablissement', label: 'Établissement', hint: '10 000 F CFA par annonce' },
  { key: 'entreprise', label: 'Entreprise', hint: '10 000 F CFA par annonce' },
]
const STATUS: Record<string, string> = { pending: 'En attente de validation', published: 'Publié', refused: 'Refusé', draft: 'Brouillon' }
type Mine = { id: string; title: string; status: string; refusalReason?: string; createdAt?: { seconds: number } }

function SignUp() {
  const { signUp, login } = useAuth()
  const [mode, setMode] = useState<'new' | 'login'>('new')
  const [cat, setCat] = useState('particulier')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      if (mode === 'login') await login(email.trim(), pwd)
      else await signUp(email, pwd, name, cat, phone)
    } catch (x) {
      const c = (x as { code?: string }).code ?? ''
      setErr(c === 'auth/email-already-in-use' ? 'Cet e-mail a déjà un compte : choisissez « J\'ai déjà un compte ».'
        : c === 'auth/weak-password' ? 'Mot de passe trop court (6 caractères minimum).'
        : c.startsWith('auth/invalid') || c === 'auth/wrong-password' ? 'E-mail ou mot de passe incorrect.'
        : 'Opération refusée.')
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className={card}>
      <div className="flex gap-2">
        <button type="button" className={mode === 'new' ? btnGold : btn} onClick={() => setMode('new')}>Devenir organisateur</button>
        <button type="button" className={mode === 'login' ? btnGold : btn} onClick={() => setMode('login')}>J'ai déjà un compte</button>
      </div>
      {mode === 'new' && (
        <>
          <div className="flex flex-col gap-2">
            {CATS.map(c => (
              <label key={c.key} className={'flex items-center justify-between rounded-xl border px-3 py-2 text-sm ' + (cat === c.key ? 'border-bijou-gold' : 'border-bijou-silver/40')}>
                <span><input type="radio" name="cat" checked={cat === c.key} onChange={() => setCat(c.key)} className="mr-2" />{c.label}</span>
                <span className="text-xs text-bijou-goldlight">{c.hint}</span>
              </label>
            ))}
          </div>
          <input className={input} placeholder={cat === 'particulier' ? 'Votre nom' : 'Nom du responsable'} value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={80} />
          <input className={input} type="tel" placeholder="Téléphone WhatsApp (ex. 241 60 14 19 24)" value={phone} onChange={e => setPhone(e.target.value)} required maxLength={20} />
        </>
      )}
      <input className={input} type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
      <input className={input} type="password" placeholder="Mot de passe (6 caractères min.)" value={pwd} onChange={e => setPwd(e.target.value)} required minLength={6} />
      {err && <p className="text-bijou-alert text-sm">{err}</p>}
      <button className={btnGold} disabled={busy}>{busy ? 'Patientez…' : mode === 'new' ? 'Créer mon compte' : 'Se connecter'}</button>
    </form>
  )
}

function Dashboard() {
  const { user, profile, logout } = useAuth()
  const cat = profile?.category ?? 'particulier'
  const pro = cat !== 'particulier'
  const catLabel = CATS.find(c => c.key === cat)?.label ?? cat
  const phone0 = (profile as { phone?: string } | null)?.phone ?? ''
  const [f, setF] = useState({ title: '', date: '', venue: '', city: '', description: '', biz: '', cEmail: '', lat: '', lng: '', cap: '' })
  const [cPhone, setCPhone] = useState(phone0)
  const [poster, setPoster] = useState('')
  const [logo, setLogo] = useState('')
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<{ msg: string } | null>(null)
  const [mine, setMine] = useState<Mine[]>([])
  const [wa, setWa] = useState('24160141924')
  const [airtel, setAirtel] = useState('24174450924')
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(p => ({ ...p, [k]: e.target.value }))

  const load = useCallback(async () => {
    if (!user) return
    try {
      const s = await getDocs(query(collection(db, 'events'), where('ownerId', '==', user.uid)))
      const l = s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Mine, 'id'>) }))
      l.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      setMine(l)
    } catch { /* ignore */ }
  }, [user])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    getDoc(doc(db, 'settings', 'payment')).then(s => {
      const d = s.data()
      if (d?.organizerWa) setWa(String(d.organizerWa).replace(/\D/g, ''))
      if (d?.airtel) setAirtel(String(d.airtel))
    }).catch(() => { /* ignore */ })
  }, [])

  function gps() {
    navigator.geolocation?.getCurrentPosition(
      p => setF(x => ({ ...x, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })),
      () => setErr('Position refusée : saisissez latitude et longitude à la main.'),
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr('')
    if (!user) return
    const lat = Number(f.lat), lng = Number(f.lng)
    if (pro) {
      if (!f.biz.trim()) return setErr('Indiquez le nom commercial.')
      if (!logo) return setErr('Ajoutez votre logo.')
      if (!f.lat || !f.lng || !isFinite(lat) || !isFinite(lng)) return setErr('Ajoutez la position GPS.')
      if (!(Number(f.cap) > 0)) return setErr('Indiquez le nombre de places.')
    }
    const d: Record<string, unknown> = {
      title: f.title.trim(), date: f.date, venue: f.venue.trim(), city: f.city.trim(),
      description: f.description.trim().slice(0, 1000), status: 'pending', ownerId: user.uid,
      ownerName: profile?.name ?? '', category: cat, contactPhone: cPhone.trim(), createdAt: serverTimestamp(),
    }
    if (poster) d.poster = poster
    const photos = [p1, p2].filter(Boolean)
    if (photos.length) d.photos = photos
    if (f.cEmail.trim()) d.contactEmail = f.cEmail.trim()
    if (pro) {
      d.businessName = f.biz.trim(); d.logo = logo; d.lat = lat; d.lng = lng
      d.maxCapacity = Math.floor(Number(f.cap))
    }
    setBusy(true)
    try {
      await addDoc(collection(db, 'events'), d)
      const when = new Date(f.date).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
      const msg = [
        `Bonjour BIJOU, nouvelle demande d'annonce (${catLabel}).`,
        `Événement : ${f.title.trim()}`,
        `Date : ${when}`,
        `Lieu : ${f.venue.trim()}, ${f.city.trim()}`,
        `Organisateur : ${profile?.name ?? ''}${pro ? ' / ' + f.biz.trim() : ''}`,
        `Contact : ${cPhone.trim()}`,
        pro ? `Tarif : 10 000 F CFA (Airtel Money ${airtel})` : 'Annonce gratuite (particulier).',
        `Voir la demande : ${window.location.origin}${base}admin?t=annonces`,
      ].join('\n')
      setSent({ msg })
      setF(p => ({ ...p, title: '', date: '', venue: '', city: '', description: '', biz: '', cEmail: '', lat: '', lng: '', cap: '' }))
      setPoster(''); setLogo(''); setP1(''); setP2('')
      load()
    } catch { setErr('Envoi refusé : vérifiez les champs et votre connexion.') }
    finally { setBusy(false) }
  }

  return (
    <>
      <div className={card}>
        <p className="text-sm text-bijou-silver text-center break-all">{profile?.name} · {catLabel}<br />{user?.email}</p>
        <button className={btn} onClick={logout}>Se déconnecter</button>
      </div>

      {sent && (
        <div className={card}>
          <p className="text-sm text-bijou-ok">{pro ? 'Demande enregistrée. Elle sera publiée après validation. Envoyez-nous le message pour accélérer le traitement :' : 'Annonce publiée ! Vous pouvez nous envoyer le message pour nous prévenir :'}</p>
          <a className={btnGold} target="_blank" rel="noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent(sent.msg)}`}>Prévenir BIJOU sur WhatsApp</a>
        </div>
      )}

      <form onSubmit={submit} className={card}>
        <h2 className="text-bijou-goldlight">Nouvelle annonce</h2>
        <p className="text-xs text-bijou-silver">{pro ? 'Tarif : 10 000 F CFA par annonce, payable par Airtel Money au ' + airtel + '. Publication après validation.' : 'Annonce gratuite. Publiée immédiatement.'}</p>
        {pro && <input className={input} placeholder="Nom commercial" value={f.biz} onChange={set('biz')} maxLength={80} />}
        {pro && <PosterInput url={logo} onChange={setLogo} label="Logo" compact />}
        <input className={input} placeholder="Titre de l'événement" value={f.title} onChange={set('title')} required minLength={2} maxLength={120} />
        <input className={input} type="datetime-local" value={f.date} onChange={set('date')} required />
        <input className={input} placeholder="Lieu" value={f.venue} onChange={set('venue')} required />
        <input className={input} placeholder="Ville" value={f.city} onChange={set('city')} required />
        <textarea className={input} placeholder="Description" rows={3} maxLength={1000} value={f.description} onChange={set('description')} />
        <input className={input} type="tel" placeholder="Téléphone de contact (WhatsApp)" value={cPhone} onChange={e => setCPhone(e.target.value)} required maxLength={20} />
        <input className={input} type="email" placeholder="E-mail de contact (facultatif)" value={f.cEmail} onChange={set('cEmail')} />
        {pro && (
          <>
            <div className="flex gap-2">
              <input className={input} inputMode="decimal" placeholder="Latitude" value={f.lat} onChange={set('lat')} />
              <input className={input} inputMode="decimal" placeholder="Longitude" value={f.lng} onChange={set('lng')} />
            </div>
            <button type="button" className={btn} onClick={gps}>Utiliser ma position actuelle</button>
            <input className={input} type="number" min="1" placeholder="Nombre de places" value={f.cap} onChange={set('cap')} />
          </>
        )}
        <PosterInput url={poster} onChange={setPoster} label="Affiche principale (facultatif)" />
        <PosterInput url={p1} onChange={setP1} label="Photo 2 (facultatif)" compact />
        <PosterInput url={p2} onChange={setP2} label="Photo 3 (facultatif)" compact />
        {err && <p className="text-bijou-alert text-sm">{err}</p>}
        <button className={btnGold} disabled={busy}>{busy ? 'Envoi…' : 'Envoyer pour validation'}</button>
      </form>

      {mine.length > 0 && <MyAnnonces labels={STATUS} />}
      <OrgTeam />
    </>
  )
}

export default function Organisateur() {
  const { user, isAdmin, isStaff, isOrganizer, loading, logout } = useAuth()
  let body
  if (loading) body = <p className="text-bijou-silver">Chargement…</p>
  else if (!user) body = <SignUp />
  else if (isOrganizer) body = <Dashboard />
  else if (isAdmin) body = <div className={card}><p className="text-sm text-bijou-silver">Vous êtes administrateur.</p><Link to="/admin?t=annonces" className={btnGold}>Voir les demandes d'annonces</Link></div>
  else body = <div className={card}><p className="text-sm text-bijou-silver">Ce compte {isStaff ? 'est un compte agent' : 'n\'est pas un compte organisateur'}. Déconnectez-vous pour en créer un avec un autre e-mail.</p><button className={btn} onClick={logout}>Se déconnecter</button></div>
  return (
    <div className={bg}>
      <img src={`${base}brand/logo-sombre.svg`} alt="BIJOU" className="w-48" />
      <h1 className="text-xl text-bijou-goldlight">Publier mon événement</h1>
      {body}
      <Link to="/" className={btn}>Retour à l'accueil</Link>
    </div>
  )
}
