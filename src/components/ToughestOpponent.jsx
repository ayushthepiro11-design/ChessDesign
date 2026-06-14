/**
 * ToughestOpponent — the highest-rated opponent the user has faced in the
 * sample, with a W/L/D record against them.
 *
 * Skips opponents who aren't notably stronger than the user (we want this
 * to feel like an achievement, not noise).
 */

function recordTone(w, l) {
  if (w > l) return { tone: 'win', color: 'text-emerald-700 dark:text-emerald-300' }
  if (w < l) return { tone: 'loss', color: 'text-rose-700 dark:text-rose-300' }
  return { tone: 'even', color: 'text-amber-700 dark:text-amber-300' }
}

export default function ToughestOpponent({ data, userRating }) {
  if (!data) return null
  if (!data.username) return null
  // Only show if the opponent is actually meaningfully stronger. We
  // threshold at +50 rating to keep this from feeling like a stat for
  // the sake of a stat when the user is the stronger player.
  if (Number.isFinite(userRating) && Number.isFinite(data.rating) && data.rating < userRating + 50) {
    return null
  }

  const { username, rating, wins, losses, draws, totalGames, profileUrl } = data
  const t = recordTone(wins, losses)

  // Conditional root: an <a> when we have a profile URL, a <div> otherwise.
  // Falling back to href="#" would scroll the page to the top.
  const Wrapper = profileUrl ? 'a' : 'div'
  const wrapperProps = profileUrl
    ? { href: profileUrl, target: '_blank', rel: 'noreferrer noopener' }
    : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={[
        'group block rounded-xl border-2 border-line dark:border-line-dark p-3.5',
        'transition-all duration-300 ease-boing',
        'hover:-translate-y-0.5 hover:border-rose-400/60 hover:shadow-[0_10px_22px_-8px_rgba(225,29,72,0.32)]',
        profileUrl ? 'cursor-pointer' : 'cursor-default',
      ].join(' ')}
      style={{ animation: 'punchIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 80ms backwards' }}
    >
      <div className="flex items-center justify-between mb-2.5" style={{ lineHeight: '1' }}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted dark:text-muted-dark">
          Toughest opponent
        </span>
        <span className="text-[10px] text-muted dark:text-muted-dark tabular-nums">
          {totalGames} game{totalGames === 1 ? '' : 's'} faced
        </span>
      </div>

      <div className="flex items-center gap-3" style={{ minHeight: '44px' }}>
        <div
          className={[
            'shrink-0 grid place-items-center h-11 w-11 rounded-lg',
            'border-2 border-line dark:border-line-dark',
            'bg-gradient-to-br from-rose-100 to-amber-50 dark:from-rose-900/30 dark:to-amber-900/20',
            'transition-transform duration-300 ease-boing group-hover:rotate-[-6deg] group-hover:scale-110',
          ].join(' ')}
        >
          <span className="font-serif text-[22px] leading-none text-rose-700 dark:text-rose-300">♛</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2" style={{ lineHeight: '1.2' }}>
            <span className="font-sans text-[16px] font-bold tracking-tight truncate min-w-0">
              {username}
            </span>
            <span className="text-[12px] text-muted dark:text-muted-dark tabular-nums shrink-0 ml-auto">
              {rating}
            </span>
          </div>
          <div className="mt-1 text-[12px] text-muted dark:text-muted-dark flex items-center gap-2" style={{ lineHeight: '1' }}>
            <span className={['tabular-nums font-semibold', t.color].join(' ')}>
              {wins}W · {losses}L{draws ? ` · ${draws}D` : ''}
            </span>
            <span aria-hidden className="text-muted/60 dark:text-muted-dark/60">·</span>
            <span className="tabular-nums">
              {t.tone === 'win' ? 'you lead' : t.tone === 'loss' ? 'they lead' : 'all even'}
            </span>
          </div>
        </div>
      </div>
    </Wrapper>
  )
}
