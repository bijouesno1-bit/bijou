import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { collection, getCountFromServer, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'

type Agent = { id: string; name: string; used: number }
type Cat = { id: string; name: string; free: boolean; issued: number; used: number }
type Gate = { id: string; name: string; used: number }
type D = { pending: number; info: number; awaitingPay: number; paid: number; issued: number; used: number; agents: Agent[]; cats: Cat[]; gates: Gate[] }
type C = [string, '==', string]

async function count(col: string, ...c: C[]): Promise<number> {
  const q = query(collection(db, col), ...c.map(([f, o, v]) => where(f, o, v)))
  return (await getCountFromServer(q)).data().count
}

const TONES: Record<string, string> = {
  'Demandes en attente': 'border-bijou-gold text-bijou-goldlight',
  'Infos demandées': 'border-sky-400 text-sky-300',
  'Paiements à vérifier': 'border-orange-400 text-orange-300',
  'Demandes payées': 'border-emerald-400 text-emerald-300',
  'Billets émis': 'border-violet-400 text-violet-300',
  'Billets utilisés': 'border-teal-300 text-teal-200',
}

function Stat({ label, value, onClick }: { label: string; value: string | number; tone?: 'warn'; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={'w-full active:scale-95 transition rounded-lg border-2 bg-black/20 p-2 h-20 flex flex-col items-center justify-center text-center ' + (TONES[label] ?? TONES['Demandes en attente'])}>
      <span className="text-xl font-semibold">{value}</span>
      <span className="text-xs text-bijou-silver">{label}</span>
    </button>
  )
}

export function AdminDashboard() {
  const [d, setD] = useState<D | null>(null)
  const [err, setErr] = useState('')
  const [, setSp] = useSearchParams()
  const TICKETS_TAB = 'evenements'
  const go = (t: string, f?: string) => setSp(f ? { t, f } : { t })

  const load = useCallback(async () => {
    try {
      const [pending, info, approved, paid, issued, used, ag, tt, cp] = await Promise.all([
        count('requests', ['status', '==', 'pending']),
        count('requests', ['status', '==', 'info_needed']),
        count('requests', ['status', '==', 'approved']),
        count('requests', ['paymentStatus', '==', 'confirmed']),
        count('tickets'),
        count('tickets', ['status', '==', 'used']),
        getDocs(query(collection(db, 'users'), where('role', '==', 'agent'))),
        getDocs(collection(db, 'ticketTypes')),
        getDocs(collection(db, 'checkpoints')),
      ])
      const agents = await Promise.all(ag.docs.map(async x => ({
        id: x.id,
        name: String((x.data() as { name?: string }).name ?? 'Agent'),
        used: await count('tickets', ['status', '==', 'used'], ['usedBy', '==', x.id]),
      })))
      const cats = await Promise.all(tt.docs.map(async x => {
        const v = x.data() as { name?: string; kind?: string }
        return {
          id: x.id, name: String(v.name ?? 'Catégorie'), free: v.kind === 'invitation',
          issued: await count('tickets', ['ticketTypeId', '==', x.id]),
          used: await count('tickets', ['ticketTypeId', '==', x.id], ['status', '==', 'used']),
        }
      }))
      const gates = await Promise.all(cp.docs.map(async x => ({
        id: x.id,
        name: String((x.data() as { name?: string }).name ?? 'Porte'),
        used: await count('scans', ['checkpointId', '==', x.id], ['result', '==', 'ok']),
      })))
      setD({ pending, info, awaitingPay: Math.max(0, approved - paid), paid, issued, used, agents, cats, gates })
      setErr('')
    } catch {
      setErr('Tableau de bord indisponible.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (err) return <p className="text-bijou-alert text-sm">{err}</p>
  if (!d) return <p className="text-bijou-silver text-sm">Chargement du tableau de bord…</p>
  const rate = d.issued > 0 ? Math.round((d.used / d.issued) * 100) : 0
  const sum = (free: boolean, k: 'issued' | 'used') => d.cats.filter(c => c.free === free).reduce((a, c) => a + c[k], 0)
  const classed = d.cats.reduce((a, c) => a + c.issued, 0)
  const full = d.issued > 0 && d.used >= d.issued
  return (
    <div className="w-full max-w-md rounded-xl border border-bijou-gold/40 bg-white/5 p-4 flex flex-col gap-3">
      <h2 className="text-bijou-goldlight">Tableau de bord</h2>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Demandes en attente" value={d.pending} tone={d.pending > 0 ? 'warn' : undefined} onClick={() => go('demandes', 'pending')} />
        <Stat label="Infos demandées" value={d.info} onClick={() => go('demandes', 'info_needed')} />
        <Stat label="Paiements à vérifier" value={d.awaitingPay} tone={d.awaitingPay > 0 ? 'warn' : undefined} onClick={() => go('demandes', 'approved')} />
        <Stat label="Demandes payées" value={d.paid} onClick={() => go('demandes', 'paid')} />
        <Stat label="Billets émis" value={d.issued} onClick={() => go(TICKETS_TAB)} />
        <Stat label="Billets utilisés" value={d.used + ' (' + rate + ' %)'} onClick={() => go(TICKETS_TAB)} />
      </div>
      {full && <p className="rounded-lg bg-bijou-alert text-white px-3 py-1 text-sm font-semibold">Alerte : les entrées ont atteint le nombre de billets émis.</p>}
      <div className="text-sm">
        <p className="text-bijou-goldlight">Payants / gratuits (sans montant)</p>
        <p className="text-bijou-goldlight">Payants : émis {sum(false, 'issued')} · entrés {sum(false, 'used')}</p>
        <p className="text-pink-300">Gratuits : émis {sum(true, 'issued')} · entrés {sum(true, 'used')}</p>
      </div>
      <div className="text-sm">
        <p className="text-bijou-goldlight">Par catégorie</p>
        {d.cats.length === 0 && <p className="text-bijou-silver">Aucune catégorie.</p>}
        {d.cats.map(c => (
          <p key={c.id} className={c.issued > 0 && c.used >= c.issued ? 'text-bijou-goldlight' : ''}>
            {c.name}{c.free ? ' (gratuit)' : ''} : émis {c.issued} · entrés {c.used} · restants {Math.max(0, c.issued - c.used)}
          </p>
        ))}
        {d.issued > classed && <p className="text-bijou-silver">Non classés : {d.issued - classed}</p>}
      </div>
      <div className="text-sm">
        <p className="text-bijou-goldlight">Entrées par porte</p>
        {d.gates.length === 0 ? <p className="text-bijou-silver">Aucune porte.</p> : d.gates.map(g => <p key={g.id}>{g.name} : {g.used}</p>)}
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
