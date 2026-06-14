import { useState, useEffect } from 'react'

export function useIsDark() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  })

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    // Initialize again in case class list changed before hook mount
    setIsDark(document.documentElement.classList.contains('dark'))
    return () => observer.disconnect()
  }, [])

  return isDark
}
