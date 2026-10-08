import { useState } from 'react'

export function CopyUid({ uid }: { uid: string }) {
  const [ok, setOk] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(uid); setOk(true) }
    catch { window.prompt('Copie cet UID :', uid) }
  }
  return (
    <>
      <code className="break-all text-bijou-goldlight text-sm select-all">{uid}</code>
      <button type="button" onClick={copy} className="rounded-xl border border-bijou-gold/60 px-4 py-2 font-medium active:scale-95 transition text-center">
        {ok ? 'UID copié ✓' : "Copier l'UID"}
      </button>
    </>
  )
}
