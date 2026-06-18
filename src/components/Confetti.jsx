import { useEffect, useRef, memo } from 'react'
import confetti from 'canvas-confetti'

/**
 * Confetti — fires a canvas-based burst whenever `trigger` changes.
 * Uses the chess-themed accent palette and supports reduced motion.
 */
const COLORS = ['#C96442', '#1F1E1B', '#E8B23A', '#7BAE7F', '#D67A5C', '#2C2A26', '#5A8FBF', '#D17BB0']

export default memo(function Confetti({ trigger = 0 }) {
  const prevTrigger = useRef(0)

  // Clean up the global canvas-confetti canvas on unmount
  useEffect(() => {
    return () => confetti.reset()
  }, [])

  useEffect(() => {
    if (!trigger || trigger === prevTrigger.current) return
    prevTrigger.current = trigger

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    // Fire a dual burst (left + right) for a celebratory feel
    const defaults = {
      particleCount: 40,
      spread: 70,
      colors: COLORS,
      ticks: 100,
      gravity: 1.2,
      scalar: 0.9,
      shapes: ['square', 'circle'],
      disableForReducedMotion: true,
    }

    confetti({ ...defaults, angle: 60, origin: { x: 0.3, y: 0.6 } })
    confetti({ ...defaults, angle: 120, origin: { x: 0.7, y: 0.6 } })

    // Bonus star-like burst from center
    const timerId = setTimeout(() => {
      confetti({
        particleCount: 20,
        spread: 100,
        startVelocity: 35,
        colors: COLORS,
        origin: { x: 0.5, y: 0.5 },
        ticks: 80,
        shapes: ['star'],
        scalar: 1.1,
        disableForReducedMotion: true,
      })
    }, 150)

    return () => clearTimeout(timerId)
  }, [trigger])

  // canvas-confetti renders to a global <canvas>, no DOM nodes needed
  return null
})
