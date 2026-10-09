export type Pal = [string, string, string, string]
export const PAL: Record<string, Pal> = {
  'Réserver un billet': ['#f7e08a', '#d4af37', '#8a6d12', '#111111'],
  'Comment ça marche': ['#cfe3f7', '#4a7fb5', '#1f3f66', '#ffffff'],
  'Publier mon événement': ['#9be8c2', '#1f9d6a', '#0b4f35', '#ffffff'],
  'Devenir organisateur': ['#f2c3a0', '#c0693a', '#6e3418', '#ffffff'],
  "Contrôle d'accès (agents)": ['#ffffff', '#b8bec6', '#6b727c', '#111111'],
  'Espace administrateur': ['#e2c8f5', '#8e4bbf', '#46206b', '#ffffff'],
}
export function chrome(label: string): React.CSSProperties {
  const p = PAL[label]
  if (!p) return {}
  return {
    background: `linear-gradient(180deg, ${p[0]} 0%, ${p[1]} 55%, ${p[2]} 100%)`,
    color: p[3],
    borderColor: p[2],
    fontWeight: 700,
  }
}

export function chromeBorder(label: string): React.CSSProperties {
  const p = PAL[label]
  if (!p) return {}
  return { borderColor: p[1], borderWidth: 2 }
}

export const MENU_COLORS: Record<string, string> = {
  'Accueil': '#e8d9a0',
  'Se connecter': '#e05a5a',
  'Événements à venir': '#2bb5c4',
  'Réserver un billet': '#d4af37',
  'Où obtenir mes billets': '#e0709e',
  'Comment ça marche': '#4a7fb5',
  'À propos': '#8fb83a',
  'Publier mon événement': '#1f9d6a',
  'Devenir organisateur': '#c0693a',
  "Contrôle d'accès (agents)": '#b8bec6',
  'Espace administrateur': '#8e4bbf',
}
export function menuBorder(label: string): React.CSSProperties {
  const c = MENU_COLORS[label]
  return c ? { borderColor: c, borderWidth: 2 } : {}
}
