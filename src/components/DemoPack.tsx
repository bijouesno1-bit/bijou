import { useState } from 'react'
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { card, btn } from '../lib/ui'

// [catégorie, prix FCFA, quantité, type, personnes, zone, déjà vendus]
type T = [string, number, number, string, number?, string?, number?]
type E = { title: string; date: string; venue: string; city: string; description: string; cap: number; t: T[] }

const GATES = ['Porte A – Entrée principale', 'Porte B – Accès VIP', 'Porte C – Presse et invités', 'Porte D – Staff et exposants']

const DEMO: E[] = [
  { title: 'Nuit du Komo – Concert Afro-Fusion', date: '2026-10-24T20:00', venue: 'Palais des Sports', city: 'Libreville',
    description: "Grande soirée live avec les meilleurs artistes afro-fusion du Gabon et d'Afrique centrale. Ouverture des portes à 18h30.", cap: 1000,
    t: [['Simple classic', 5000, 800, 'classic'], ['VIP', 15000, 150, 'vip', 1, 'Tribune VIP'], ['Carré Or', 30000, 40, 'premium', 1, 'Carré Or', 38], ['Table 4 personnes', 80000, 10, 'group', 4, 'Zone tables']] },
  { title: 'Match de gala – Gabon Légendes', date: '2026-11-07T16:00', venue: "Stade de l'Amitié, Angondjé", city: 'Libreville',
    description: "Match de gala entre anciennes gloires du football gabonais et une sélection d'Afrique centrale. Animations et village partenaires dès 13h.", cap: 4000,
    t: [['Tribune populaire', 2000, 3000, 'classic', 1, 'Virage Nord'], ['Tribune couverte', 5000, 800, 'individual', 1, 'Tribune Ouest'], ['VIP', 20000, 100, 'vip', 1, 'Tribune d\'honneur'], ['Invitation presse', 0, 30, 'invitation', 1, 'Tribune presse']] },
  { title: 'Salon Tech & Startups Gabon 2026', date: '2026-11-14T09:00', venue: 'Espace Charbonnages', city: 'Libreville',
    description: 'Exposition, conférences, démonstrations et rencontres investisseurs. Thème : innovation, paiement mobile et jeunesse numérique.', cap: 700,
    t: [['Pass visiteur', 1000, 500, 'classic'], ['Pass professionnel', 10000, 120, 'vip', 1, 'Espace networking'], ['Invitation exposant', 0, 60, 'invitation', 1, 'Exposants']] },
  { title: 'Festival de la Gastronomie Gabonaise', date: '2026-11-21T12:00', venue: 'Esplanade du Front de mer', city: 'Libreville',
    description: "Maniocs, poissons braisés, nyembwè, boissons locales et démonstrations de chefs. Animations musicales et espace enfants.", cap: 1400,
    t: [['Entrée simple', 1500, 1000, 'classic'], ['Pass dégustation', 7500, 300, 'premium', 1, 'Espace chefs'], ['Pack famille (4 pers.)', 5000, 100, 'group', 4, 'Espace famille']] },
  { title: 'Soirée étudiante – Rentrée UOB', date: '2026-11-28T21:00', venue: 'Campus Université Omar Bongo', city: 'Libreville',
    description: 'DJ sets, concours de danse et animations. Carte étudiante exigée pour le tarif réduit.', cap: 650,
    t: [['Tarif étudiant', 2000, 400, 'individual'], ['Standard', 3000, 200, 'classic'], ['VIP', 10000, 50, 'vip', 1, 'Carré VIP']] },
  { title: "Gala de l'Entrepreneuriat Féminin", date: '2026-12-05T19:00', venue: 'Salle des fêtes de la Mairie', city: 'Akanda',
    description: 'Dîner de gala, remise de prix et vente de produits de créatrices gabonaises. Tenue de soirée exigée.', cap: 320,
    t: [['Invité', 25000, 200, 'classic'], ['Table VIP (8 pers.)', 250000, 15, 'group', 8, 'Tables VIP', 15]] },
  { title: 'Libreville Fashion Night', date: '2026-12-19T20:30', venue: 'Institut Français du Gabon', city: 'Libreville',
    description: 'Défilé de créateurs gabonais et ouest-africains, cocktail et séance de dédicaces.', cap: 290,
    t: [['Standard', 8000, 250, 'classic'], ['Front row VIP', 30000, 40, 'premium', 1, 'Premier rang']] },
  { title: 'Réveillon du Nouvel An – Bord de mer', date: '2026-12-31T22:00', venue: 'Plage de la Sablière', city: 'Libreville',
    description: 'Grand réveillon en plein air : concert, feu d\'artifice et DJ jusqu\'au matin.', cap: 770,
    t: [['Simple', 10000, 600, 'classic'], ['Pass couple', 18000, 150, 'group', 2, 'Zone couples'], ['Table VIP (6 pers.)', 100000, 20, 'group', 6, 'Tables VIP']] },
  { title: 'Festival Jazz sur le Fleuve (passé)', date: '2026-08-15T18:00', venue: 'Esplanade du Front de mer', city: 'Libreville',
    description: 'Soirée jazz et blues avec orchestres invités. Événement terminé, créé pour tester l\'historique.', cap: 400,
    t: [['Entrée', 4000, 300, 'classic', 1, '', 262], ['VIP', 12000, 100, 'vip', 1, 'Carré VIP', 74]] },
  { title: 'Conférence Jeunesse, Foi et Avenir (passé)', date: '2026-09-12T15:00', venue: 'Centre de conférences', city: 'Owendo',
    description: "Conférence et témoignages pour la jeunesse. Événement terminé, créé pour tester l'historique.", cap: 650,
    t: [['Place réservée', 2000, 150, 'classic', 1, '', 131], ['Entrée libre', 0, 500, 'invitation', 1, '', 388]] },
]

export async function deleteEventDeep(id: string) {
  const s = await getDocs(query(collection(db, 'ticketTypes'), where('eventId', '==', id)))
  await Promise.all(s.docs.map(d => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'events', id))
}

export function DemoPack() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    if (busy) return
    setBusy(true)
    setMsg('Création en cours…')
    try {
      const ex = await getDocs(query(collection(db, 'events'), where('demo', '==', true)))
      if (!ex.empty) { setMsg("Les événements de test sont déjà chargés. Supprime-les d'abord."); setBusy(false); return }
      let n = 0
      for (const e of DEMO) {
        const ref = await addDoc(collection(db, 'events'), {
          title: e.title, date: e.date, venue: e.venue, city: e.city, description: e.description,
          status: 'draft', maxCapacity: e.cap, demo: true, createdAt: serverTimestamp(),
        })
        for (const [name, price, quantity, kind, persons, zone, sold] of e.t) {
          await addDoc(collection(db, 'ticketTypes'), {
            eventId: ref.id, name, price: kind === 'invitation' ? 0 : price, quantity, sold: sold ?? 0, active: true,
            kind, persons: kind === 'group' ? (persons ?? 2) : 1, zone: zone ?? '', validUntil: null, holdMinutes: 60,
            createdAt: serverTimestamp(),
          })
        }
        n++
        setMsg(n + '/' + DEMO.length + ' événements créés…')
      }
      const g = await getDocs(collection(db, 'checkpoints'))
      const have = new Set(g.docs.map(d => String((d.data() as { name?: string }).name ?? '').toLowerCase()))
      for (const name of GATES) {
        if (!have.has(name.toLowerCase())) await addDoc(collection(db, 'checkpoints'), { name, active: true, createdAt: serverTimestamp() })
      }
      setMsg('Terminé. Rechargement…')
      setTimeout(() => window.location.reload(), 800)
    } catch {
      setMsg('Refusé : vérifie ton accès administrateur.')
      setBusy(false)
    }
  }

  async function removeAll() {
    if (busy) return
    if (!window.confirm('Supprimer tous les événements de test et leurs billets ?')) return
    setBusy(true)
    setMsg('Suppression en cours…')
    try {
      const ex = await getDocs(query(collection(db, 'events'), where('demo', '==', true)))
      for (const d of ex.docs) await deleteEventDeep(d.id)
      setMsg('Supprimé. Rechargement…')
      setTimeout(() => window.location.reload(), 800)
    } catch {
      setMsg('Suppression refusée.')
      setBusy(false)
    }
  }

  return (
    <div className={card + ' max-w-md'}>
      <p className="text-bijou-goldlight font-semibold">Données de test</p>
      <p className="text-sm text-bijou-silver">10 événements de Libreville (brouillons), leurs billets et 4 portes.</p>
      <div className="flex gap-2">
        <button className={btn + ' flex-1'} disabled={busy} onClick={load}>Charger les événements de test</button>
        <button className={btn + ' flex-1 text-bijou-alert'} disabled={busy} onClick={removeAll}>Supprimer tous les tests</button>
      </div>
      {msg && <p className="text-sm text-bijou-silver">{msg}</p>}
    </div>
  )
}
