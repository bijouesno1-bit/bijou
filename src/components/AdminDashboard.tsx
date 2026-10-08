import { useCallback, useEffect, useState } from 'react'
import { collection, getCountFromServer, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'

type Agent = { id: string; name: string; used: number }
type D = { pending: number; info: number; awaitingPay: number; paid: number; issued: number; used: number; agents: Agent[] }
type C = [string, '==', string]

async function count(col: string, ...c: C[]): Promise<number> {
  const q = query(collection(db, col), ...c.map(([f, o, v]) => where(f, o, v)))
  return (await getCountFromServer(q)).data().count
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'warn' }) {
  return (
    <div className="rounded-lg border border-bijou-silver/30 bg-black/20 p-2 flex flex-col">
      <span className={'text-xl font-semibold ' + (tone === 'warn' ? 'text-bijou-goldlight' : '')}>{value}</span>
      <span className="text-xs text-bijou-silver">{label}</span>
    </div>
  )
}

export function AdminDashboard() {
  const [d, setD] = useState<D | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try {
      const [pending, info, approved, paid, issued, used, ag] = await Promise.all([
        count('requests', ['status', '==', 'pending']),
        count('requests', ['status', '==', 'info_needed']),
        count('requests', ['status', '==', 'approved']),
        count('requests', ['paymentStatus', '==', 'confirmed']),
        count('tickets'),
        count('tickets', ['status', '==', 'used']),
        getDocs(query(collection(db, 'users'), where('role', '==', 'agent'))),
      ])
      const agents = await Promise.all(ag.docs.map(async x => ({
        id: x.id,
        name: String((x.data() as { name?: string }).name ?? 'Agent'),
        used: await count('tickets', ['status', '==', 'used'], ['usedBy', '==', x.id]),
      })))
      setD({ pending, info, awaitingPay: Math.max(0, approved - paid), paid, issued, used, agents })
      setErr('')
    } catch {
      setErr('Tableau de bord indisponible.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (err) return <p className="text-bijou-alert text-sm">{err}</p>
  if (!d) return <p className="text-bijou-silver text-sm">Chargement du tableau de bord…</p>
  const rate = d.issued > 0 ? Math.round((d.used / d.issued) * 100) : 0
  return (
    <div className="w-full max-w-md rounded-xl border border-bijou-gold/40 bg-white/5 p-4 flex flex-col gap-3">
      <h2 className="text-bijou-goldlight">Tableau de bord</h2>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Demandes en attente" value={d.pending} tone={d.pending > 0 ? 'warn' : undefined} />
        <Stat label="Infos demandées" value={d.info} />
        <Stat label="Paiements à vérifier" value={d.awaitingPay} tone={d.awaitingPay > 0 ? 'warn' : undefined} />
        <Stat label="Demandes payées" value={d.paid} />
        <Stat label="Billets émis" value={d.issued} />
        <Stat label="Billets utilisés" value={d.used + ' (' + rate + ' %)'} />
      </div>
      <div className="text-sm">
        <p className="text-bijou-goldlight">Validations par agent</p>
        {d.agents.length === 0
          ? <p className="text-bijou-silver">Aucun agent.</p>
          : d.agents.map(a => <p key={a.id}>{a.name} : {a.used}</p>)}
      </div>
      <button className="rounded-xl border border-bijou-gold/60 px-3 py-2 text-sm active:scale-95 transition" onClick={load}>Actualiser</button>
    </div>
  )
}
