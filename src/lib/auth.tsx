import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

type Profile = { role?: string; active?: boolean; photoUrl?: string; name?: string; category?: string; phone?: string; ownerId?: string; eventId?: string; gateIds?: string[] } | null
type Ctx = {
  user: User | null
  profile: Profile
  isAdmin: boolean
  isStaff: boolean
  isOrganizer: boolean
  signUp: (email: string, pwd: string, name: string, category: string, phone: string) => Promise<void>
  loading: boolean
  login: (email: string, pwd: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  setPhoto: (url: string) => Promise<void>
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
  const isOrganizer = profile?.role === 'organizer' && profile?.active === true
  const signUp = async (email: string, pwd: string, name: string, category: string, phone: string) => {
    const em = email.trim().toLowerCase()
    const c = await createUserWithEmailAndPassword(auth, em, pwd)
    await setDoc(doc(db, 'users', c.user.uid), { role: 'organizer', active: true, email: em, name: name.trim(), category, phone: phone.trim(), createdAt: serverTimestamp() })
    const s = await getDoc(doc(db, 'users', c.user.uid))
    setProfile(s.data() as Profile)
  }
  const login = async (email: string, pwd: string) => { await signInWithEmailAndPassword(auth, email, pwd) }
  const logout = async () => { await signOut(auth) }
  const resetPassword = async (email: string) => { await sendPasswordResetEmail(auth, email) }
  const setPhoto = async (url: string) => {
    if (!user) throw new Error('Non connecté')
    await updateDoc(doc(db, 'users', user.uid), { photoUrl: url })
    setProfile(p => ({ ...(p ?? {}), photoUrl: url }))
  }

  return <AuthCtx.Provider value={{ user, profile, isAdmin, isStaff, isOrganizer, signUp, loading, login, logout, resetPassword, setPhoto }}>{children}</AuthCtx.Provider>
}
