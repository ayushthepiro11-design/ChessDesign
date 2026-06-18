import { memo } from 'react'
import { formatPercent } from '../lib/format'
import AnimatedNumber from './AnimatedNumber'

/**
 * Component to render a grid of rating summaries categorized by format.
 */
const ICONS = {
  Rapid: '⚡',
  Blitz: '⏱',
  Bullet: '🚀',
  Daily: '☀',
  Classical: '🏛',
  Correspondence: '✉',
  Chess960: '9',
  UltraBullet: '⚡',
}

const TONE = {
  Rapid:    { shadow: 'hover:shadow-[0_10px_22px_-8px_rgba(234,179,8,0.5)]',  border: 'hover:border-amber-400/70' },
  Blitz:    { shadow: 'hover:shadow-[0_10px_22px_-8px_rgba(249,115,22,0.55)]', border: 'hover:border-orange-400/70' },
  Bullet:   { shadow: 'hover:shadow-[0_10px_22px_-8px_rgba(239,68,68,0.55)]',  border: 'hover:border-rose-400/70' },
  Daily:    { shadow: 'hover:shadow-[0_10px_22px_-8px_rgba(245,158,11,0.5)]',  border: 'hover:border-amber-400/70' },
  Classical:{ shadow: 'hover:shadow-[0_10px_22px_-8px_rgba(139,92,246,0.5)]',  border: 'hover:border-violet-400/70' },
  Correspondence: { shadow: 'hover:shadow-[0_10px_22px_-8px_rgba(20,184,166,0.5)]', border: 'hover:border-teal-400/70' },
  Chess960: { shadow: 'hover:shadow-[0_10px_22px_-8px_rgba(99,102,241,0.5)]',  border: 'hover:border-indigo-400/70' },
  UltraBullet: { shadow: 'hover:shadow-[0_10px_22px_-8px_rgba(244,63,94,0.55)]', border: 'hover:border-rose-400/70' },
}

export default memo(function TimeControlGrid({ perFormat = [], primaryKey, onHover }) {
  if (!perFormat.length) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 min-w-0 w-full">
      {perFormat.map((f, i) => {
        const isPrimary = f.key === primaryKey
        const total = (f.record?.win || 0) + (f.record?.loss || 0) + (f.record?.draw || 0)
        const winRate = total ? (f.record?.win || 0) / total : 0
        const tone = TONE[f.label] || TONE.Blitz
        return (
          <div
            key={f.key}
            onMouseEnter={(e) => {
              if (onHover && f.record) {
                const w = f.record.win || 0
                const l = f.record.loss || 0
                const d = f.record.draw || 0
                if (w || l || d) {
                  onHover(e, `Wins: ${w.toLocaleString()} · Losses: ${l.toLocaleString()} · Draws: ${d.toLocaleString()}`)
                }
              }
            }}
            onMouseMove={(e) => {
              if (onHover && f.record) {
                const w = f.record.win || 0
                const l = f.record.loss || 0
                const d = f.record.draw || 0
                if (w || l || d) {
                  onHover(e, `Wins: ${w.toLocaleString()} · Losses: ${l.toLocaleString()} · Draws: ${d.toLocaleString()}`)
                }
              }
            }}
            onMouseLeave={() => {
              if (onHover) onHover(null, null)
            }}
            className={[
              'min-w-0',
              'relative rounded-xl border p-2 cursor-default',
              'transition-all duration-200 ease-out',
              tone.shadow,
              tone.border,
              isPrimary
                ? 'border-accent/60 bg-accent-soft/45 dark:bg-accent-softDark/45 font-bold shadow-sm'
                : 'border-line dark:border-line-dark bg-chip/5 dark:bg-chip-dark/5',
            ].join(' ')}
            style={{ animation: `punchIn 400ms cubic-bezier(0.2, 0.8, 0.2, 1) ${i * 50}ms backwards` }}
          >
            <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-1.5 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-[9px] min-[400px]:text-[10px] font-bold uppercase tracking-[0.08em] text-muted dark:text-muted-dark">
                  {isPrimary && (
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse shrink-0" title="Primary Format" />
                  )}
                  <span className="truncate">{f.label}</span>
                </div>
                <div className="mt-0.5 font-sans text-[15px] sm:text-[17px] leading-none font-extrabold tracking-tight">
                  <AnimatedNumber value={f.rating} />
                </div>
              </div>
              <div className="text-left min-[380px]:text-right shrink-0 flex flex-col items-start min-[380px]:items-end gap-0.5 text-[9px] text-muted dark:text-muted-dark tabular-nums font-medium">
                <div className="flex items-center gap-1">
                  <span>peak {f.peak}</span>
                  <span className="text-[10px] leading-none shrink-0">{ICONS[f.label] || '♟'}</span>
                </div>
                {total > 0 && <span className="font-bold text-emerald-600 dark:text-emerald-450">{formatPercent(winRate, 0)} WR</span>}
              </div>
            </div>
            {total > 0 && (
              <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full border border-line/45 dark:border-line-dark/40 bg-chip/40 dark:bg-chip-dark/45">
                <div className="h-full bg-emerald-600 dark:bg-emerald-400" style={{ width: `${((f.record?.win || 0) / total) * 100}%` }} />
                <div className="h-full bg-amber-500 dark:bg-amber-300" style={{ width: `${((f.record?.draw || 0) / total) * 100}%` }} />
                <div className="h-full bg-rose-600 dark:bg-rose-400" style={{ width: `${((f.record?.loss || 0) / total) * 100}%` }} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
})
