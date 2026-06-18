import { memo } from 'react'
import { compactNumber, formatPercent } from '../lib/format'

/**
 * ColorSplit — shows the user's win rate broken down by color side.
 *
 * Layout: a single horizontal bar split into White/Black segments whose
 * widths track winRate, plus two legend cells underneath. Each cell shows
 * the win rate and the raw W/L/D counts. The whole thing has a
 * "colorSide" label hovering over the bar that follows the larger side.
 *
 * Falls back gracefully if either side has 0 games.
 */
export default memo(function ColorSplit({ data }) {
  if (!data) return null
  const { white, black } = data
  if (!white?.games && !black?.games) return null

  // We use winRate to size segments so a 70%/30% split stays visible even
  // when game counts are lopsided.
  const wWR = white?.winRate || 0
  const bWR = black?.winRate || 0
  const totalWR = wWR + bWR
  const wPct = totalWR ? (wWR / totalWR) * 100 : 50
  const bPct = 100 - wPct

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5" style={{ lineHeight: '1' }}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted dark:text-muted-dark">
          Color split
        </span>
        <span className="text-[10.5px] text-muted dark:text-muted-dark tabular-nums">
          {compactNumber((white?.games || 0) + (black?.games || 0))} games
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-3 w-full overflow-hidden rounded-full border-2 border-line dark:border-line-dark bg-chip dark:bg-chip-dark flex">
        <div
          className="h-full bg-[#F5EFDF] dark:bg-[#E8DCC0] origin-left border-r border-line/60 dark:border-line-dark/60"
          style={{
            width: `${wPct}%`,
            animation: 'barPop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) 100ms backwards',
          }}
        />
        <div
          className="h-full bg-ink/85 dark:bg-ink-dark/85 origin-left"
          style={{
            width: `${bPct}%`,
            animation: 'barPop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) 220ms backwards',
          }}
        />
        {/* Knight + pawn icons on the bar */}
        <span
          aria-hidden
          className="absolute top-1/2 -translate-y-1/2 left-2 font-serif text-[12px] leading-none text-ink/40 dark:text-ink-dark/40 select-none"
        >
          ♙
        </span>
        <span
          aria-hidden
          className="absolute top-1/2 -translate-y-1/2 right-2 font-serif text-[12px] leading-none text-canvas/60 dark:text-canvas-dark/60 select-none"
        >
          ♟
        </span>
      </div>

      {/* Legend cells */}
      <div className="mt-3 grid grid-cols-2 gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <SideCell
          side="white"
          split={white}
          delay={140}
        />
        <SideCell
          side="black"
          split={black}
          delay={220}
        />
      </div>
    </div>
  )
})

function SideCell({ side, split, delay = 0 }) {
  if (!split || !split.games) {
    return (
      <div
        className="rounded-lg border-2 border-dashed border-line/70 dark:border-line-dark/70 px-3 py-2.5 text-center text-[11px] text-muted dark:text-muted-dark"
        style={{ animation: `punchIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms backwards` }}
      >
        No games as {side === 'white' ? 'White' : 'Black'} yet
      </div>
    )
  }
  const isWhite = side === 'white'
  return (
    <div
      className={[
        'rounded-lg border-2 px-3 py-2.5 min-w-0',
        'transition-all duration-200 ease-boing hover:-translate-y-0.5',
        isWhite
          ? 'border-line dark:border-line-dark hover:shadow-[0_8px_16px_-8px_rgba(28,25,23,0.2)] bg-[#FBF6E9] dark:bg-[#2A2418]'
          : 'border-ink/70 dark:border-ink-dark/70 hover:shadow-[0_8px_16px_-8px_rgba(28,25,23,0.3)] bg-ink/[0.04] dark:bg-ink-dark/[0.08]',
      ].join(' ')}
      style={{ animation: `punchIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms backwards` }}
    >
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted dark:text-muted-dark" style={{ lineHeight: '1' }}>
        <span
          className={[
            'inline-grid place-items-center h-4 w-4 rounded text-[10px] font-serif leading-none',
            isWhite
              ? 'bg-canvas text-ink border-2 border-line dark:border-line-dark dark:bg-canvas-dark dark:text-ink-dark'
              : 'bg-ink text-canvas dark:bg-ink-dark dark:text-canvas-dark',
          ].join(' ')}
        >
          {isWhite ? '♔' : '♚'}
        </span>
        As {isWhite ? 'White' : 'Black'}
      </div>
      <div className="mt-1.5 font-sans text-[20px] leading-none font-extrabold tabular-nums text-right">
        {formatPercent(split.winRate, 0)}
      </div>
      <div className="mt-1 text-[10px] sm:text-[11px] tabular-nums text-muted dark:text-muted-dark truncate" title={`${split.wins}W · ${split.losses}L · ${split.draws}D`}>
        {split.wins}W · {split.losses}L · {split.draws}D
      </div>
    </div>
  )
}
