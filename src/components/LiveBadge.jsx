import { useEffect, useState } from 'react'

/**
 * LiveBadge — chunky "LIVE · 3s ago" pill with a bouncy refresh button.
 * The dot has a satisfying "ping" loop, and the whole pill hops on mount.
 */
export default function LiveBadge({ fetchedAt, onRefresh, isRefreshing, source = 'api' }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  const isLive = source === 'api' || source === 'cache'
  const ago = fetchedAt ? Math.max(0, Math.round((now - fetchedAt) / 1000)) : null
  const label = isLive
    ? ago == null
      ? 'just now'
      : ago < 5
      ? 'just now'
      : ago < 60
      ? `${ago}s ago`
      : ago < 3600
      ? `${Math.round(ago / 60)}m ago`
      : `${Math.round(ago / 3600)}h ago`
    : 'demo data'

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-line dark:border-line-dark bg-canvas/70 dark:bg-canvas-dark/70 backdrop-blur px-2.5 py-1 text-[11px] font-semibold animate-[punchIn_350ms_ease-out]"
    >
      {isLive ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
          <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
      )}
      <span className={isLive ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>
        {isLive ? 'LIVE' : 'DEMO'}
      </span>
      <span className="text-line dark:text-line-dark">·</span>
      <span className="text-muted dark:text-muted-dark font-medium">{label}</span>
      {onRefresh && (
        <>
          <span className="text-line dark:text-line-dark">·</span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1 text-ink/70 hover:text-accent dark:text-ink-dark/70 dark:hover:text-accent disabled:opacity-50 transition-colors"
            aria-label="Refresh data"
          >
            <svg
              viewBox="0 0 24 24"
              className={['h-3 w-3', isRefreshing ? 'animate-spin' : ''].join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            <span>refresh</span>
          </button>
        </>
      )}
    </div>
  )
}
