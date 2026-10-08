import { useState } from 'react'

type Props = { value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string }

export function PasswordInput({ value, onChange, placeholder = 'Mot de passe', autoComplete = 'current-password' }: Props) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative w-full">
      <input
        className="w-full rounded-lg bg-black/40 border border-bijou-silver/40 px-3 py-2 pr-12 text-bijou-ivory"
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
      />
      <button
        type="button"
        aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        onClick={() => setShow(!show)}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-bijou-silver"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
          <circle cx="12" cy="12" r="3" />
          {show && <line x1="3" y1="3" x2="21" y2="21" />}
        </svg>
      </button>
    </div>
  )
}
