import { useCallback, useEffect, useRef, type RefObject } from 'react'

// Défilement horizontal automatique avec "stop and go" et boucle infinie.
// - loop = nombre d'éléments d'origine : la liste est rendue 3 fois et on reste dans la série du milieu,
//   ce qui donne 1,2,3…8,1,2,3…8 sans retour en arrière visible.
// - Glissement / molette : pause, et ça repart après 10 s sans interaction.
// - toggle() : 1er appel = centre l'affiche la plus visible et fige ; 2e = repart ; 3e = fige.
export function useAutoScroll(ref: RefObject<HTMLDivElement | null>, active: boolean, speed = 50, idleMs = 10000, loop = 0) {
  const ctl = useRef({ frozen: false, freeze: () => {}, resume: () => {} })

  useEffect(() => {
    const el = ref.current
    const c = ctl.current
    c.frozen = false
    if (!el || !active) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let timer = 0
    let paused = false
    let last = 0
    let period = 0

    const measure = () => {
      period = 0
      if (loop > 0 && el.children.length >= loop * 3) {
        const a = el.children[0] as HTMLElement
        const b = el.children[loop] as HTMLElement
        period = b.offsetLeft - a.offsetLeft
      }
    }
    const wrap = () => {
      if (period <= 0) return
      const sl = el.scrollLeft
      if (sl >= 2 * period) el.scrollLeft = sl - period
      else if (sl < period) el.scrollLeft = sl + period
    }

    measure()
    wrap()
    let pos = el.scrollLeft

    const tick = (t: number) => {
      const dt = last ? Math.min(t - last, 64) : 0
      last = t
      if (!paused && !c.frozen) {
        if (period > 0) {
          pos += (speed * dt) / 1000
          if (pos >= 2 * period) pos -= period
          el.scrollLeft = pos
        } else {
          const max = el.scrollWidth - el.clientWidth
          if (max > 0) {
            pos += (speed * dt) / 1000
            if (pos >= max) pos = 0
            el.scrollLeft = pos
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }

    const touch = () => {
      if (c.frozen) return
      paused = true
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        pos = el.scrollLeft
        last = 0
        paused = false
      }, idleMs)
    }

    c.freeze = () => {
      c.frozen = true
      window.clearTimeout(timer)
      const box = el.getBoundingClientRect()
      let best: Element | null = null
      let bestV = -1
      for (const k of Array.from(el.children)) {
        const r = k.getBoundingClientRect()
        const v = Math.min(r.right, box.right) - Math.max(r.left, box.left)
        if (v > bestV) { bestV = v; best = k }
      }
      if (best) {
        const r = best.getBoundingClientRect()
        const delta = r.left + r.width / 2 - (box.left + box.width / 2)
        el.scrollTo({ left: el.scrollLeft + delta, behavior: 'smooth' })
      }
    }

    c.resume = () => {
      c.frozen = false
      paused = false
      window.clearTimeout(timer)
      pos = el.scrollLeft
      last = 0
    }

    const onResize = () => { measure(); wrap(); pos = el.scrollLeft }
    const evts = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'wheel'] as const
    evts.forEach(e => el.addEventListener(e, touch, { passive: true }))
    el.addEventListener('scroll', wrap, { passive: true })
    window.addEventListener('resize', onResize)
    if (!reduced) raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
      evts.forEach(e => el.removeEventListener(e, touch))
      el.removeEventListener('scroll', wrap)
      window.removeEventListener('resize', onResize)
      c.frozen = false
      c.freeze = () => {}
      c.resume = () => {}
    }
  }, [ref, active, speed, idleMs, loop])

  return useCallback(() => {
    const c = ctl.current
    if (c.frozen) c.resume()
    else c.freeze()
  }, [])
}
