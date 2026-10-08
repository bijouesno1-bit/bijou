export const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  refused: 'Refusée',
  info_needed: 'Informations demandées',
  paid: 'Paiement confirmé, billets émis',
}
export const PAY_LABEL: Record<string, string> = {
  cash: 'Espèces',
  virement: 'Virement bancaire',
  airtel: 'Airtel Money',
  moov: 'Moov Money',
  autre: 'Autre',
}
export const refOf = (id: string) => 'BJ-' + id.slice(0, 6).toUpperCase()
