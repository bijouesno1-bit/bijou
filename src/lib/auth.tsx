import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

type Profile = { role?: string; active?: boolean } | null
type Ctx = {
  user: User | null
  profile: Profile
  isAdmin: boolean
  isStaff: boolean
  loading: boolean
  login: (email: string, pwd: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthCtx = createContext<Ctx>(null as unknown as Ctx)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u)
    if (u) {
      setLoading(true)
      try {
        const s = await getDoc(doc(db, 'users', u.uid))
        setProfile(s.exists() ? (s.data() as Profile) : null)
      } catch { setProfile(null) }
    } else {
      setProfile(null)
    }
    setLoading(false)
  }), [])

  const isAdmin = profile?.role === 'admin' && profile?.active === true
  const isStaff = (profile?.role === 'admin' || profile?.role === 'agent') && profile?.active === true
  const login = async (email: string, pwd: string) => { await signInWithEmailAndPassword(auth, email, pwd) }
  const logout = async () => { await signOut(auth) }
  const resetPassword = async (email: string) => { await sendPasswordResetEmail(auth, email) }

  return <AuthCtx.Provider value={{ user, profile, isAdmin, isStaff, loading, login, logout, resetPassword }}>{children}</AuthCtx.Provider>
}
