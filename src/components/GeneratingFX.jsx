import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * GeneratingFX — chess-themed loading state with Framer Motion animations.
 *   - Two orbiting pieces + a hopping knight
 *   - Pulsing concentric rings
 *   - Step text that cycles
 *   - Live API call log
 */
const DEFAULT_STEPS = [
  'Connecting to server…',
  'Authenticating…',
  'Fetching profile…',
  'Pulling stats…',
  'Crunching numbers…',
  'Composing your card…',
]

const LABELS = {
  profile: 'Fetching profile',
  stats: 'Fetching stats',
  games: 'Fetching recent games',
}

export default function GeneratingFX({ events = [] }) {
  const reduce = useReducedMotion()
  const [fallback, setFallback] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setFallback((s) => (s + 1) % DEFAULT_STEPS.length), 1100)
    return () => window.clearInterval(id)
  }, [])

  const lastEvent = events[events.length - 1]
  const statusText = lastEvent
    ? lastEvent.status === 'error'
      ? `Couldn't reach ${lastEvent.label}… retrying`
      : `${LABELS[lastEvent.label] || lastEvent.label}…`
    : DEFAULT_STEPS[fallback]

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-8 w-[440px] max-w-full min-w-0 mx-auto">
      <div className="relative h-44 w-44 shrink-0 grid place-items-center mx-auto" style={{ contain: 'layout' }}>
        {/* Pulsing rings */}
        {[0, 1, 2].map((i) => {
          const ringBorders = [
            'border-accent/30 dark:border-accent/40',
            'border-accent/25 dark:border-accent/30',
            'border-accent/20 dark:border-accent/20',
          ];
          return (
            <motion.div
              key={i}
              className={`absolute rounded-full border-2 ${ringBorders[i]}`}
              style={{ inset: `${i * 12}px` }}
              animate={reduce ? {} : { scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
            />
          );
        })}

        {/* Orbit ring */}
        <motion.div
          className="absolute inset-10 rounded-full border-2 border-dashed border-muted/50 dark:border-muted-dark/50"
          animate={reduce ? {} : { rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          style={{ willChange: 'transform' }}
        />

        {/* Center node with hopping knight */}
        <div className="relative h-14 w-14 rounded-full bg-ink text-canvas dark:bg-ink-dark dark:text-canvas-dark grid place-items-center font-serif text-3xl shadow-[0_4px_0_0_rgba(28,25,23,0.85),0_8px_18px_-4px_rgba(28,25,23,0.4)]">
          <motion.span
            className="inline-block"
            animate={reduce ? {} : {
              y: [0, -8, 0, -2, 0],
              scaleX: [1, 0.96, 1.08, 0.98, 1],
              scaleY: [1, 1.1, 0.92, 1.02, 1],
            }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
          >
            ♞
          </motion.span>
        </div>

        {/* Orbiting rook */}
        <motion.div
          className="absolute inset-0"
          animate={reduce ? {} : { rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          style={{ willChange: 'transform' }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-canvas dark:bg-canvas-dark border-2 border-line dark:border-line-dark grid place-items-center text-xl font-serif shadow-[0_3px_0_0_rgba(28,25,23,0.1),0_4px_10px_-2px_rgba(28,25,23,0.15)]">
            ♜
          </div>
        </motion.div>

        {/* Orbiting bishop (reverse) */}
        <motion.div
          className="absolute inset-3"
          animate={reduce ? {} : { rotate: -360 }}
          transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
          style={{ willChange: 'transform' }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-canvas dark:bg-canvas-dark border-2 border-line dark:border-line-dark grid place-items-center text-base font-serif shadow-[0_3px_0_0_rgba(28,25,23,0.1),0_4px_10px_-2px_rgba(28,25,23,0.15)]">
            ♝
          </div>
        </motion.div>
      </div>

      <div className="text-center space-y-1.5">
        <div className="font-serif text-lg tracking-tight font-semibold">
          Generating your stat card
        </div>
        <motion.div
          key={statusText}
          className="text-[12.5px] text-muted dark:text-muted-dark min-h-[16px]"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
        >
          {statusText}
        </motion.div>
      </div>

      {/* Live API call log */}
      {events.length > 0 && (
        <div className="w-full max-w-sm rounded-xl border-2 border-line dark:border-line-dark bg-canvas/60 dark:bg-canvas-dark/60 backdrop-blur overflow-hidden shadow-[0_4px_0_0_rgba(28,25,23,0.05)]">
          <div className="px-3 py-1.5 border-b-2 border-line dark:border-line-dark text-[10.5px] uppercase tracking-[0.08em] text-muted dark:text-muted-dark font-semibold flex items-center justify-between">
            <span>API call log</span>
            <span className="font-mono normal-case tracking-normal">
              {events.length} call{events.length === 1 ? '' : 's'}
            </span>
          </div>
          <ul className="px-3 py-2 font-mono text-[10.5px] leading-relaxed space-y-1 max-h-28 overflow-auto">
            {events.map((e, i) => (
              <motion.li
                key={i}
                className="flex items-center gap-2 text-muted dark:text-muted-dark"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <span
                  className={[
                    'inline-block h-1.5 w-1.5 rounded-full shrink-0',
                    e.status === 'ok'
                      ? e.via === 'proxy'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                      : e.status === 'error'
                      ? 'bg-rose-500'
                      : 'bg-muted/40 animate-pulse',
                  ].join(' ')}
                />
                <span className="truncate flex-1">
                  <span className="text-ink dark:text-ink-dark">{e.label}</span>
                  <span className="text-line dark:text-line-dark"> · </span>
                  <span className="text-muted dark:text-muted-dark">{prettyUrl(e.url)}</span>
                </span>
                {e.latencyMs != null && (
                  <span className="text-ink/70 dark:text-ink-dark/70 tabular-nums">{e.latencyMs}ms</span>
                )}
                {e.via === 'proxy' && (
                  <span className="text-amber-600 dark:text-amber-400 text-[9px] uppercase">proxy</span>
                )}
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-1 w-6 rounded-full bg-chip dark:bg-chip-dark overflow-hidden">
            <motion.span
              className="block h-full bg-ink dark:bg-ink-dark"
              animate={reduce ? {} : { x: ['-100%', '0%', '100%'] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.2, ease: [0.65, 0, 0.35, 1] }}
            />
          </span>
        ))}
      </div>
    </div>
  )
}

function prettyUrl(u) {
  if (!u) return ''
  try {
    const url = new URL(u)
    return url.hostname.replace('www.', '') + url.pathname.replace(/\?.*$/, '')
  } catch {
    return u
  }
}
