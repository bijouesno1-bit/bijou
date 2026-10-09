import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'

type V = { id: string; name: string; kind: string; description?: string; hours?: string; phone?: string; email?: string; mapUrl?: string }
const card = 'w-full max-w-md rounded-xl border border-bijou-gold/40 bg-white/5 p-4 flex flex-col gap-3'
const btn = 'rounded-xl border border-bijou-gold/60 px-3 py-2 text-sm font-medium active:scale-95 transition text-center'

export function Venues() {
  const [list, setList] = useState<V[]>([])
  useEffect(() => {
    (async () => {
      try {
        const s = await getDocs(query(collection(db, 'venues'), where('active', '==', true)))
        setList(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<V, 'id'>) })))
      } catch { /* section facultative */ }
    })()
  }, [])
  if (!list.length) return null
  return (
    <div className={card}>
      <h2 className="text-bijou-goldlight font-semibold">Où obtenir mes billets</h2>
      {list.map(v => {
        const map = v.mapUrl && v.mapUrl.startsWith('https://') ? v.mapUrl : ''
        const digits = (v.phone ?? '').replace(/\D/g, '')
        const wa = 'https://wa.me/' + digits + '?text=' + encodeURIComponent('Bonjour, je souhaite obtenir mes billets (' + v.name + ').' + (map ? ' ' + map : ''))
        return (
          <div key={v.id} className="rounded-lg border border-bijou-silver/30 p-3 flex flex-col gap-1 text-sm">
            <p><b>{v.name}</b> · {v.kind === 'vente' ? 'Point de vente' : 'Point de distribution'}</p>
            {v.description && <p>{v.description}</p>}
            {v.hours && <p className="text-bijou-silver">{v.hours}</p>}
            {v.email && <p className="text-bijou-silver">{v.email}</p>}
            <div className="flex gap-2 flex-wrap mt-1">
              {map && <a className={btn} href={map} target="_blank" rel="noreferrer">Itinéraire</a>}
              {digits && <a className={btn} href={'tel:+' + digits.replace(/^\+/, '')}>Appeler</a>}
              {digits && <a className={btn} href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
