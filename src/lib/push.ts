import { getApp } from 'firebase/app'
import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const VAPID = 'BF17AK1owQ2iyvASdzoVFUoFW-jhRKkti3MM3V7f8GaZT97AoiJNXxBiBPYR-7Z-5Vbox0c9dJZb7kGyUgGZMYk'
const RELAY = 'https://lively-dream-8d7dbijou-relais.bijouesno1.workers.dev'
const KEY = 'push_token'

const wait = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])

export async function pushSupported(): Promise<boolean> {
  try { return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window && (await isSupported()) } catch { return false }
}
async function currentToken(): Promise<string> {
  const reg = await wait(navigator.serviceWorker.ready, 5000)
  return (await getToken(getMessaging(getApp()), { vapidKey: VAPID, serviceWorkerRegistration: reg })) || ''
}
async function save(uid: string, token: string) {
  await setDoc(doc(db, 'pushTokens', token), { uid, createdAt: serverTimestamp() })
  try { localStorage.setItem(KEY, token) } catch { /* ignore */ }
}
export async function enablePush(uid: string): Promise<'on' | 'denied' | 'error'> {
  try {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return 'denied'
    const token = await currentToken()
    if (!token) return 'error'
    await save(uid, token)
    return 'on'
  } catch { return 'error' }
}
export async function syncPush(uid: string) {
  try {
    if (Notification.permission !== 'granted') return
    const token = await currentToken()
    if (token) await save(uid, token)
  } catch { /* ignore */ }
}
export async function disablePush() {
  try {
    const token = localStorage.getItem(KEY)
    if (token) { await wait(deleteDoc(doc(db, 'pushTokens', token)), 2000); localStorage.removeItem(KEY) }
  } catch { /* ignore */ }
}
export function pingRelay(path: '/notify-request' | '/notify-event', id: string) {
  try {
    void fetch(RELAY + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }), keepalive: true }).catch(() => { /* ignore */ })
  } catch { /* ignore */ }
}
