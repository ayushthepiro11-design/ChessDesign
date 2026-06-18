/**
 * Component to display historical match outcome status logs as custom badges.
 */
export default function RecentForm({ form = [], size = 'md' }) {
  if (!form.length) {
    return <span className="text-[12px] text-muted dark:text-muted-dark">No recent games</span>
  }
  const dot = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 text-[11px]'
  const wins = form.filter((r) => r === 'W').length
  const draws = form.filter((r) => r === 'D').length
  const losses = form.filter((r) => r === 'L').length

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {form.map((r, i) => (
          <span
            key={i}
            title={r === 'W' ? 'Win' : r === 'D' ? 'Draw' : 'Loss'}
            className={[
              dot,
              'inline-flex items-center justify-center rounded-md font-mono font-bold',
              'transition-all duration-150 ease-out hover:scale-110 cursor-default',
              'shadow-sm hover:shadow',
              r === 'W'
                ? 'bg-emerald-500 text-white dark:bg-emerald-450 dark:text-emerald-950'
                : r === 'D'
                ? 'bg-amber-400 text-amber-950 dark:bg-amber-350 dark:text-amber-950'
                : 'bg-rose-500 text-white dark:bg-rose-450 dark:text-rose-950',
            ].join(' ')}
            style={{ animation: `popIn 300ms cubic-bezier(0.2, 0.8, 0.2, 1) ${i * 30}ms backwards` }}
          >
            {r}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted dark:text-muted-dark tabular-nums font-medium">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-sm bg-emerald-500 dark:bg-emerald-400" />
          {wins}W
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-sm bg-amber-400 dark:bg-amber-300" />
          {draws}D
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-sm bg-rose-500 dark:bg-rose-400" />
          {losses}L
        </span>
      </div>
    </div>
  )
}
