// Modèles de billet : libellés et styles (page du billet).
// Les billets émis avant l'existence du modèle n'ont pas de champ kind : ils sont classiques.
export const KIND_LABEL: Record<string, string> = {
  classic: 'Classique',
  individual: 'Individuel',
  vip: 'VIP',
  premium: 'Premium',
  group: 'Groupe',
  invitation: 'Invitation',
}

export const KIND_CARD: Record<string, string> = {
  classic: 'border-bijou-gold',
  individual: 'border-bijou-gold',
  premium: 'border-bijou-gold ring-2 ring-bijou-gold/50',
  vip: 'border-bijou-gold ring-4 ring-bijou-gold',
  group: 'border-bijou-gold',
  invitation: 'border-bijou-gold border-dashed',
}

// Les modèles « classique » et « individuel » n'affichent pas de mention particulière.
export const KIND_PLAIN = ['classic', 'individual']
