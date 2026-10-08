import type { ReactNode } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import Admin from './pages/Admin'

const base = import.meta.env.BASE_URL
const bg = 'min-h-screen bg-gradient-to-br from-[#07070C] to-bijou-navy text-bijou-ivory flex flex-col items-center justify-center gap-5 p-6'
const btn = 'w-full max-w-sm text-center rounded-xl border border-bijou-gold/60 px-5 py-3 font-medium active:scale-95 transition'

function Page({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={bg}>
      <img src={`${base}brand/logo-sombre.svg`} alt="BIJOU" className="w-full max-w-xs" />
      <h1 className="text-xl text-bijou-goldlight">{title}</h1>
      <p className="text-bijou-silver text-center">{children ?? 'Interface en construction.'}</p>
      <Link to="/" className={btn}>Retour à l'accueil</Link>
    </div>
  )
}

function Home() {
  return (
    <div className={bg}>
      <img src={`${base}brand/logo-sombre.svg`} alt="BIJOU - Le billet authentique, l'entrée sécurisée" className="w-full max-w-sm" />
      <Link to="/reserver" className={btn}>Réserver un billet</Link>
      <Link to="/scan" className={btn}>Contrôle d'accès (agents)</Link>
      <Link to="/admin" className={btn}>Espace organisateur</Link>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/reserver" element={<Page title="Réservation" />} />
      <Route path="/scan" element={<Page title="BIJOU Scan" />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Page title="Page introuvable" />} />
    </Routes>
  )
}
