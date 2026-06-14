/**
 * Mascot — a small chess knight in the top-right of the canvas that reacts
 * to the app's state. Tries to stay cute without being annoying.
 *
 *   idle     → gentle wave
 *   loading  → excited hops
 *   success  → big jump + wiggle
 *   error    → little shrug
 */
export default function Mascot({ state = 'idle' }) {
  return (
    <div
      aria-hidden
      className={[
        'pointer-events-none fixed top-20 sm:top-24 right-4 sm:right-6 z-10',
        'hidden min-[1200px]:flex items-end gap-1.5 select-none',
      ].join(' ')}
    >
      <SpeechBubble state={state} />
      <div
        className={[
          'text-[34px] leading-none font-serif text-ink/70 dark:text-ink-dark/70 origin-bottom',
          'transition-transform duration-300 ease-boing',
          state === 'loading' ? 'animate-[hop_700ms_ease-in-out_infinite]' : '',
          state === 'success' ? 'animate-[boing_900ms_ease-boing]' : '',
          state === 'error' ? 'animate-[wiggle_600ms_ease-in-out]' : '',
          state === 'idle' ? 'animate-[float_3.4s_ease-in-out_infinite]' : '',
        ].join(' ')}
        style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.10))' }}
      >
        ♞
      </div>
    </div>
  )
}

function SpeechBubble({ state }) {
  const text =
    state === 'loading' ? 'fetching…'
    : state === 'success' ? 'nice one!'
    : state === 'error' ? 'hmm…'
    : 'hi!'
  return (
    <div
      className={[
        'relative mb-6 rounded-xl bg-ink text-canvas dark:bg-ink-dark dark:text-canvas-dark',
        'px-2.5 py-1 text-[11px] font-medium leading-none',
        'shadow-[0_3px_0_0_rgba(28,25,23,0.18),0_6px_14px_-4px_rgba(28,25,23,0.25)]',
        'transition-all duration-200 ease-boing',
      ].join(' ')}
      key={text}
      style={{ animation: 'popIn 320ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
    >
      <span className="relative z-10">{text}</span>
      <span
        className="absolute -bottom-1.5 right-3 h-3 w-3 rotate-45 bg-ink dark:bg-ink-dark -z-10"
      />
    </div>
  )
}
