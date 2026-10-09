import { useRef, useState, type ChangeEvent } from 'react'
import { posterUrl, uploadPoster } from '../lib/cloudinary'

const btn = 'w-full text-center rounded-xl border border-bijou-gold/60 px-3 py-2 text-sm font-medium active:scale-95 transition'

export function PosterInput({ url, onChange, label, compact }: { url: string; onChange: (u: string) => void; label?: string; compact?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErr('')
    setBusy(true)
    try {
      onChange(await uploadPoster(file))
    } catch (x) {
      setErr(x instanceof Error && x.message ? x.message : 'Envoi impossible. Réessaie.')
    }
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-2 items-center">
      {label && <p className="text-xs text-bijou-silver self-start">{label}</p>}
      {url && <img src={posterUrl(url, compact ? 300 : 600)} alt="Affiche" className={'rounded-lg object-contain bg-black/30 ' + (compact ? 'max-h-24' : 'max-h-64 w-full')} />}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />
      <button type="button" className={btn} disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? 'Envoi…' : url ? "Changer l'affiche" : 'Ajouter une affiche / photo'}
      </button>
      {url && !busy && <button type="button" className="text-xs text-bijou-silver underline" onClick={() => onChange('')}>Retirer l'affiche</button>}
      {err && <p className="text-xs text-bijou-alert text-center">{err}</p>}
    </div>
  )
}
