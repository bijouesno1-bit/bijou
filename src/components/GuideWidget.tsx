import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

type Sec = { t: string; p: string[] }
type Role = { id: string; label: string; intro: string; secs: Sec[] }

const ROLES: Role[] = [
  {
    id: 'client', label: '🎟️ Client', intro: 'Je veux acheter des billets pour un événement.',
    secs: [
      { t: '✅ Ce que je peux faire', p: [
        'Voir les événements à venir sans compte.',
        'Demander des billets dans la catégorie de mon choix.',
        'Suivre ma demande sur sa page de suivi.',
        'Retrouver mon billet avec son QR code.',
        'Voir où obtenir mes billets.'] },
      { t: '⚠️ Ce que je dois faire', p: [
        'Donner un nom et un téléphone exacts.',
        'Payer selon les instructions de l\'organisateur.',
        'Garder mon billet et le présenter à l\'entrée.'] },
      { t: '🔧 Comment faire', p: [
        'Menu ☰ → « Réserver un billet ».',
        'Choisissez l\'événement, la catégorie et la quantité.',
        'Envoyez la demande et gardez la page de suivi.',
        'Une fois la demande acceptée et payée, ouvrez votre billet.',
        'À l\'entrée, montrez le QR code à l\'agent.'] },
      { t: '⭐ Points importants', p: [
        'Chaque billet a un QR unique, valable une seule fois.',
        'Ne partagez pas votre billet : une seule entrée est possible.',
        'Payez uniquement par les moyens indiqués par l\'organisateur.'] },
    ],
  },
  {
    id: 'org', label: '📣 Organisateur', intro: 'Je publie mes événements et je vends mes billets (particulier, établissement ou entreprise).',
    secs: [
      { t: '✅ Ce que je peux faire', p: [
        'Publier un événement avec affiche, date et catégories de billets.',
        'Gérer mes annonces : modifier, masquer ou supprimer.',
        'Accepter ou refuser les demandes de réservation.',
        'Créer mes portes et mes agents, puis les affecter.',
        'Suivre mes statistiques et l\'historique des billets émis.'] },
      { t: '⚠️ Ce que je dois faire', p: [
        'Donner des informations exactes sur l\'événement.',
        'Répondre vite aux demandes reçues.',
        'Régler les frais de publication si je suis un établissement ou une entreprise.',
        'Supprimer l\'événement après sa date pour fermer l\'accès des agents.'] },
      { t: '🔧 Comment faire', p: [
        'Menu ☰ → « Publier mon événement » (ou « Devenir organisateur » pour créer le compte).',
        'Renseignez l\'événement, le stock et le prix de chaque catégorie.',
        'Configurez vos moyens de paiement.',
        'Ouvrez la 🔔 pour traiter les nouvelles demandes.',
        'Ajoutez vos agents et affectez-les à leurs portes.'] },
      { t: '⭐ Points importants', p: [
        'Les annonces des particuliers sont publiées tout de suite.',
        'Celles des établissements et entreprises attendent la validation du paiement.',
        'Vérifiez le paiement avant d\'émettre un billet.'] },
    ],
  },
  {
    id: 'agent', label: '🔎 Agent', intro: 'Je contrôle l\'accès à ma porte et j\'émets des billets (compte créé par l\'organisateur).',
    secs: [
      { t: '✅ Ce que je peux faire', p: [
        'Scanner les billets QR à ma porte.',
        'Émettre des billets dans la limite de mon quota.',
        'Continuer sans réseau : tout se synchronise au retour de la connexion.'] },
      { t: '⚠️ Ce que je dois faire', p: [
        'Me connecter avec le téléphone ou l\'e-mail et le mot de passe reçus.',
        'Scanner chaque billet avant de laisser entrer.',
        'Prévenir l\'organisateur quand mon stock est presque épuisé.'] },
      { t: '🔧 Comment faire', p: [
        'Menu ☰ → « Contrôle d\'accès (agents) ».',
        'Connectez-vous, puis autorisez la caméra.',
        'Scannez le QR du billet et lisez le résultat affiché.',
        'Pour émettre un billet, choisissez la catégorie et confirmez.'] },
      { t: '⭐ Points importants', p: [
        'Un billet déjà scanné est refusé : pas de doublon possible.',
        'Ne partagez jamais vos identifiants.',
        'Je ne vois que les portes que l\'organisateur m\'a affectées.'] },
    ],
  },
  {
    id: 'admin', label: '🛠️ Admin', intro: 'Je supervise toute la plateforme (accès réservé).',
    secs: [
      { t: '✅ Ce que je peux faire', p: [
        'Suivre les statistiques dans le tableau de bord.',
        'Traiter les demandes de réservation.',
        'Valider, modifier, masquer ou supprimer les événements et les photos de tous les comptes.',
        'Gérer les agents et les portes.',
        'Régler les paiements et les codes QR dans Réglages.'] },
      { t: '⚠️ Ce que je dois faire', p: [
        'Valider les annonces en attente après vérification du paiement.',
        'Supprimer les événements passés qui n\'ont pas été clôturés.',
        'Garder mon accès administrateur confidentiel.'] },
      { t: '🔧 Comment faire', p: [
        'Menu ☰ → « Espace administrateur ».',
        'Utilisez les 5 onglets du bas : Tableau, Demandes, Événements, Équipe, Réglages.',
        'La 🔔 signale les nouvelles réservations et les annonces à valider.'] },
      { t: '⭐ Points importants', p: [
        'Une suppression est définitive : vérifiez avant de confirmer.',
        'Masquez d\'abord une annonce douteuse, supprimez ensuite.'] },
    ],
  },
]

const SEEN = 'bijouGuideSeen'

export function GuideWidget() {
  const { pathname } = useLocation()
  const { profile, isAdmin, isOrganizer } = useAuth()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('client')
  const [toast, setToast] = useState<'off' | 'on' | 'fade'>('off')
  const adminMode = isAdmin && pathname.startsWith('/admin')
  const roles = isAdmin ? ROLES : ROLES.filter(r => r.id !== 'admin')
  const startRole = adminMode ? 'admin' : profile?.role === 'agent' ? 'agent' : isOrganizer ? 'org' : 'client'

  const show = (id?: string) => { setTab(id ?? startRole); setOpen(true); setToast('off') }

  useEffect(() => {
    const h = () => { setTab(startRole); setOpen(true); setToast('off') }
    window.addEventListener('bijou:guide', h)
    return () => window.removeEventListener('bijou:guide', h)
  }, [startRole])

  useEffect(() => {
    if (pathname !== '/') return
    let seen = false
    try { seen = !!sessionStorage.getItem(SEEN) } catch { /* ignore */ }
    if (seen) return
    const t1 = setTimeout(() => {
      try { sessionStorage.setItem(SEEN, '1') } catch { /* ignore */ }
      setToast('on')
    }, 1500)
    const t2 = setTimeout(() => setToast('fade'), 8500)
    const t3 = setTimeout(() => setToast('off'), 9000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [pathname])

  const cur = roles.find(r => r.id === tab) ?? roles[0]

  return (
    <>
      {toast !== 'off' && !open && (
        <div
          role="status"
          onClick={() => show()}
          className={'print:hidden fixed inset-x-3 bottom-24 z-[60] mx-auto flex max-w-sm cursor-pointer items-center gap-3 rounded-2xl border border-bijou-gold bg-bijou-ivory px-4 py-3 text-sm font-medium text-bijou-ink shadow-lg transition-all duration-500 ' + (toast === 'fade' ? 'translate-y-2 opacity-0' : 'opacity-100')}
        >
          <span aria-hidden>❓</span>
          <b className="flex-1">Comment ça marche ?</b>
          <button aria-label="Fermer" onClick={e => { e.stopPropagation(); setToast('off') }} className="h-7 w-7 rounded-full border border-bijou-gold/60">✕</button>
        </div>
      )}

      {adminMode && !open && (
        <button
          onClick={() => show('admin')}
          className="print:hidden fixed bottom-24 left-3 z-[60] rounded-full border border-bijou-gold bg-bijou-ivory px-4 py-2 text-sm font-semibold text-bijou-ink shadow-lg transition active:scale-95"
        >❓ Comment ça marche</button>
      )}

      {open && (
        <div className="print:hidden fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-bijou-gold bg-bijou-ivory p-4 text-bijou-ink shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">❓ Comment ça marche</h2>
              <button aria-label="Fermer" onClick={() => setOpen(false)} className="h-8 w-8 rounded-full border border-bijou-gold/60">✕</button>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {roles.map(r => (
                <button
                  key={r.id}
                  onClick={() => setTab(r.id)}
                  className={'rounded-xl border px-3 py-1.5 text-xs font-medium ' + (r.id === cur.id ? 'border-bijou-gold bg-bijou-gold text-white' : 'border-bijou-gold/60')}
                >{r.label}</button>
              ))}
            </div>
            <p className="mb-2 text-sm opacity-80">{cur.intro}</p>
            {cur.secs.map(s => (
              <div key={s.t}>
                <h3 className="mb-1 mt-3 text-sm font-semibold">{s.t}</h3>
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {s.p.map(x => <li key={x}>{x}</li>)}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
