import { memo } from 'react'

/**
 * FirstMove — distribution of the user's first move, as a horizontal
 * stacked bar plus a small legend.
 *
 * `data` is an array of `{ move, count, pct }` entries sorted by count.
 * Categories: 'e4', 'd4', 'c4', 'Nf3', 'f4', 'flank', 'other'.
 *
 * If we only see one move, the bar is rendered as a single solid block
 * and we hide the legend to keep things compact.
 */

const COLOR_BY_MOVE = {
  e4: 'bg-[#C96442] dark:bg-[#D67A5C]',
  d4: 'bg-[#5A8FBF] dark:bg-[#7AA8D0]',
  c4: 'bg-[#7BAE7F] dark:bg-[#95C29A]',
  Nf3: 'bg-[#E8B23A] dark:bg-[#F0C456]',
  f4: 'bg-[#B96A88] dark:bg-[#D17BB0]',
  flank: 'bg-[#8C7A5B] dark:bg-[#A8957B]',
  other: 'bg-[#6B6963] dark:bg-[#86847E]',
}

const LABEL_BY_MOVE = {
  e4: '1.e4',
  d4: '1.d4',
  c4: '1.c4',
  Nf3: '1.Nf3',
  f4: '1.f4',
  flank: 'Flank',
  other: 'Other',
}

export default memo(function FirstMove({ data }) {
  if (!data || !data.length) return null
  const total = data.reduce((a, m) => a + m.count, 0)
  if (!total) return null

  const onlyOne = data.length === 1

  return (
    <div className="rounded-xl border-2 border-line dark:border-line-dark p-3.5">
      <div className="flex items-center justify-between mb-2.5" style={{ lineHeight: '1' }}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted dark:text-muted-dark">
          First move (as White)
        </span>
        <span className="text-[10.5px] text-muted dark:text-muted-dark tabular-nums">
          {total} games
        </span>
      </div>

      {/* Bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full border-2 border-line dark:border-line-dark">
        {data.map((m, i) => {
          const color = COLOR_BY_MOVE[m.move] || COLOR_BY_MOVE.other
          return (
            <div
              key={m.move}
              className={['h-full origin-left', color].join(' ')}
              style={{
                width: `${m.pct * 100}%`,
                animation: `barPop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) ${120 + i * 80}ms backwards`,
              }}
            />
          )
        })}
      </div>

      {/* Legend */}
      {!onlyOne && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {data.map((m, i) => (
            <div
              key={m.move}
              className="flex items-center gap-1.5 text-[11px] tabular-nums"
              style={{ animation: `punchIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1) ${200 + i * 60}ms backwards`, minWidth: '68px' }}
            >
              <span
                className={['inline-block h-2.5 w-2.5 rounded-sm shrink-0', COLOR_BY_MOVE[m.move] || COLOR_BY_MOVE.other].join(' ')}
                aria-hidden
              />
              <span className="font-medium text-ink dark:text-ink-dark" style={{ minWidth: '32px' }}>
                {LABEL_BY_MOVE[m.move] || m.move}
              </span>
              <span className="text-muted dark:text-muted-dark ml-auto">{Math.round(m.pct * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      {onlyOne && (
        <div className="mt-2 font-sans text-[15px] font-bold leading-none text-ink dark:text-ink-dark">
          {LABEL_BY_MOVE[data[0].move] || data[0].move}{' '}
          <span className="text-[12px] font-sans font-normal text-muted dark:text-muted-dark">
            every game
          </span>
        </div>
      )}
    </div>
  )
})
