import { stockInfo } from '../lib/stock'

type T = { quantity: number; sold: number; reserved?: number }

// Résumé global d'un événement : ventes, places bloquées, places libres, alertes.
export function EventStats({ tickets }: { tickets: T[] }) {
  if (tickets.length === 0) return null
  const infos = tickets.map(stockInfo)
  const cap = tickets.reduce((a, t) => a + Math.max(0, t.quantity), 0)
  const sold = infos.reduce((a, s) => a + s.sold, 0)
  const held = infos.reduce((a, s) => a + s.held, 0)
  const left = infos.reduce((a, s) => a + s.left, 0)
  const rate = cap > 0 ? Math.min(100, Math.round((sold / cap) * 100)) : 0
  const out = infos.filter(s => s.tone === 'alert').length
  const low = infos.filter(s => s.tone === 'warn').length
  return (
    <div className="rounded-lg border border-bijou-silver/30 bg-black/20 p-2 text-sm flex flex-col gap-1">
      <p className="text-bijou-goldlight">Remplissage : {sold}/{cap} vendus ({rate} %)</p>
      <div className="h-2 w-full rounded bg-black/40 overflow-hidden">
        <div className="h-2 bg-bijou-gold" style={{ width: rate + '%' }} />
      </div>
      <p className="text-bijou-silver">Bloquées : {held} · Libres : {left}</p>
      {out > 0 && <p className="text-bijou-alert">{out} catégorie(s) épuisée(s) ou complète(s)</p>}
      {low > 0 && <p className="text-bijou-goldlight">{low} catégorie(s) presque épuisée(s)</p>}
    </div>
  )
}
