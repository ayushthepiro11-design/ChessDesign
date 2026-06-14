import { useId } from 'react'
import { useIsDark } from '../lib/useIsDark'

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => {
  if (h === 0) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
})

const TICK_HOURS = [0, 6, 12, 18]

function peakLabel(hour) {
  if (hour == null) return '—'
  const fmt = (h) => {
    if (h === 0) return '12a'
    if (h === 12) return '12p'
    return h < 12 ? `${h}a` : `${h - 12}p`
  }
  return `${fmt(hour)}–${fmt((hour + 2) % 24)}`
}

const COLORS = {
  peak:   { light: '#C96442', dark: '#E8B23A' },
  active: { light: 'rgba(31, 30, 27, 0.55)', dark: 'rgba(242, 241, 236, 0.65)' },
  empty:  { light: 'rgba(232, 229, 221, 0.40)', dark: 'rgba(44, 42, 38, 0.40)' },
}

export default function TimeOfDay({ hourlyPlay, peakHour, isDark: isDarkProp, onHover }) {
  const systemIsDark = useIsDark()
  const isDark = isDarkProp !== undefined ? isDarkProp : systemIsDark
  const clipId = useId()

  if (!hourlyPlay || !hourlyPlay.length) return null
  const total = hourlyPlay.reduce((a, b) => a + b, 0)
  if (!total) return null

  const formatHour12 = (h) => {
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 === 0 ? 12 : h % 12
    return `${hour12}:00 ${ampm}`
  }

  const maxCount = Math.max(...hourlyPlay)
  const chartW = 400
  const barAreaH = 40
  const tickH = 16
  const totalH = barAreaH + tickH
  const barGap = 2
  const barW = (chartW - barGap * 24) / 24

  const getBarColor = (h) => {
    const isPeak = peakHour != null && h === peakHour
    const isActive = hourlyPlay[h] > 0
    if (isPeak) return isDark ? COLORS.peak.dark : COLORS.peak.light
    if (isActive) return isDark ? COLORS.active.dark : COLORS.active.light
    return isDark ? COLORS.empty.dark : COLORS.empty.light
  }

  return (
    <div className="rounded-xl border-2 border-line dark:border-line-dark p-3.5">
      <div className="flex items-center justify-between mb-2.5" style={{ lineHeight: '1' }}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted dark:text-muted-dark">
          Time of day
        </span>
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#C96442]/10 text-[#7A3A20] dark:bg-[#E8B23A]/10 dark:text-[#F0C896] shrink-0 whitespace-nowrap"
          style={{ animation: 'punchIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 120ms backwards' }}
        >
          peak · {peakLabel(peakHour)}
        </span>
      </div>

      <svg width="100%" height={totalH} viewBox={`0 0 ${chartW} ${totalH}`} className="overflow-visible">
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={chartW} height={barAreaH} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {hourlyPlay.map((count, h) => {
            const x = h * (barW + barGap)
            const barH = maxCount > 0 ? (count / maxCount) * barAreaH : 0
            const y = barAreaH - barH
            return (
              <g key={h}>
                {/* Visual Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(barH, 1) + 4}
                  fill={getBarColor(h)}
                  rx={barH > 2 ? 3 : 0}
                  ry={barH > 2 ? 3 : 0}
                  style={{ pointerEvents: 'none' }}
                />
                {/* Full-height Transparent Hover Zone */}
                <rect
                  x={x}
                  y={0}
                  width={barW}
                  height={barAreaH}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    onHover?.(e, `${formatHour12(h)}: ${count.toLocaleString()} game${count !== 1 ? 's' : ''} (${((count / total) * 100).toFixed(1)}%)`)
                  }}
                  onMouseMove={(e) => {
                    onHover?.(e, `${formatHour12(h)}: ${count.toLocaleString()} game${count !== 1 ? 's' : ''} (${((count / total) * 100).toFixed(1)}%)`)
                  }}
                  onMouseLeave={() => onHover?.(null, null)}
                />
              </g>
            )
          })}
        </g>
        {hourlyPlay.map((_, h) => {
          if (!TICK_HOURS.includes(h)) return null
          const x = h * (barW + barGap)
          return (
            <text
              key={`tick-${h}`}
              x={x + barW / 2}
              y={barAreaH + 12}
              textAnchor="middle"
              className="fill-muted dark:fill-muted-dark"
              style={{ fontSize: '9.5px' }}
            >
              {HOUR_LABELS[h]}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
