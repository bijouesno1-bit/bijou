import { Link } from 'react-router-dom'

// Contact public à afficher (WhatsApp ou e-mail professionnel). Laisser vide pour le masquer.
const CONTACT = ''

const card = 'w-full max-w-md rounded-xl border border-bijou-gold/40 bg-white/5 p-4 flex flex-col gap-2'

export default function Apropos() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07070C] to-bijou-navy text-bijou-ivory flex flex-col items-center gap-4 p-6">
      <h1 className="text-xl text-bijou-goldlight">À propos</h1>
      <div className={card}>
        <p className="font-semibold text-bijou-goldlight">BIJOU</p>
        <p className="text-sm">Le billet authentique, l'entrée sécurisée.</p>
        <p className="text-sm text-bijou-silver">BIJOU est une application de billetterie : réservation en ligne, billets à QR code uniques, contrôle à l'entrée et suivi complet pour l'organisateur.</p>
      </div>
      <div className={card}>
        <p className="font-semibold text-bijou-goldlight">Créateur technique</p>
        <p className="text-sm">Monsieur KOZANGUE ESSONO PATRICK BERTIN, informaticien gabonais, fondateur de la start-up informatique PC-INFORMATIQUE, qui a créé l'appellation BIJOU.</p>
      </div>
      {CONTACT && (
        <div className={card}>
          <p className="font-semibold text-bijou-goldlight">Contact</p>
          <p className="text-sm break-all">{CONTACT}</p>
        </div>
      )}
      <Link to="/" className="w-full max-w-md text-center rounded-xl border border-bijou-gold/60 px-5 py-3 font-medium active:scale-95 transition">Retour à l'accueil</Link>
    </div>
  )
}
