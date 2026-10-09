import { stockInfo } from '../lib/stock'

type Props = {
  t: { name: string; price: number; quantity: number; sold: number; reserved?: number }
}

const TONE = {
  ok: 'text-bijou-ok',
  warn: 'text-bijou-goldlight',
  alert: 'text-bijou-alert',
}

export function StockLine({ t }: Props) {
  const s = stockInfo(t)
  return (
    <div className="text-sm">
      <p>
        • {t.name} : {t.price === 0 ? 'Gratuit' : t.price.toLocaleString('fr-FR') + ' FCFA'} · {s.sold}/{t.quantity} {t.price === 0 ? 'émis' : 'vendus'} ({s.rate} %)
      </p>
      <p className="ml-3 text-bijou-silver">
        Bloquées : {s.held} · Libres : {s.left}
        {s.label && <span className={'ml-2 font-semibold ' + TONE[s.tone]}>{s.label}</span>}
      </p>
    </div>
  )
}
