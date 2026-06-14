// Small formatting helpers, kept here so components stay focused on layout.

export const compactNumber = (n) => {
  if (n == null || isNaN(n)) return '—'
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (Math.abs(n) >= 10_000) return (n / 1000).toFixed(0) + 'k'
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return n.toLocaleString('en-US')
}

export const formatRating = (n) => {
  if (n == null) return '—'
  return Math.round(n).toLocaleString('en-US')
}

export const formatPercent = (n, digits = 0) => {
  if (n == null || isNaN(n)) return '—'
  return `${(n * 100).toFixed(digits)}%`
}

export const formatStreak = ({ sign, count }) => {
  if (!count || !sign) return '—'
  const arrow = sign === 'W' ? '▲' : sign === 'L' ? '▼' : '–'
  return `${arrow} ${sign === 'W' ? '+' : sign === 'L' ? '−' : ''}${count}`
}
