import type { ReactNode } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import Scan from './pages/Scan'
import Billet from './pages/Billet'
import Demande from './pages/Demande'
import Valider from './pages/Valider'
import Reserver from './pages/Reserver'
import Admin from './pages/Admin'
import Organisateur from './pages/Organisateur'
import { chrome } from './chrome'
import Lot from './pages/Lot'
import Aide from './pages/Aide'
import Apropos from './pages/Apropos'
import Lieux from './pages/Lieux'
import Annonces from './pages/Annonces'
import EventRail from './components/EventRail'
import { Shell } from './components/Shell'

const base = import.meta.env.BASE_URL
const bg = 'min-h-screen bg-gradient-to-br from-[#07070C]/60 to-bijou-navy/60 text-bijou-ivory flex flex-col items-center justify-center gap-5 p-6'
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
      <EventRail />
        <Link to="/reserver" className={btn} style={chrome("Réserver un billet")}>Réserver un billet</Link>
      {null}
      <Link to="/aide" className={btn} style={chrome("Comment ça marche")}>Comment ça marche</Link>
        <Link to="/organisateur" className={btn} style={chrome("Publier mon événement")}>Publier mon événement</Link>
        <Link to="/organisateur" className={btn} style={chrome("Devenir organisateur")}>Devenir organisateur</Link>
      <Link to="/scan" className={btn} style={chrome("Contrôle d'accès (agents)")}>Contrôle d'accès (agents)</Link>
      <Link to="/admin" className={btn} style={chrome("Espace administrateur")}>Espace administrateur</Link>
    </div>
  )
}

export default function App() {
  return (
    <Shell>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/reserver" element={<Reserver />} />
      <Route path="/demande/:id" element={<Demande />} />
      <Route path="/valider/:id" element={<Valider />} />
      <Route path="/billet/:token" element={<Billet />} />
      <Route path="/scan" element={<Scan />} />
      <Route path="/admin" element={<Admin />} />
        <Route path="/organisateur" element={<Organisateur />} />
      <Route path="/lot/:id" element={<Lot />} />
      <Route path="/aide" element={<Aide />} />
      <Route path="/apropos" element={<Apropos />} />
      <Route path="/lieux" element={<Lieux />} />
      <Route path="/annonces" element={<Annonces />} />
      <Route path="*" element={<Page title="Page introuvable" />} />
    </Routes>
    </Shell>
  )
}
