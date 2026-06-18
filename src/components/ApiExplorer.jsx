import { useState, memo } from 'react'

/**
 * ApiExplorer — collapsible JSON viewer showing the raw API response and
 * the chain of calls that were made. Built for the curious.
 */
export default memo(function ApiExplorer({ data }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('data')

  if (!data) return null

  const calls = data.calls || []
  const summary = {
    platform: data.platform,
    username: data.profile?.username,
    fetchedAt: new Date(data.fetchedAt).toISOString(),
    calls: calls.map((c) => ({
      label: c.label,
      via: c.via,
      latencyMs: c.latencyMs,
      url: c.url?.split('?')[0],
    })),
  }

  return (
    <section className="mt-10 rounded-xl border-2 border-line dark:border-line-dark bg-canvas/60 dark:bg-canvas-dark/60 backdrop-blur overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="clicky w-full flex items-center justify-between px-4 py-3 text-left hover:bg-chip/50 dark:hover:bg-chip-dark/50"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 text-[12.5px] font-medium">
          <span className="grid place-items-center h-5 w-5 rounded-md bg-chip dark:bg-chip-dark border-2 border-line dark:border-line-dark text-[10px] font-mono">
            {'{ }'}
          </span>
          <span>API explorer</span>
          <span className="text-muted dark:text-muted-dark font-normal">
            · {calls.length} call{calls.length === 1 ? '' : 's'}
          </span>
        </div>
        <svg
          viewBox="0 0 24 24"
          className={['h-4 w-4 text-muted transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div
        className={[
          'grid transition-[grid-template-rows] duration-300 ease-snappy',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        ].join(' ')}
      >
        <div className="overflow-hidden">
          <div className="border-t-2 border-line dark:border-line-dark">
            <div className="flex items-center gap-1 px-2 pt-2">
              {['summary', 'data', 'calls'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={[
                    'clicky rounded-md px-2.5 py-1 text-[11px] font-medium',
                    tab === t
                      ? 'bg-chip dark:bg-chip-dark text-ink dark:text-ink-dark'
                      : 'text-muted dark:text-muted-dark hover:text-ink dark:hover:text-ink-dark',
                  ].join(' ')}
                >
                  {t}
                </button>
              ))}
              <div className="flex-1" />
              {calls.length > 0 && (
                <span className="text-[10.5px] text-muted dark:text-muted-dark tabular-nums pr-2">
                  Σ {calls.reduce((s, c) => s + (c.latencyMs || 0), 0)}ms
                </span>
              )}
            </div>

            <pre className="px-4 py-3 text-[11.5px] font-mono leading-relaxed text-ink/80 dark:text-ink-dark/80 max-h-80 overflow-auto">
              {tab === 'summary'
                ? JSON.stringify(summary, null, 2)
                : tab === 'calls'
                ? JSON.stringify(calls, null, 2)
                : JSON.stringify(redact(data), null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </section>
  )
})

function redact(d) {
  // Keep it readable but trim noisy fields
  if (!d) return d
  const out = { ...d }
  if (out.perFormat) {
    out.perFormat = out.perFormat.map((p) => ({
      key: p.key,
      label: p.label,
      rating: p.rating,
      peak: p.peak,
      record: p.record,
    }))
  }
  if (out.recentForm) out.recentForm = out.recentForm
  return out
}
