import { memo } from 'react'

/**
 * BackgroundFX — atmospheric layer with floating chess pieces, gradient orbs,
 * dot grid, and film grain. All decorative, pointer-events-none, sits behind
 * everything. The chess pieces drift slowly with their own randomized paths.
 */
const PIECES = [
  { glyph: '♛', left: '8%',  top: '18%', size: 'text-7xl', delay: '0s',   duration: '24s', opacity: 0.06 },
  { glyph: '♞', left: '85%', top: '12%', size: 'text-6xl', delay: '3s',   duration: '20s', opacity: 0.05 },
  { glyph: '♚', left: '70%', top: '72%', size: 'text-8xl', delay: '6s',   duration: '28s', opacity: 0.05 },
  { glyph: '♝', left: '18%', top: '78%', size: 'text-5xl', delay: '2s',   duration: '22s', opacity: 0.06 },
  { glyph: '♜', left: '45%', top: '8%',  size: 'text-6xl', delay: '5s',   duration: '26s', opacity: 0.04 },
  { glyph: '♟', left: '92%', top: '55%', size: 'text-5xl', delay: '4s',   duration: '18s', opacity: 0.07 },
  { glyph: '♟', left: '30%', top: '42%', size: 'text-4xl', delay: '7s',   duration: '21s', opacity: 0.05 },
  { glyph: '♘', left: '55%', top: '88%', size: 'text-5xl', delay: '1s',   duration: '25s', opacity: 0.05 },
]

export default memo(function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={{ contain: 'strict' }}>
      {/* Subtly placed static background chess pieces */}
      {PIECES.map((p, i) => (
        <div
          key={i}
          className={['absolute font-serif select-none text-ink dark:text-ink-dark', p.size].join(' ')}
          style={{
            left: p.left,
            top: p.top,
            opacity: p.opacity * 0.7,
          }}
        >
          {p.glyph}
        </div>
      ))}

      {/* Gradient orbs — optimized size on mobile to reduce paint costs */}
      <div
        className="absolute -top-20 -left-20 sm:-top-40 sm:-left-40 h-[280px] w-[280px] sm:h-[560px] sm:w-[560px] rounded-full bg-accent/20 dark:bg-accent/25 blur-3xl animate-[orb1_18s_ease-in-out_infinite]"
        style={{ willChange: 'transform' }}
      />
      <div
        className="absolute top-1/3 -right-20 sm:-right-40 h-[320px] w-[320px] sm:h-[640px] sm:w-[640px] rounded-full bg-emerald-300/15 dark:bg-emerald-500/15 blur-3xl animate-[orb2_22s_ease-in-out_infinite]"
        style={{ willChange: 'transform' }}
      />
      <div
        className="hidden sm:block absolute -bottom-40 left-1/4 h-[480px] w-[480px] rounded-full bg-amber-200/30 dark:bg-amber-700/15 blur-3xl animate-[orb3_26s_ease-in-out_infinite]"
        style={{ willChange: 'transform' }}
      />
      <div
        className="hidden sm:block absolute top-1/2 left-1/3 h-[380px] w-[380px] rounded-full bg-rose-200/20 dark:bg-rose-700/10 blur-3xl animate-[orb4_30s_ease-in-out_infinite]"
        style={{ willChange: 'transform' }}
      />

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.32] dark:opacity-[0.22]"
        style={{
          contain: 'content',
          backgroundImage:
            'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          color: 'var(--dot-color, #1F1E1B)',
          maskImage:
            'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />

      {/* Film grain — disabled on mobile to save CPU/GPU rendering load */}
      <div
        className="absolute inset-0 opacity-[0.06] dark:opacity-[0.08] mix-blend-overlay hidden sm:block"
        style={{
          contain: 'content',
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  )
})
