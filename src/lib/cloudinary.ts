// Envoi non signé vers Cloudinary : aucun secret dans l'application.
const CLOUD = 'aj0kawm2'
const PRESET = 'bijou-profils'
const MAX_BYTES = 2000000

// Version réduite et recadrée en carré, servie par Cloudinary.
export function thumb(url: string, size = 96) {
  return url.includes('/upload/') ? url.replace('/upload/', '/upload/c_fill,g_auto,w_' + size + ',h_' + size + ',f_auto,q_auto/') : url
}

async function square(file: File, side = 512): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const s = Math.min(bmp.width, bmp.height)
  const c = document.createElement('canvas')
  c.width = side
  c.height = side
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Image non traitable.')
  ctx.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, side, side)
  return new Promise((ok, ko) => c.toBlob(b => (b ? ok(b) : ko(new Error('Image non traitable.'))), 'image/jpeg', 0.85))
}

export async function uploadProfile(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Format accepté : JPG, PNG ou WebP.')
  if (file.size > 10000000) throw new Error('Image trop lourde (10 Mo maximum).')
  const blob = await square(file)
  if (blob.size > MAX_BYTES) throw new Error('Image trop lourde après compression (2 Mo maximum).')
  const fd = new FormData()
  fd.append('file', blob, 'profil.jpg')
  fd.append('upload_preset', PRESET)
  const r = await fetch('https://api.cloudinary.com/v1_1/' + CLOUD + '/image/upload', { method: 'POST', body: fd })
  const j = (await r.json().catch(() => ({}))) as { secure_url?: string }
  if (!r.ok || !j.secure_url) throw new Error("Envoi refusé par le service d'images.")
  return j.secure_url
}

// Affiches : on garde les proportions, largeur max 1200 px, 2 Mo maximum.
export function posterUrl(url: string, width = 800) {
  return url.includes('/upload/') ? url.replace('/upload/', '/upload/c_limit,w_' + width + ',f_auto,q_auto/') : url
}

async function fitWidth(file: File, max = 1200): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, max / bmp.width)
  const w = Math.round(bmp.width * k)
  const h = Math.round(bmp.height * k)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Image non traitable.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bmp, 0, 0, w, h)
  for (const q of [0.85, 0.7, 0.55]) {
    const b = await new Promise<Blob | null>(ok => c.toBlob(ok, 'image/jpeg', q))
    if (b && b.size <= MAX_BYTES) return b
  }
  throw new Error('Image trop lourde après compression (2 Mo maximum).')
}

export async function uploadPoster(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Format accepté : JPG, PNG ou WebP.')
  if (file.size > 15000000) throw new Error('Image trop lourde (15 Mo maximum).')
  const blob = await fitWidth(file)
  const fd = new FormData()
  fd.append('file', blob, 'affiche.jpg')
  fd.append('upload_preset', PRESET)
  const r = await fetch('https://api.cloudinary.com/v1_1/' + CLOUD + '/image/upload', { method: 'POST', body: fd })
  const j = (await r.json().catch(() => ({}))) as { secure_url?: string }
  if (!r.ok || !j.secure_url) throw new Error("Envoi refusé par le service d'images.")
  return j.secure_url
}
