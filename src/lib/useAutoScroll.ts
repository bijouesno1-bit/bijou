import { useEffect, type RefObject } from 'react'

// Défilement horizontal automatique.
// Un toucher / clic / molette arrête tout ; 10 s sans interaction, ça repart.
export function useAutoScroll(ref: RefObject<HTMLDivElement | null>, active: boolean, speed = 50, idleMs = 10000) {
  useEffect(() => {
    const el = ref.current
    if (!el || !active) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    let timer = 0
    let paused = false
    let last = 0
    let pos = el.scrollLeft

    const tick = (t: number) => {
      const dt = last ? Math.min(t - last, 64) : 0
      last = t
      const max = el.scrollWidth - el.clientWidth
      if (!paused && max > 0) {
        pos += (speed * dt) / 1000
        if (pos >= max) pos = 0
        el.scrollLeft = pos
      }
      raf = requestAnimationFrame(tick)
    }

    const touch = () => {
      paused = true
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        pos = el.scrollLeft
        last = 0
        paused = false
      }, idleMs)
    }

    const evts = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'wheel'] as const
    evts.forEach(e => el.addEventListener(e, touch, { passive: true }))
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
      evts.forEach(e => el.removeEventListener(e, touch))
    }
  }, [ref, active, speed, idleMs])
}
