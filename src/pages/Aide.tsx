import { Link } from 'react-router-dom'

const STEPS = [
  { t: 'Je choisis', d: 'Je choisis mon événement et ma catégorie de billet.' },
  { t: 'Je réserve', d: 'Je fais ma demande de réservation.' },
  { t: 'Je règle', d: "L'organisateur valide ma demande et je règle par le moyen indiqué : Airtel Money, Moov Money, virement ou espèces." },
  { t: 'Je reçois mon billet', d: "Je reçois mon billet avec son QR code, sécurisé. Je le présente à l'entrée, où il est scanné une seule fois." },
]

export default function Aide() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07070C]/60 to-bijou-navy/60 text-bijou-ivory flex flex-col items-center gap-4 p-6">
      <h1 className="text-xl text-bijou-goldlight">Comment ça marche</h1>
      {STEPS.map((s, i) => (
        <div key={i} className="w-full max-w-md rounded-xl border border-bijou-gold/40 bg-white/5 p-4 flex gap-3 items-start">
          <span className="h-8 w-8 shrink-0 rounded-full bg-bijou-gold text-bijou-ink font-bold flex items-center justify-center">{i + 1}</span>
          <div>
            <p className="font-semibold text-bijou-goldlight">{s.t}</p>
            <p className="text-sm text-bijou-silver">{s.d}</p>
          </div>
        </div>
      ))}
      <Link to="/reserver" className="w-full max-w-md text-center rounded-xl border border-bijou-gold/60 px-5 py-3 font-medium active:scale-95 transition">Réserver un billet</Link>
    </div>
  )
}
