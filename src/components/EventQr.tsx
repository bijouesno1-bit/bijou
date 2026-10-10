import { useState } from 'react'
import QRCode from 'qrcode'
import { btn, input } from '../lib/ui'

type E = { id?: string; title?: string; date?: string; venue?: string; city?: string; description?: string }
type Fmt = 'simple' | 'affiche'

function when(d?: string) {
  if (!d) return ''
  const x = new Date(d)
  if (isNaN(x.getTime())) return d
  return x.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' à ' + x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = []
  for (const para of text.split(/\r?\n/)) {
    let line = ''
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const t = line ? line + ' ' + w : w
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w } else line = t
    }
    out.push(line)
  }
  return out
}

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
}

async function poster(e: E, link: string, fmt: Fmt): Promise<HTMLCanvasElement> {
  const W = 2480, H = 3508
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('canvas')
  const qrImg = await loadImg(await QRCode.toDataURL(link, { width: 1000, margin: 1, errorCorrectionLevel: 'M' }))
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'

  if (fmt === 'simple') {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
    const S = 1700, qx = (W - S) / 2, qy = (H - S) / 2 - 140
    ctx.drawImage(qrImg, qx, qy, S, S)
    let y = qy + S + 130
    ctx.fillStyle = '#201820'; ctx.font = 'bold 70px Georgia, serif'
    for (const l of wrap(ctx, (e.title ?? '').trim() || 'Événement', 2000).slice(0, 2)) { ctx.fillText(l, W / 2, y); y += 84 }
    ctx.fillStyle = '#777'; ctx.font = '34px Georgia, serif'
    ctx.fillText(link, W / 2, y + 30, 2100)
    return c
  }

  ctx.fillStyle = '#FFF9F2'; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#D4AF37'; ctx.lineWidth = 14; ctx.strokeRect(80, 80, W - 160, H - 160)
  ctx.lineWidth = 4; ctx.strokeRect(115, 115, W - 230, H - 230)
  ctx.fillStyle = '#B8941F'; ctx.font = 'bold 84px Georgia, serif'
  ctx.fillText('B I J O U', W / 2, 300)
  ctx.fillStyle = '#201820'; ctx.font = 'bold 150px Georgia, serif'
  let y = 520
  for (const l of wrap(ctx, (e.title ?? '').trim() || 'Événement', 2000).slice(0, 3)) { ctx.fillText(l, W / 2, y); y += 175 }
  ctx.fillStyle = '#444'; ctx.font = '64px Georgia, serif'
  const d = when(e.date)
  if (d) { ctx.fillText(d, W / 2, y + 10); y += 95 }
  const place = [e.venue, e.city].filter(Boolean).join(', ')
  if (place) { ctx.fillText(place, W / 2, y + 10); y += 95 }
  const S = 1350, qx = (W - S) / 2, qy = y + 50
  ctx.fillStyle = '#fff'; ctx.fillRect(qx - 30, qy - 30, S + 60, S + 60)
  ctx.drawImage(qrImg, qx, qy, S, S)
  y = qy + S + 110
  ctx.fillStyle = '#201820'; ctx.font = 'bold 60px Georgia, serif'
  for (const l of wrap(ctx, "Scannez pour consulter l'événement et réserver votre billet", 2000)) { ctx.fillText(l, W / 2, y); y += 72 }
  const desc = (e.description ?? '').trim()
  if (desc) {
    ctx.fillStyle = '#333'; ctx.font = '44px Georgia, serif'
    y += 40
    const max = Math.max(0, Math.floor((H - 260 - y) / 58))
    const lines = wrap(ctx, desc, 1950)
    const shown = lines.slice(0, max)
    if (lines.length > max && shown.length > 0) shown[shown.length - 1] = shown[shown.length - 1].replace(/\s*\S*$/, '') + '…'
    for (const l of shown) { ctx.fillText(l, W / 2, y); y += 58 }
  }
  ctx.fillStyle = '#777'; ctx.font = '34px Georgia, serif'
  ctx.fillText(link, W / 2, H - 150, 2100)
  return c
}

function pdfOf(jpeg: Uint8Array, w: number, h: number): Blob {
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  const off: number[] = []
  let len = 0
  const push = (b: Uint8Array | string) => { const u = typeof b === 'string' ? enc.encode(b) : b; parts.push(u); len += u.length }
  const obj = (n: number, body: string) => { off[n] = len; push(n + ' 0 obj\n' + body + '\nendobj\n') }
  push('%PDF-1.4\n')
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>')
  const cs = 'q 595.28 0 0 841.89 0 0 cm /Im0 Do Q'
  obj(4, '<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream')
  off[5] = len
  push('5 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + w + ' /Height ' + h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpeg.length + ' >>\nstream\n')
  push(jpeg)
  push('\nendstream\nendobj\n')
  const xref = len
  let x = 'xref\n0 6\n0000000000 65535 f \n'
  for (let i = 1; i <= 5; i++) x += String(off[i]).padStart(10, '0') + ' 00000 n \n'
  push(x + 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF')
  const all = new Uint8Array(len)
  let p = 0
  for (const u of parts) { all.set(u, p); p += u.length }
  return new Blob([all.buffer as ArrayBuffer], { type: 'application/pdf' })
}

function save(href: string, name: string) {
  const a = document.createElement('a')
  a.href = href; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
}

export function EventQr({ ev }: { ev: unknown }) {
  const e = ev as E
  const [fmt, setFmt] = useState<Fmt>('affiche')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const link = window.location.origin + window.location.pathname + '#/reserver?evenement=' + (e.id ?? '')
  const slug = ((e.title ?? '').normalize('NFD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)) || 'evenement'
  const pre = (fmt === 'simple' ? 'qr-' : 'affiche-qr-') + slug

  async function run(kind: 'pdf' | 'png' | 'print') {
    setMsg(''); setBusy(true)
    try {
      const c = await poster(e, link, fmt)
      if (kind === 'png') save(c.toDataURL('image/png'), pre + '.png')
      else if (kind === 'pdf') {
        const bin = atob(c.toDataURL('image/jpeg', 0.92).split(',')[1])
        const u = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i)
        const url = URL.createObjectURL(pdfOf(u, c.width, c.height))
        save(url, pre + '.pdf')
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      } else {
        const w = window.open('', '_blank')
        if (!w) { setMsg('Fenêtre bloquée : utilisez « Télécharger le PDF ».'); setBusy(false); return }
        w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>QR</title><style>@page{size:A4;margin:0}body{margin:0}img{width:100%;display:block}</style></head><body><img src="' + c.toDataURL('image/jpeg', 0.92) + '"><script>window.onload=function(){setTimeout(function(){window.print()},400)}</script></body></html>')
        w.document.close()
      }
    } catch { setMsg("Génération impossible.") }
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-bijou-silver">QR de l'événement (A4)</p>
      <select className={input} value={fmt} onChange={ev2 => setFmt(ev2.target.value as Fmt)}>
        <option value="simple">QR simple (QR + titre en petit)</option>
        <option value="affiche">Affiche complète (titre, infos, description)</option>
      </select>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} disabled={busy} onClick={() => run('pdf')}>Télécharger le PDF</button>
        <button type="button" className={btn} disabled={busy} onClick={() => run('png')}>Image PNG</button>
        <button type="button" className={btn} disabled={busy} onClick={() => run('print')}>Imprimer</button>
      </div>
      {msg && <p className="text-bijou-alert text-xs">{msg}</p>}
    </div>
  )
}
