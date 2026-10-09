import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { InstallBanner } from './InstallBanner'
import { Avatar } from './Avatar'
import { ProfilePanel } from './ProfilePanel'

const base = import.meta.env.BASE_URL

type Tab = { to: string; key: string; label: string; icon: ReactNode }

const PUBLIC_TABS: Tab[] = [
  { to: '/', key: 'accueil', label: 'Accueil', icon: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" /> },
  { to: '/reserver', key: 'events', label: 'Événements', icon: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></> },
  { to: '/lieux', key: 'lieux', label: 'Lieux', icon: <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></> },
  { to: '/aide', key: 'aide', label: 'Aide', icon: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" /></> },
]

const ADMIN_TABS: Tab[] = [
  { to: '/admin?t=tableau', key: 'tableau', label: 'Tableau', icon: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></> },
  { to: '/admin?t=demandes', key: 'demandes', label: 'Demandes', icon: <><path d="M4 4h16v12h-5l-3 3-3-3H4z" /><path d="M8 9h8M8 12h5" /></> },
  { to: '/admin?t=evenements', key: 'evenements', label: 'Événements', icon: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></> },
  { to: '/admin?t=equipe', key: 'equipe', label: 'Équipe', icon: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2c2.8 0 5 2 5 5.3" /></> },
  { to: '/admin?t=reglages', key: 'reglages', label: 'Réglages', icon: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></> },
]

const PUBLIC_MENU = [
  { to: '/', label: 'Accueil' },
  { to: '/annonces', label: 'Événements à venir' },
  { to: '/reserver', label: 'Réserver un billet' },
  { to: '/lieux', label: 'Où obtenir mes billets' },
  { to: '/aide', label: 'Comment ça marche' },
  { to: '/apropos', label: 'À propos' },
  { to: '/scan', label: "Contrôle d'accès (agents)" },
  { to: '/admin', label: 'Espace organisateur' },
]

const ADMIN_MENU = [
  ...ADMIN_TABS.map(t => ({ to: t.to, label: t.label === 'Tableau' ? 'Tableau de bord' : t.label === 'Demandes' ? 'Demandes de réservation' : t.label === 'Équipe' ? 'Agents et portes' : t.label })),
  { to: '/scan', label: "Contrôle d'accès" },
  { to: '/', label: 'Voir le site public' },
]

function publicKey(p: string) {
  if (p === '/') return 'accueil'
  if (p.startsWith('/reserver') || p.startsWith('/demande') || p.startsWith('/annonces')) return 'events'
  if (p.startsWith('/lieux')) return 'lieux'
  if (p.startsWith('/aide')) return 'aide'
  return ''
}

const link = 'w-full text-center rounded-xl border border-bijou-gold/60 px-3 py-2 text-sm font-medium active:scale-95 transition'

export function Shell({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation()
  const { user, profile, isAdmin, isStaff, logout } = useAuth()
  const [menu, setMenu] = useState(false)
  const [login, setLogin] = useState(false)
  const adminMode = isAdmin && pathname.startsWith('/admin')
  const t = new URLSearchParams(search).get('t') ?? 'tableau'
  const tabs = adminMode ? ADMIN_TABS : PUBLIC_TABS
  const activeKey = adminMode ? t : publicKey(pathname)
  const idx = tabs.findIndex(x => x.key === activeKey)
  const items = adminMode ? ADMIN_MENU : PUBLIC_MENU
  const role = isAdmin ? 'Organisateur' : isStaff ? 'Agent' : 'Compte sans accès'
  const photo = user && profile?.photoUrl ? profile.photoUrl : ''

  return (
    <div className="min-h-screen">
      <header className="print:hidden fixed top-0 inset-x-0 z-40 h-14 bg-bijou-ivory border-b border-bijou-gold/40 shadow-sm flex items-center justify-between px-3">
        <Link to={adminMode ? '/admin?t=tableau' : '/'} className="flex items-center gap-2">
          <img src={`${base}brand/icon.svg`} alt="" className="h-8 w-8" />
          <span className="flex flex-col leading-none">
            <span
              className="bg-gradient-to-r from-[#8A6D12] via-bijou-gold to-[#8A6D12] bg-clip-text text-transparent text-xl font-semibold"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: '0.35em' }}
            >BIJOU</span>
            <span className="mt-1 h-px w-full bg-gradient-to-r from-transparent via-bijou-gold to-transparent" />
          </span>
          {adminMode && <span className="rounded bg-bijou-navy text-bijou-ivory text-[10px] px-1.5 py-0.5 tracking-widest">ADMIN</span>}
        </Link>
        <div className="flex items-center gap-1">
          <button aria-label="Connexion" onClick={() => setLogin(v => !v)} className="relative p-2 text-bijou-ink">
            {photo && <Avatar url={photo} size={32} />}
            <svg viewBox="0 0 24 24" className={photo ? 'hidden' : 'h-7 w-7'} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M6 18.5c1-2.8 3.4-4 6-4s5 1.2 6 4" />
            </svg>
            {user && isStaff && <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-bijou-ok border border-bijou-ivory" />}
          </button>
          <button aria-label="Menu" onClick={() => setMenu(true)} className="p-2 text-bijou-ink">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </header>

      {login && (
        <>
          <div className="print:hidden fixed inset-0 z-[55]" onClick={() => setLogin(false)} />
          <div className="print:hidden fixed top-14 right-2 z-[60] w-64 rounded-xl border border-bijou-gold/40 bg-bijou-ink p-3 flex flex-col gap-2 text-bijou-ivory">
            {user ? (
              <>
                <p className="text-sm text-bijou-silver text-center break-all">{user.email}<br /><b className="text-bijou-goldlight">{role}</b></p>
                {isStaff && <ProfilePanel />}
                {isStaff && <Link to="/scan" onClick={() => setLogin(false)} className={link}>Contrôle d'accès</Link>}
                {isAdmin && <Link to="/admin?t=tableau" onClick={() => setLogin(false)} className={link}>Espace organisateur</Link>}
                <button onClick={() => { setLogin(false); logout() }} className={link}>Se déconnecter</button>
              </>
            ) : (
              <>
                <p className="text-sm text-bijou-silver text-center">Se connecter</p>
                <Link to="/scan" onClick={() => setLogin(false)} className={link}>Espace agent</Link>
                <Link to="/admin" onClick={() => setLogin(false)} className={link}>Espace organisateur</Link>
              </>
            )}
          </div>
        </>
      )}

      <div className={'print:hidden fixed inset-0 z-[60] ' + (menu ? '' : 'pointer-events-none')} aria-hidden={!menu}>
        <div onClick={() => setMenu(false)} className={'absolute inset-0 bg-black/60 transition-opacity duration-300 ' + (menu ? 'opacity-100' : 'opacity-0')} />
        <aside className={'absolute top-0 right-0 h-full w-72 max-w-[85%] bg-bijou-ink border-l border-bijou-gold/30 p-4 flex flex-col gap-2 text-bijou-ivory overflow-y-auto transition-transform duration-300 ' + (menu ? 'translate-x-0' : 'translate-x-full')}>
          <div className="flex items-center justify-between">
            {adminMode ? <span className="text-xs tracking-widest text-bijou-goldlight">MENU ORGANISATEUR</span> : <span />}
            <button aria-label="Fermer" onClick={() => setMenu(false)} className="p-1 text-bijou-goldlight">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          {items.map(m => {
            const on = adminMode && m.to.startsWith('/admin') ? m.to.endsWith('t=' + t) : !adminMode && pathname === m.to
            return (
              <Link key={m.to} to={m.to} onClick={() => setMenu(false)}
                className={'rounded-xl px-4 py-3 border active:scale-95 transition ' + (on ? 'border-bijou-gold text-bijou-goldlight' : 'border-bijou-silver/20')}>
                {m.label}
              </Link>
            )
          })}
          {adminMode && <button onClick={() => { setMenu(false); logout() }} className="rounded-xl px-4 py-3 border border-bijou-alert/60 text-bijou-alert text-left active:scale-95 transition">Se déconnecter</button>}
        </aside>
      </div>

      <main className="pt-14 pb-[calc(4.25rem+env(safe-area-inset-bottom))] print:pt-0 print:pb-0">
        <InstallBanner />
        {children}
      </main>

      <nav className="print:hidden fixed bottom-0 inset-x-0 z-40 bg-bijou-ink/95 backdrop-blur border-t border-bijou-gold/20" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="relative mx-auto max-w-md flex">
          <span
            className="absolute top-0 left-0 flex justify-center pointer-events-none transition-all duration-300 ease-out"
            style={{ width: 100 / tabs.length + '%', transform: `translateX(${Math.max(idx, 0) * 100}%)`, opacity: idx < 0 ? 0 : 1 }}
          >
            <span className="h-[3px] w-10 rounded-b bg-bijou-goldlight" />
          </span>
          {tabs.map((x, i) => (
            <Link key={x.key} to={x.to} className={'flex-1 flex flex-col items-center gap-1 py-2 text-[11px] ' + (i === idx ? 'text-bijou-goldlight' : 'text-bijou-silver')}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{x.icon}</svg>
              {x.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
