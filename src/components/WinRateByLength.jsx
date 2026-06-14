import { useId } from 'react'
import { formatPercent } from '../lib/format'
import { useIsDark } from '../lib/useIsDark'

const TONE = {
  short:   { label: 'Short',   sub: '≤20 moves', chip: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  medium:  { label: 'Medium',  sub: '21-40',     chip: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300' },
  long:    { label: 'Long',    sub: '41-70',     chip: 'bg-sky-600/10 text-sky-700 dark:text-sky-300' },
  epic:    { label: 'Epic',    sub: '70+ moves',  chip: 'bg-violet-600/10 text-violet-700 dark:text-violet-300' },
}

const COLORS = {
  wins:   { light: '#059669', dark: '#34d399' },
  draws:  { light: '#f59e0b', dark: '#fbbf24' },
  losses: { light: '#e11d48', dark: '#fb7185' },
}

export default function WinRateByLength({ data, isDark: isDarkProp, onHover }) {
  const systemIsDark = useIsDark()
  const isDark = isDarkProp !== undefined ? isDarkProp : systemIsDark
  const baseId = useId()

  if (!data || !data.length) return null

  const visible = data.filter((b) => b.games > 0)
  if (!visible.length) return null

  let bestBucket = null
  for (const b of visible) {
    if (b.games < 2) continue
    if (!bestBucket || b.winRate > bestBucket.winRate) bestBucket = b
  }

  const maxGames = Math.max(...visible.map((b) => b.wins + b.draws + b.losses))
  const LABEL_W = 60
  const BAR_H = 28
  const GAP = 8
  const totalH = visible.length * (BAR_H + GAP)

  return (
    <div className="rounded-xl border-2 border-line dark:border-line-dark p-3.5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted dark:text-muted-dark">
          Win rate by length
        </span>
        {bestBucket && (
          <span
            className={['text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded', TONE[bestBucket.key].chip].join(' ')}
            style={{ animation: 'punchIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 200ms backwards' }}
          >
            best · {TONE[bestBucket.key].label}
          </span>
        )}
      </div>

      <svg width="100%" height={totalH} viewBox={`0 0 400 ${totalH}`} className="overflow-visible">
        {visible.map((b, i) => {
          const t = TONE[b.key] || TONE.medium
          const y = i * (BAR_H + GAP)
          const total = b.wins + b.draws + b.losses
          const scale = maxGames > 0 ? 320 / maxGames : 0
          const wW = b.wins * scale
          const dW = b.draws * scale
          const lW = b.losses * scale
          const totalW = wW + dW + lW
          const clipId = `${baseId}-${b.key}`

          return (
            <g key={b.key}>
              <defs>
                <clipPath id={clipId}>
                  <rect x={LABEL_W} y={y} width={totalW} height={BAR_H} rx={4} ry={4} />
                </clipPath>
              </defs>
              <text
                x={LABEL_W - 6}
                y={y + BAR_H / 2}
                textAnchor="end"
                dominantBaseline="central"
                className="fill-ink dark:fill-ink-dark cursor-pointer select-none"
                style={{ fontSize: '11.5px', fontWeight: 600 }}
                onMouseEnter={(e) => onHover?.(e, `${t.label} (total): ${total} games`)}
                onMouseMove={(e) => onHover?.(e, `${t.label} (total): ${total} games`)}
                onMouseLeave={() => onHover?.(null, null)}
              >
                {t.label}
              </text>
              <g clipPath={`url(#${clipId})`}>
                {wW > 0 && (
                  <rect
                    x={LABEL_W}
                    y={y}
                    width={wW}
                    height={BAR_H}
                    fill={isDark ? COLORS.wins.dark : COLORS.wins.light}
                    className="cursor-pointer"
                    onMouseEnter={(e) => onHover?.(e, `Wins: ${b.wins} games (${formatPercent(b.wins / total, 0)})`)}
                    onMouseMove={(e) => onHover?.(e, `Wins: ${b.wins} games (${formatPercent(b.wins / total, 0)})`)}
                    onMouseLeave={() => onHover?.(null, null)}
                  />
                )}
                {dW > 0 && (
                  <rect
                    x={LABEL_W + wW}
                    y={y}
                    width={dW}
                    height={BAR_H}
                    fill={isDark ? COLORS.draws.dark : COLORS.draws.light}
                    className="cursor-pointer"
                    onMouseEnter={(e) => onHover?.(e, `Draws: ${b.draws} games (${formatPercent(b.draws / total, 0)})`)}
                    onMouseMove={(e) => onHover?.(e, `Draws: ${b.draws} games (${formatPercent(b.draws / total, 0)})`)}
                    onMouseLeave={() => onHover?.(null, null)}
                  />
                )}
                {lW > 0 && (
                  <rect
                    x={LABEL_W + wW + dW}
                    y={y}
                    width={lW}
                    height={BAR_H}
                    fill={isDark ? COLORS.losses.dark : COLORS.losses.light}
                    className="cursor-pointer"
                    onMouseEnter={(e) => onHover?.(e, `Losses: ${b.losses} games (${formatPercent(b.losses / total, 0)})`)}
                    onMouseMove={(e) => onHover?.(e, `Losses: ${b.losses} games (${formatPercent(b.losses / total, 0)})`)}
                    onMouseLeave={() => onHover?.(null, null)}
                  />
                )}
              </g>
              {total > 0 && (
                <text
                  x={LABEL_W + totalW + 8}
                  y={y + BAR_H / 2}
                  dominantBaseline="central"
                  className="fill-muted dark:fill-muted-dark cursor-pointer select-none"
                  style={{ fontSize: '10px', fontWeight: 500, tabularNums: 'tabular-nums' }}
                  onMouseEnter={(e) => onHover?.(e, `${t.label} Win Rate: ${formatPercent(b.winRate, 1)}`)}
                  onMouseMove={(e) => onHover?.(e, `${t.label} Win Rate: ${formatPercent(b.winRate, 1)}`)}
                  onMouseLeave={() => onHover?.(null, null)}
                >
                  {formatPercent(b.winRate, 0)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
