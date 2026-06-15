/**
 * StyleBadge — the signature archetype banner that sits under the profile.
 * Reads `data.style` and renders a chunky 3D card with a chess-piece glyph,
 * the archetype name in big serif, and a one-line tagline.
 *
 * The whole card has a "punchIn" entrance and a small "boing" hover lift
 * to keep the cartoonish feel.
 */
export default function StyleBadge({ style, sampleSize = 0, compact = false }) {
  if (!style) return null

  const { archetype, icon, tagline, tone = 'subtle' } = style

  // Tone-driven palette. Soft, warm-leaning for everything to fit the
  // canvas aesthetic without looking like a generic badge.
  const toneStyles = {
    warm: {
      bg: 'bg-[#FDF4E3] dark:bg-[#3A2D1A]',
      ring: 'border-[#C96442]/35 dark:border-[#C96442]/40',
      text: 'text-[#7A3A20] dark:text-[#F0C896]',
      glow: 'hover:shadow-[0_14px_28px_-10px_rgba(201,100,66,0.45)]',
    },
    bold: {
      bg: 'bg-[#FBE9E2] dark:bg-[#3A201A]',
      ring: 'border-[#C96442]/40 dark:border-[#C96442]/50',
      text: 'text-[#7A2A18] dark:text-[#F0B59A]',
      glow: 'hover:shadow-[0_14px_28px_-10px_rgba(201,100,66,0.45)]',
    },
    cool: {
      bg: 'bg-[#E8F1EB] dark:bg-[#1A2C24]',
      ring: 'border-[#7BAE7F]/40 dark:border-[#7BAE7F]/45',
      text: 'text-[#2D5840] dark:text-[#B6D8BC]',
      glow: 'hover:shadow-[0_14px_28px_-10px_rgba(123,174,127,0.45)]',
    },
    subtle: {
      bg: 'bg-chip/70 dark:bg-chip-dark/60',
      ring: 'border-line dark:border-line-dark',
      text: 'text-ink dark:text-ink-dark',
      glow: 'hover:shadow-[0_14px_28px_-10px_rgba(28,25,23,0.18)]',
    },
  }
  const t = toneStyles[tone] || toneStyles.subtle

  if (compact) {
    return (
      <div
        className={[
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold shrink-0',
          t.bg,
          t.ring,
          t.text,
        ].join(' ')}
        title={`${archetype} · ${sampleSize} games`}
      >
        <span className="font-serif text-[12px] leading-none">{icon}</span>
        <span>{archetype}</span>
      </div>
    )
  }

  return (
    <div
      className={[
        'group relative overflow-hidden rounded-2xl border-2 p-4 sm:p-5',
        'transition-all duration-300 ease-boing',
        'hover:-translate-y-0.5',
        t.bg,
        t.ring,
        t.glow,
      ].join(' ')}
      style={{ animation: 'punchIn 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 40ms backwards' }}
    >
      {/* Subtle background watermark glyph that nudges on hover */}
      <div
        aria-hidden
        className={[
          'pointer-events-none absolute -right-2 -top-3 select-none',
          'font-serif text-[110px] leading-none opacity-[0.10] dark:opacity-[0.13]',
          'transition-transform duration-500 ease-boing group-hover:rotate-[8deg] group-hover:scale-110',
        ].join(' ')}
        style={{ color: 'currentColor' }}
      >
        {icon}
      </div>

      <div className="relative flex items-center gap-3.5">
        <div
          className={[
            'shrink-0 grid place-items-center h-12 w-12 rounded-xl',
            'border-2 border-line dark:border-line-dark',
            'bg-canvas dark:bg-canvas-dark',
            'shadow-[0_3px_0_0_rgba(28,25,23,0.18)] dark:shadow-[0_3px_0_0_rgba(0,0,0,0.6)]',
            'transition-transform duration-300 ease-boing group-hover:-rotate-3 group-hover:-translate-y-0.5',
          ].join(' ')}
        >
          <span className={['font-serif text-[26px] leading-none', t.text].join(' ')}>{icon}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={[
                'inline-block text-[9.5px] font-bold uppercase tracking-[0.16em] px-1.5 py-0.5 rounded',
                'bg-ink/10 dark:bg-ink-dark/20 text-ink/70 dark:text-ink-dark/70',
              ].join(' ')}
            >
              Your style
            </span>
            {sampleSize > 0 && (
              <span className="text-[10px] text-muted dark:text-muted-dark tabular-nums shrink-0">
                · {sampleSize} games
              </span>
            )}
          </div>
          <div
            className={[
              'mt-1 font-sans text-[20px] leading-tight font-extrabold tracking-tight',
              t.text,
            ].join(' ')}
          >
            {archetype}
          </div>
          <div className="mt-0.5 text-[12px] leading-relaxed text-ink/75 dark:text-ink-dark/75 line-clamp-2">
            {tagline}
          </div>
        </div>
      </div>
    </div>
  )
}
