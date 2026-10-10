import { getApps, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'
import { firebaseConfig } from './firebase'

// Clé d'annuaire : e-mail en minuscules, ou téléphone en chiffres (préfixe 241).
export function agentKey(raw: string): string {
  const s = raw.trim()
  if (s.includes('@')) return s.toLowerCase()
  let d = s.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length <= 9) d = '241' + d.replace(/^0+/, '')
  return d
}

// Crée le compte de connexion de l'agent sans déconnecter l'organisateur.
export async function createAgentAccount(pwd: string): Promise<{ uid: string; authEmail: string }> {
  const authEmail = 'ag-' + crypto.randomUUID().replace(/-/g, '').slice(0, 16) + '@agents.bijou.app'
  const sa = getAuth(getApps().find(a => a.name === 'agents') ?? initializeApp(firebaseConfig, 'agents'))
  try {
    const c = await createUserWithEmailAndPassword(sa, authEmail, pwd)
    return { uid: c.user.uid, authEmail }
  } finally {
    try { await signOut(sa) } catch { /* ignoré */ }
  }
}
