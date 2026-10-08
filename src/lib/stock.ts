// Calcul du stock d'une catégorie de billets.
// Le taux de remplissage ne compte que les billets vendus ;
// les places bloquées par des demandes approuvées sont comptées à part
// (jamais deux fois la même quantité).
export type StockInfo = {
  sold: number
  held: number
  left: number
  rate: number
  label: string
  tone: 'ok' | 'warn' | 'alert'
}

export function stockInfo(t: { quantity: number; sold: number; reserved?: number }): StockInfo {
  const cap = Math.max(0, t.quantity)
  const sold = Math.max(0, t.sold)
  const held = Math.max(0, t.reserved ?? 0)
  const left = Math.max(0, cap - sold - held)
  const rate = cap > 0 ? Math.min(100, Math.round((sold / cap) * 100)) : 0
  const base = { sold, held, left, rate }
  // épuisé : tout est vendu
  if (cap > 0 && sold >= cap) return { ...base, label: 'Épuisé', tone: 'alert' }
  // capacité atteinte : plus de place libre, mais des réservations sont en cours
  if (cap > 0 && left === 0) return { ...base, label: 'Complet (réservations en cours)', tone: 'alert' }
  // presque épuisé : 10 % de la capacité ou moins
  if (cap > 0 && left <= Math.max(1, Math.ceil(cap * 0.1))) return { ...base, label: 'Presque épuisé', tone: 'warn' }
  return { ...base, label: '', tone: 'ok' }
}
