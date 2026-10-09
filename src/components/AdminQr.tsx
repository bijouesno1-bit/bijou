import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { card, btn, btnGold, input } from '../lib/ui'

const APP_URL = 'https://bijouesno1-bit.github.io/bijou/'

// Formats recommandés : taille de la page et du QR (cm). Le QR garde toujours une marge blanche.
const FORMATS = [
  { id: 'sticker', label: 'Autocollant 5 × 5 cm', w: 5, h: 5, qr: 4.2, hint: "À coller près d'une caisse, scan de près (30 cm)." },
  { id: 'carte', label: 'Carte / flyer 8 × 8 cm', w: 8, h: 8, qr: 7, hint: 'Distribution à la main, scan à 50 cm.' },
  { id: 'a6', label: 'A6 (10,5 × 14,8 cm)', w: 10.5, h: 14.8, qr: 8.5, hint: 'Tract ou comptoir, scan à 1 m.' },
  { id: 'a5', label: 'A5 (14,8 × 21 cm)', w: 14.8, h: 21, qr: 12, hint: 'Vitrine ou mur, scan à 1,5 m.' },
  { id: 'a4', label: 'A4 (21 × 29,7 cm) affiche', w: 21, h: 29.7, qr: 17, hint: "Affiche d'entrée, scan jusqu'à 2 m." },
]

type Ev = { id: string; title: string }

const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

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
    try { save(await QRCode.toDataURL(url, { width: 1200, margin: 4, errorCorrectionLevel: 'M' }), 'bijou-qr-' + slug + '.png'); setMsg('') }
    catch { setMsg('Téléchargement impossible.') }
  }

  function vector() {
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const u = URL.createObjectURL(blob)
    save(u, 'bijou-qr-' + slug + '.svg')
    setTimeout(() => URL.revokeObjectURL(u), 2000)
  }

  async function copy() {
    try { await navigator.clipboard.writeText(url); setMsg('Lien copié.') } catch { setMsg(url) }
  }

  function print() {
    const w = window.open('', '_blank')
    if (!w) { setMsg('Autorise les fenêtres pop-up pour imprimer, ou télécharge le PNG.'); return }
    const big = f.w >= 9
    const unit = f.w / 21
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
@page{size:${f.w}cm ${f.h}cm;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#201820;font-family:Georgia,serif}
.p{width:${f.w}cm;height:${f.h}cm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${(0.5 * unit).toFixed(2)}cm;text-align:center;padding:0.3cm;overflow:hidden}
.p svg{width:${f.qr}cm;height:${f.qr}cm;display:block}
h1{margin:0;font-size:${(1.6 * Math.max(unit, 0.5)).toFixed(2)}cm;letter-spacing:.15em;line-height:1.1}
p{margin:0;font-size:${(0.7 * Math.max(unit, 0.5)).toFixed(2)}cm;line-height:1.2}
</style></head><body><div class="p">
${big ? `<h1>${esc(title)}</h1>` : ''}
${svg}
${big ? `<p>${esc(sub)}</p><p>BIJOU · billetterie sécurisée</p>` : ''}
</div></body></html>`)
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
      <p className="text-xs text-bijou-silver">{f.hint} QR de {f.qr} cm, marge blanche incluse.</p>
      <div className="mx-auto bg-white rounded-lg p-1 w-48 h-48" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="text-xs text-bijou-silver break-all text-center">{url}</p>
      <button className={btnGold} onClick={print}>Imprimer ({f.label})</button>
      <div className="flex gap-2">
        <button className={btn + ' flex-1'} onClick={png}>PNG</button>
        <button className={btn + ' flex-1'} onClick={vector} disabled={!svg}>SVG</button>
        <button className={btn + ' flex-1'} onClick={copy}>Copier</button>
      </div>
      {msg && <p className="text-sm text-bijou-goldlight break-all">{msg}</p>}
    </div>
  )
}
