import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { PasswordInput } from './PasswordInput'

export function LoginForm() {
  const { login, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(''); setInfo(''); setBusy(true)
    try {
      await login(email.trim(), pwd)
    } catch (x) {
      const c = (x as { code?: string }).code ?? ''
      setErr(c.includes('configuration-not-found') || c.includes('operation-not-allowed')
        ? 'Connexion e-mail/mot de passe non activée dans Firebase.'
        : c.includes('network')
          ? 'Problème de connexion internet.'
          : 'E-mail ou mot de passe incorrect.')
    }
    setBusy(false)
  }

  async function forgot() {
    setErr(''); setInfo('')
    if (!email.trim()) { setErr("Saisis d'abord ton e-mail ci-dessus."); return }
    try {
      await resetPassword(email.trim())
      setInfo('Si un compte existe pour cet e-mail, un lien de réinitialisation vient d\u2019être envoyé. Pense à vérifier les courriers indésirables.')
    } catch (x) {
      const c = (x as { code?: string }).code ?? ''
      if (c.includes('network')) setErr('Problème de connexion internet.')
      else setInfo('Si un compte existe pour cet e-mail, un lien de réinitialisation vient d\u2019être envoyé. Pense à vérifier les courriers indésirables.')
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md rounded-xl border border-bijou-gold/40 bg-white/5 p-4 flex flex-col gap-3">
      <input
        className="w-full rounded-lg bg-black/40 border border-bijou-silver/40 px-3 py-2 text-bijou-ivory"
        type="email" placeholder="E-mail" autoComplete="username"
        value={email} onChange={e => setEmail(e.target.value)} required
      />
      <PasswordInput value={pwd} onChange={setPwd} />
      {err && <p className="text-bijou-alert text-sm">{err}</p>}
      {info && <p className="text-bijou-ok text-sm">{info}</p>}
      <button className="rounded-xl bg-bijou-gold text-bijou-ink px-4 py-2 font-semibold active:scale-95 transition" disabled={busy}>
        {busy ? 'Connexion…' : 'Se connecter'}
      </button>
      <button type="button" onClick={forgot} className="text-sm text-bijou-goldlight underline self-center">
        Mot de passe oublié ?
      </button>
    </form>
  )
}
