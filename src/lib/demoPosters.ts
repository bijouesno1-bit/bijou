import { collection, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { db } from './firebase'

export const DEMO_POSTERS: Record<string, string> = {
  'Nuit du Komo – Concert Afro-Fusion': 'posters/nuit-du-komo.svg',
  'Match de gala – Gabon Légendes': 'posters/match-gabon-legendes.svg',
  'Salon Tech & Startups Gabon 2026': 'posters/salon-tech-startups.svg',
  'Festival de la Gastronomie Gabonaise': 'posters/festival-gastronomie.svg',
  'Soirée étudiante – Rentrée UOB': 'posters/soiree-uob.svg',
  "Gala de l'Entrepreneuriat Féminin": 'posters/gala-entrepreneuriat-feminin.svg',
  'Libreville Fashion Night': 'posters/libreville-fashion-night.svg',
  'Réveillon du Nouvel An – Bord de mer': 'posters/reveillon-nouvel-an.svg',
  'Festival Jazz sur le Fleuve (passé)': 'posters/jazz-sur-le-fleuve.svg',
  'Conférence Jeunesse, Foi et Avenir (passé)': 'posters/conference-jeunesse.svg',
}

// Rattache une affiche aux événements de test qui n'en ont pas.
export async function attachDemoPosters(): Promise<number> {
  const s = await getDocs(query(collection(db, 'events'), where('demo', '==', true)))
  let n = 0
  for (const d of s.docs) {
    const e = d.data() as { title?: string; poster?: string }
    const p = DEMO_POSTERS[e.title ?? '']
    if (p && !e.poster) { await updateDoc(d.ref, { poster: p }); n++ }
  }
  return n
}
