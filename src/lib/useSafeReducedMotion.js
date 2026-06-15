import { useState, useEffect } from 'react'

export function useSafeReducedMotion() {
  const [shouldReduce, setShouldReduce] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    
    const handleChange = () => {
      setShouldReduce(mediaQuery.matches)
    }

    try {
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange)
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleChange)
      }
    } catch (e) {
      // Catch exceptions thrown by older or custom matchMedia implementations.
    }

    return () => {
      try {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleChange)
        } else if (mediaQuery.removeListener) {
          mediaQuery.removeListener(handleChange)
        }
      } catch (e) {
        // Gracefully swallow cleanup exceptions.
      }
    }
  }, [])

  return shouldReduce
}
