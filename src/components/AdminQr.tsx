import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { card, btn, btnGold, input } from '../lib/ui'

const APP_URL = 'https://bijouesno1-bit.github.io/bijou/'
const TEL_TXT = '+241 60 14 19 24'
const MAIL = 'bijouesno1@gmail.com'

// Formats recommandés : page (cm) et taille maximale du QR (cm). Le QR se réduit si le texte manque de place.
type Fmt = { id: string; label: string; w: number; h: number; qr: number; hint: string }
const FORMATS: Fmt[] = [
  { id: 'sticker', label: 'Autocollant 5 × 5 cm', w: 5, h: 5, qr: 3.2, hint: "À coller près d'une caisse, scan de près (30 cm)." },
  { id: 'carte', label: 'Carte / flyer 8 × 8 cm', w: 8, h: 8, qr: 5.5, hint: 'Distribution à la main, scan à 50 cm.' },
  { id: 'a6', label: 'A6 (10,5 × 14,8 cm)', w: 10.5, h: 14.8, qr: 8, hint: 'Tract ou comptoir, scan à 1 m.' },
  { id: 'a5', label: 'A5 (14,8 × 21 cm)', w: 14.8, h: 21, qr: 11, hint: 'Vitrine ou mur, scan à 1,5 m.' },
  { id: 'a4', label: 'A4 (21 × 29,7 cm) affiche', w: 21, h: 29.7, qr: 16, hint: "Affiche d'entrée, scan jusqu'à 2 m." },
]

type Ev = { id: string; title: string }

const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

// Visuel complet : titre, QR, slogan, WhatsApp et e-mail, dans un SVG à l'échelle du format (1 unité = 1 mm).
function poster(qrSvg: string, title: string, sub: string, f: Fmt, w: string, h: string) {
  const W = f.w * 10
  const H = f.h * 10
  const pad = W * 0.05
  const gap = W * 0.035
  const ft = Math.min(W * 0.075, (W * 0.9) / (Math.max(title.length, 1) * 0.8))
  const fs = Math.min(W * 0.04, (W * 0.9) / (Math.max(sub.length, 1) * 0.55))
  const fc = W * 0.042
  const hT = ft * 1.25
  const hS = fs * 1.3
  const hC = fc * 2.6
  const avail = H - 2 * pad - hT - hS - hC - 3 * gap
  const q = Math.max(10, Math.min(f.qr * 10, avail, W - 2 * pad))
  const total = hT + gap + q + gap + hS + gap + hC
  let y = (H - total) / 2
  const yT = y + ft
  y += hT + gap
  const qy = y
  y += q + gap
  const yS = y + fs
  y += hS + gap
  const yC1 = y + fc
  const yC2 = y + fc * 2.3
  const inner = qrSvg.replace('<svg', `<svg x="${(W - q) / 2}" y="${qy}" width="${q}" height="${q}"`)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${w}" height="${h}">`
    + `<rect width="${W}" height="${H}" fill="#ffffff"/>`
    + `<g font-family="Georgia, 'Times New Roman', serif" text-anchor="middle" fill="#201820">`
    + `<text x="${W / 2}" y="${yT}" font-size="${ft}" font-weight="bold" letter-spacing="${ft * 0.12}">${esc(title)}</text>`
    + inner
    + `<text x="${W / 2}" y="${yS}" font-size="${fs}" fill="#555555">${esc(sub)}</text>`
    + `<text x="${W / 2}" y="${yC1}" font-size="${fc}">WhatsApp ${TEL_TXT}</text>`
    + `<text x="${W / 2}" y="${yC2}" font-size="${fc}">${MAIL}</text>`
    + `</g></svg>`
}

export function AdminQr({ events }: { events: Ev[] }) {
  const [target, setTarget] = useState('app')
  const [fmt, setFmt] = useState('a5')
  const [svg, setSvg] = useState('')
  const [msg, setMsg] = useState('')

  const ev = events.find(e => e.id === target)
  const url = ev ? APP_URL + '#/reserver?evenement=' + ev.id : APP_URL
  const title = ev ? ev.title : 'BIJOU'
  const sub = ev ? 'Scannez pour réserver votre billet' : "Le billet authentique, l'entrée sécurisée"
  const f = FORMATS.find(x => x.id === fmt) ?? FORMATS[3]
  const slug = (ev ? ev.title : 'application').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'qr'
  const build = (w: string, h: string) => poster(svg, title, sub, f, w, h)

  useEffect(() => {
    let alive = true
    QRCode.toString(url, { type: 'svg', margin: 4, errorCorrectionLevel: 'M' })
      .then(s => { if (alive) setSvg(s) })
      .catch(() => { if (alive) setSvg('') })
    return () => { alive = false }
  }, [url])

  function save(href: string, name: string) {
    const a = document.createElement('a')
    a.href = href
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function png() {
    try {
      const pw = Math.max(1200, Math.round((f.w / 2.54) * 300))
      const ph = Math.round((pw * f.h) / f.w)
      const img = new Image()
      await new Promise<void>((ok, ko) => {
        img.onload = () => ok()
        img.onerror = () => ko(new Error('image'))
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(build(String(pw), String(ph)))
      })
      const c = document.createElement('canvas')
      c.width = pw
      c.height = ph
      const ctx = c.getContext('2d')
      if (!ctx) throw new Error('canvas')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pw, ph)
      ctx.drawImage(img, 0, 0, pw, ph)
      save(c.toDataURL('image/png'), 'bijou-qr-' + slug + '-' + f.id + '.png')
      setMsg('')
    } catch { setMsg('Téléchargement PNG impossible.') }
  }

  function vector() {
    const blob = new Blob([build(f.w + 'cm', f.h + 'cm')], { type: 'image/svg+xml' })
    const u = URL.createObjectURL(blob)
    save(u, 'bijou-qr-' + slug + '-' + f.id + '.svg')
    setTimeout(() => URL.revokeObjectURL(u), 2000)
  }

  async function copy() {
    try { await navigator.clipboard.writeText(url); setMsg('Lien copié.') } catch { setMsg(url) }
  }

  function print() {
    const w = window.open('', '_blank')
    if (!w) { setMsg('Autorise les fenêtres pop-up pour imprimer, ou télécharge le PNG.'); return }
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>@page{size:${f.w}cm ${f.h}cm;margin:0}html,body{margin:0;padding:0;background:#fff}svg{display:block}</style>
</head><body>${build(f.w + 'cm', f.h + 'cm')}</body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
  }

  return (
    <div className={card}>
      <h2 className="text-bijou-goldlight">Codes QR</h2>
      <select className={input} value={target} onChange={e => setTarget(e.target.value)}>
        <option value="app">Application BIJOU (accueil)</option>
        {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
      </select>
      <select className={input} value={fmt} onChange={e => setFmt(e.target.value)}>
        {FORMATS.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
      </select>
      <p className="text-xs text-bijou-silver">{f.hint}</p>
      <div
        className="mx-auto w-full max-w-[16rem] border border-bijou-silver/40"
        style={{ aspectRatio: f.w + ' / ' + f.h }}
        dangerouslySetInnerHTML={{ __html: svg ? build('100%', '100%') : '' }}
      />
      <p className="text-xs text-bijou-silver break-all text-center">{url}</p>
      <button className={btnGold} onClick={print} disabled={!svg}>Imprimer ({f.label})</button>
      <div className="flex gap-2">
        <button className={btn + ' flex-1'} onClick={png} disabled={!svg}>PNG</button>
        <button className={btn + ' flex-1'} onClick={vector} disabled={!svg}>SVG</button>
        <button className={btn + ' flex-1'} onClick={copy}>Copier</button>
      </div>
      {msg && <p className="text-sm text-bijou-goldlight break-all">{msg}</p>}
    </div>
  )
}
