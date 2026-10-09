import { useState, type ReactNode } from 'react'

export type Mode = 'compact' | 'medium' | 'large'

export function useViewMode(key: string, def: Mode = 'large') {
  const k = 'bijou_view_' + key
  const [mode, set] = useState<Mode>(() => {
    try {
      const v = localStorage.getItem(k)
      if (v === 'compact' || v === 'medium' || v === 'large') return v
    } catch { /* ignore */ }
    return def
  })
  const setMode = (m: Mode) => {
    set(m)
    try { localStorage.setItem(k, m) } catch { /* ignore */ }
  }
  return [mode, setMode] as const
}

const ICONS: Record<Mode, { label: string; svg: ReactNode }> = {
  compact: { label: 'Mode compact', svg: <path d="M4 6h.01M8 6h12M4 12h.01M8 12h12M4 18h.01M8 18h12" /> },
  medium: { label: 'Mode moyen', svg: <><rect x="3" y="4" width="6" height="6" rx="1" /><path d="M12 5h9M12 9h6" /><rect x="3" y="14" width="6" height="6" rx="1" /><path d="M12 15h9M12 19h6" /></> },
  large: { label: 'Mode grand', svg: <><rect x="4" y="3" width="16" height="11" rx="2" /><path d="M4 18h16M4 21h10" /></> },
}

export function ViewModeBar({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="w-full max-w-md flex justify-center gap-2" role="group" aria-label="Mode d'affichage">
      {(['compact', 'medium', 'large'] as Mode[]).map(m => (
        <button key={m} aria-label={ICONS[m].label} aria-pressed={mode === m} onClick={() => onChange(m)}
          className={'rounded-lg border p-1.5 active:scale-95 transition ' + (mode === m ? 'border-bijou-gold text-bijou-goldlight bg-bijou-gold/10' : 'border-bijou-silver/30 text-bijou-silver')}>
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{ICONS[m].svg}</svg>
        </button>
      ))}
    </div>
  )
}
