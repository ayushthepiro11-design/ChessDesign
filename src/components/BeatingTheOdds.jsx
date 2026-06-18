import { memo } from 'react'
import { formatPercent } from '../lib/format'
import { useIsDark } from '../lib/useIsDark'

const COLORS = {
  wins:   { light: '#059669', dark: '#34d399' },
  draws:  { light: '#f59e0b', dark: '#fbbf24' },
  losses: { light: '#e11d48', dark: '#fb7185' },
}

export default memo(function BeatingTheOdds({ data, isDark: isDarkProp }) {
  const systemIsDark = useIsDark()
  const isDark = isDarkProp !== undefined ? isDarkProp : systemIsDark
  if (!data) return null
  if (data.games < 3) return null
  const { wins, losses, draws, games, winRate, avgDelta } = data

  let verdict = 'room to grow'
  let verdictTone = 'text-muted dark:text-muted-dark'
  if (winRate >= 0.55) {
    verdict = 'you punch up'
    verdictTone = 'text-emerald-700 dark:text-emerald-300'
  } else if (winRate >= 0.4) {
    verdict = 'competitive'
    verdictTone = 'text-amber-700 dark:text-amber-300'
  }

  const wW = games > 0 ? (wins / games) * 100 : 0
  const dW = games > 0 ? (draws / games) * 100 : 0
  const lW = games > 0 ? (losses / games) * 100 : 0

  return (
    <div
      className={[
        'rounded-xl border-2 border-line dark:border-line-dark p-3.5',
        'transition-all duration-300 ease-boing',
        'hover:border-emerald-400/60 hover:shadow-[0_10px_22px_-8px_rgba(16,185,129,0.3)]',
      ].join(' ')}
      style={{ animation: 'punchIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 80ms backwards' }}
    >
      <div className="flex items-center justify-between mb-2.5" style={{ lineHeight: '1' }}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted dark:text-muted-dark">
          Beating the odds
        </span>
        <span className="text-[10px] text-muted dark:text-muted-dark tabular-nums">
          vs +{avgDelta} avg
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-sans text-[28px] leading-none font-extrabold tracking-tight tabular-nums">
          {formatPercent(winRate, 0)}
        </span>
        <span className={['text-[12px] font-semibold', verdictTone].join(' ')}>
          · {verdict}
        </span>
      </div>

      <div className="mt-2 flex items-center flex-wrap gap-x-1 text-[11.5px] text-muted dark:text-muted-dark tabular-nums">
        <span>vs opponents rated higher than you</span>
        <span aria-hidden>·</span>
        <span className="font-semibold text-ink dark:text-ink-dark">
          {wins}W · {losses}L{draws ? ` · ${draws}D` : ''}
        </span>
        <span aria-hidden>·</span>
        <span>{games} game{games === 1 ? '' : 's'}</span>
      </div>

      <svg width="100%" height={14} viewBox="0 0 100 10" preserveAspectRatio="none" className="mt-2.5 rounded-[4px] overflow-hidden">
        {wW > 0 && <rect x={0} y={0} width={wW} height={10} fill={isDark ? COLORS.wins.dark : COLORS.wins.light} rx={0} />}
        {dW > 0 && <rect x={wW} y={0} width={dW} height={10} fill={isDark ? COLORS.draws.dark : COLORS.draws.light} rx={0} />}
        {lW > 0 && <rect x={wW + dW} y={0} width={lW} height={10} fill={isDark ? COLORS.losses.dark : COLORS.losses.light} rx={0} />}
      </svg>
    </div>
  )
})
