import { useState, type FormEvent } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { agentKey } from '../lib/agentAuth'
import { PasswordInput } from './PasswordInput'

const MAP = 'bijou_agent_map'
const readMap = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(MAP) ?? '{}') } catch { return {} } }
const writeMap = (k: string, v: string) => { try { localStorage.setItem(MAP, JSON.stringify({ ...readMap(), [k]: v })) } catch { /* ignoré */ } }

// Connexion agent : téléphone ou e-mail dans le 1er cadre, mot de passe dans le 2e.
export function AgentLoginForm() {
  const { login } = useAuth()
  const [id, setId] = useState('')
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function resolve(raw: string): Promise<string> {
    const key = agentKey(raw)
    try {
      const s = await getDoc(doc(db, 'agentLogins', key))
      if (s.exists()) {
        const e = String((s.data() as { authEmail?: string }).authEmail ?? '')
        if (e) { writeMap(key, e); return e }
      }
    } catch {
      const c = readMap()[key]
      if (c) return c
    }
    return raw.includes('@') ? raw.trim().toLowerCase() : ''
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const email = await resolve(id)
      if (!email) {
        setErr('Identifiant introuvable. Vérifiez votre numéro ou votre e-mail, ou contactez votre organisateur.')
        setBusy(false)
        return
      }
      await login(email, pwd)
    } catch (x) {
      const c = (x as { code?: string }).code ?? ''
      setErr(c.includes('network') ? 'Problème de connexion internet.' : 'Identifiant ou mot de passe incorrect.')
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md rounded-xl border border-bijou-gold/40 bg-white/5 p-4 flex flex-col gap-3">
      <p className="text-sm text-bijou-silver text-center">Espace agent de contrôle</p>
      <input
        className="w-full rounded-lg bg-black/40 border border-bijou-silver/40 px-3 py-2 text-bijou-ivory"
        type="text" placeholder="Téléphone ou e-mail" autoComplete="username"
        value={id} onChange={e => setId(e.target.value)} required
      />
      <PasswordInput value={pwd} onChange={setPwd} />
      {err && <p className="text-bijou-alert text-sm">{err}</p>}
      <button className="rounded-xl bg-bijou-gold text-bijou-ink px-4 py-2 font-semibold active:scale-95 transition" disabled={busy}>
        {busy ? 'Connexion…' : 'Se connecter'}
      </button>
      <p className="text-xs text-bijou-silver text-center">Mot de passe oublié ? Contactez votre organisateur.</p>
    </form>
  )
}
