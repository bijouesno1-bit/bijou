import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setBadge } from '../lib/alertFx'
import type { Alert } from '../lib/useAlerts'
import type { AlertPrefs, PrefOpt } from '../lib/alertPrefs'
import type { PushCtl } from './PushBell'

type A = { items: Alert[]; unread: Alert[]; markRead: (id: string) => void; markAll: () => void }
type S = { opts: PrefOpt[]; prefs: AlertPrefs; setPref: (k: string, v: boolean) => void; push: PushCtl }

function Switch({ on, label, hint, onClick }: { on: boolean; label: string; hint?: string; onClick: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm active:bg-white/10">
      <span className="min-w-0 flex-1 leading-tight">
        {label}
        {hint && <span className="block text-xs opacity-70">{hint}</span>}
      </span>
      <span className={'relative h-6 w-11 shrink-0 rounded-full transition ' + (on ? 'bg-bijou-gold' : 'bg-white/20')}>
        <span className={'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ' + (on ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}

export function Bell({ a, settings }: { a: A; settings?: S }) {
  const [open, setOpen] = useState(false)
  const [cfg, setCfg] = useState(false)
  const nav = useNavigate()
  const n = a.unread.length
  const unreadIds = new Set(a.unread.map(x => x.id))
  useEffect(() => { setBadge(n) }, [n])
  const p = settings?.push
  return (
    <div className="relative">
      <button aria-label="Notifications" onClick={() => { setOpen(o => !o); setCfg(false) }} className="relative p-1.5 text-bijou-ink">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {n > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[11px] font-semibold leading-[18px] text-white">{n > 99 ? '99+' : n}</span>}
      </button>
      {open && (
        <div className="fixed top-14 right-2 z-[60] w-80 max-w-[94vw] max-h-[70vh] overflow-y-auto rounded-xl border border-bijou-gold/40 bg-bijou-ink p-2 text-bijou-ivory shadow-xl">
          <div className="flex items-center justify-between gap-2 px-2 pb-2 text-sm">
            <b>{cfg ? 'Réglages' : 'Notifications'}</b>
            <span className="flex items-center gap-2">
              {!cfg && n > 0 && <button className="underline" onClick={a.markAll}>Tout marquer comme lu</button>}
              {settings && (
                <button aria-label={cfg ? 'Retour' : 'Réglages des notifications'} onClick={() => setCfg(v => !v)} className="rounded-full p-1.5 text-bijou-goldlight active:bg-white/10">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {cfg ? <path d="M15 6l-6 6 6 6" /> : <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>}
                  </svg>
                </button>
              )}
            </span>
          </div>
          {cfg && settings ? (
            <div className="flex flex-col">
              {settings.opts.map(o => (
                <Switch key={o.key} on={settings.prefs[o.key] !== false} label={o.label} onClick={() => settings.setPref(o.key, settings.prefs[o.key] === false)} />
              ))}
              <Switch on={settings.prefs.sound !== false} label="Son des alertes" onClick={() => settings.setPref('sound', settings.prefs.sound === false)} />
              {p && (p.st === 'on' || p.st === 'off' || p.st === 'error') && (
                <Switch on={p.st === 'on'} label="Alertes téléphone" hint="Application fermée (tout ou rien)" onClick={() => { void (p.st === 'on' ? p.deactivate() : p.activate()) }} />
              )}
              {p && p.st === 'denied' && <p className="px-2 py-1 text-xs text-bijou-alert">Alertes bloquées : autorise les notifications dans les réglages du navigateur.</p>}
              {p && p.st === 'unsupported' && <p className="px-2 py-1 text-xs opacity-70">Alertes téléphone indisponibles ici.</p>}
              {p && p.msg && <p className="px-2 py-1 text-xs text-bijou-goldlight">{p.msg}</p>}
              <p className="px-2 pt-2 text-[11px] opacity-60">Réglages enregistrés sur cet appareil.</p>
            </div>
          ) : (
            <>
              {a.items.length === 0 && <p className="px-2 py-4 text-sm opacity-70">Rien de nouveau.</p>}
              {a.items.map(x => (
                <button key={x.id} className={'block w-full rounded-lg px-2 py-2 text-left text-sm ' + (unreadIds.has(x.id) ? 'bg-white/10 font-semibold' : 'opacity-60')}
                  onClick={() => { a.markRead(x.id); setOpen(false); nav(x.link) }}>
                  <span className="block">{x.title}</span>
                  <span className="block text-xs font-normal opacity-80">{x.body}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
