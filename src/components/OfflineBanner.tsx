import { useEffect, useState } from 'react'

// Avertit clairement quand l'appareil n'a plus de connexion.
// Aucun billet ne doit être présenté comme validé sans le serveur.
export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const offline = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', offline)
    }
  }, [])
  if (online) return null
  return (
    <div role="alert" className="fixed top-0 inset-x-0 z-50 bg-black border-b border-bijou-alert text-bijou-alert text-sm text-center px-3 py-2">
      Hors connexion : aucun billet ne peut être validé sans le serveur, et les données affichées peuvent être dépassées.
    </div>
  )
}
