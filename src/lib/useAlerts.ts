import { useEffect, useRef, useState } from 'react'
import { onSnapshot, type DocumentData, type Query } from 'firebase/firestore'

export type Alert = { id: string; title: string; body: string; link: string; at: number }
export type Source = { q: () => Query; map: (id: string, d: DocumentData) => Alert }

const KEY = 'alerts_read'
const loadRead = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
const saveRead = (l: string[]) => { try { localStorage.setItem(KEY, JSON.stringify(l.slice(-300))) } catch { /* ignore */ } }

export function useAlerts(userKey: string, sources: Source[], onNew?: (a: Alert) => void) {
  const [items, setItems] = useState<Alert[]>([])
  const [read, setRead] = useState<string[]>(loadRead)
  const known = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!userKey) return
    const per = new Map<number, Alert[]>()
    const first = new Set<number>()
    known.current = null
    const offs = sources.map((s, i) => onSnapshot(s.q(), snap => {
      per.set(i, snap.docs.map(d => s.map(d.id, d.data())))
      first.add(i)
      const all = [...per.values()].flat().sort((a, b) => b.at - a.at)
      setItems(all)
      if (first.size < sources.length) return
      if (known.current === null) { known.current = new Set(all.map(a => a.id)); return }
      for (const a of all) {
        if (!known.current.has(a.id)) {
          known.current.add(a.id)
          if (!loadRead().includes(a.id)) onNew?.(a)
        }
      }
    }, () => { /* droits ou réseau : on ignore */ }))
    return () => offs.forEach(o => o())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userKey])

  const unread = items.filter(a => !read.includes(a.id))
  const markRead = (id: string) => setRead(p => { const n = p.includes(id) ? p : [...p, id]; saveRead(n); return n })
  const markAll = () => setRead(p => { const n = [...new Set([...p, ...items.map(a => a.id)])]; saveRead(n); return n })
  return { items, unread, markRead, markAll }
}
