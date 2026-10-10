import { useCallback, useEffect, useState } from 'react'

export type AlertPrefs = Record<string, boolean>
export type PrefOpt = { key: string; label: string }

const k = (uid: string) => 'alert_prefs:' + uid
export const kindOf = (id: string) => (id.startsWith('evt-') ? 'evt' : 'req')

export function getPrefs(uid: string): AlertPrefs {
  const def: AlertPrefs = { sound: true, req: true, evt: true }
  try { return { ...def, ...JSON.parse(localStorage.getItem(k(uid)) || '{}') } } catch { return def }
}

export function useAlertPrefs(uid: string) {
  const [prefs, set] = useState<AlertPrefs>(() => getPrefs(uid))
  useEffect(() => { set(getPrefs(uid)) }, [uid])
  const setPref = useCallback((key: string, v: boolean) => {
    set(p => {
      const n = { ...p, [key]: v }
      try { localStorage.setItem(k(uid), JSON.stringify(n)) } catch { /* ignore */ }
      return n
    })
  }, [uid])
  return { prefs, setPref }
}
