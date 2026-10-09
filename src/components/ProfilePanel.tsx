import { useRef, useState, type ChangeEvent } from 'react'
import { useAuth } from '../lib/auth'
import { uploadProfile } from '../lib/cloudinary'
import { Avatar } from './Avatar'

const btn = 'w-full text-center rounded-xl border border-bijou-gold/60 px-3 py-2 text-sm font-medium active:scale-95 transition'

export function ProfilePanel() {
  const { profile, setPhoto } = useAuth()
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const url = profile?.photoUrl ?? ''

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErr('')
    setBusy(true)
    try {
      await setPhoto(await uploadProfile(file))
    } catch (x) {
      setErr(x instanceof Error && x.message ? x.message : 'Envoi impossible. Réessaie.')
    }
    setBusy(false)
  }

  async function remove() {
    setErr('')
    setBusy(true)
    try { await setPhoto('') } catch { setErr('Suppression impossible. Réessaie.') }
    setBusy(false)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {url
        ? <Avatar url={url} size={72} />
        : <div className="h-[72px] w-[72px] rounded-full border-2 border-dashed border-bijou-silver/50 flex items-center justify-center text-[11px] text-bijou-silver text-center leading-tight">Photo ou logo</div>}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />
      <button className={btn} disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? 'Envoi…' : url ? 'Changer la photo / logo' : 'Ajouter une photo / logo'}
      </button>
      {url && !busy && <button className="text-xs text-bijou-silver underline" onClick={remove}>Retirer</button>}
      {err && <p className="text-xs text-bijou-alert text-center">{err}</p>}
    </div>
  )
}
