import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Bolt, Logo, Moon, Search, Sun } from './Icons'

/**
 * Sidebar control panel component.
 * Exposes parameters for profile selection, platform search, and app configurations.
 */
export default function Sidebar({
  platform,
  setPlatform,
  username,
  setUsername,
  platform2,
  setPlatform2,
  username2,
  setUsername2,
  isCompare,
  setIsCompare,
  onGenerate,
  onGenerateCompare,
  isLoading,
  justGenerated,
  theme,
  toggleTheme,
  isOpen = true,
}) {
  const id = useId()
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const ctaRef = useRef(null)
  const [ripples, setRipples] = useState([])

  const [localUsername, setLocalUsername] = useState(username)
  const [localUsername2, setLocalUsername2] = useState(username2)

  useEffect(() => {
    setLocalUsername(username)
  }, [username])

  useEffect(() => {
    setLocalUsername2(username2)
  }, [username2])
  // Track active timers to prevent memory leaks and state updates on unmounted components.
  const timersRef = useRef(new Set())

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      timers.clear()
    }
  }, [])

  const scheduleCleanup = (fn, ms) => {
    const t = window.setTimeout(() => {
      timersRef.current.delete(t)
      fn()
    }, ms)
    timersRef.current.add(t)
    return t
  }

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    setSubmitAttempted(true)
    
    setUsername(localUsername)
    setUsername2(localUsername2)

    if (isCompare) {
      if (localUsername.trim().length === 0 || localUsername2.trim().length === 0) return
      onGenerateCompare()
    } else {
      if (localUsername.trim().length === 0) return
      onGenerate()
    }
  }, [isCompare, localUsername, localUsername2, setUsername, setUsername2, onGenerate, onGenerateCompare])

  const handleCtaClick = useCallback((e) => {
    const el = ctaRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const size = Math.max(rect.width, rect.height)
    const id = Date.now() + Math.random()
    setRipples((r) => [...r, { id, x, y, size }])
    scheduleCleanup(() => {
      setRipples((r) => r.filter((rp) => rp.id !== id))
    }, 700)
  }, [scheduleCleanup])

  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-30 flex flex-col h-screen w-[300px] sm:w-[320px] bg-canvas/95 dark:bg-canvas-dark/95 shadow-2xl border-r border-line dark:border-line-dark transition-all duration-300 ease-in-out overflow-y-auto scrollbar-thin',
        'lg:relative lg:translate-x-0 lg:shadow-none lg:sticky lg:top-0 lg:h-screen lg:bg-chip/40 lg:dark:bg-chip-dark/20 lg:backdrop-blur',
        isOpen
          ? 'translate-x-0 opacity-100 pointer-events-auto lg:w-[320px] lg:shrink-0'
          : 'translate-x-[-100%] opacity-0 pointer-events-none lg:w-0 lg:opacity-0 lg:pointer-events-none lg:overflow-hidden lg:border-r-0',
      ].join(' ')}
    >
      <div className="flex-1 flex flex-col p-5 sm:p-6 gap-6">
        {/* Brand identity and theme toggler */}
        <div className="flex items-center justify-between min-h-[40px]">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="group flex items-center gap-2 -m-1.5 p-1.5 rounded-lg hover:bg-chip dark:hover:bg-chip-dark transition-all duration-150"
            aria-label="Scroll to top"
          >
            <span className="relative grid place-items-center h-8 w-8 rounded-lg bg-accent text-white overflow-hidden transition-transform duration-200 group-hover:scale-105">
              <Logo className="h-4 w-4" />
            </span>
            <span className="font-sans text-[18px] font-extrabold tracking-tight text-ink dark:text-ink-dark">
              ChessCard
            </span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="grid place-items-center h-8 w-8 shrink-0 rounded-lg text-muted hover:text-ink hover:bg-chip dark:hover:text-ink-dark dark:hover:bg-chip-dark relative overflow-hidden transition-all duration-150"
          >
            <span
              key={theme}
              className="grid place-items-center animate-[iconSwap_250ms_ease-out]"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </span>
          </button>
        </div>

        {/* Introduction overview */}
        <p className="text-[13px] leading-relaxed text-muted dark:text-muted-dark font-sans">
          Turn your <span className="text-ink dark:text-ink-dark font-bold">chess profile</span> into a clean, shareable stat card.
        </p>

        {/* Mode selector */}
        <div className="space-y-2">
          <Label>Mode</Label>
          <div
            role="tablist"
            aria-label="Mode"
            className="relative grid grid-cols-2 p-1 rounded-xl bg-chip dark:bg-chip-dark border border-line dark:border-line-dark"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-canvas dark:bg-canvas-dark shadow-sm border border-line dark:border-line-dark transition-transform duration-200 ease-out"
              style={{ transform: isCompare ? 'translateX(100%)' : 'translateX(0)' }}
            />
            <button
              type="button"
              role="tab"
              aria-selected={!isCompare}
              onClick={() => setIsCompare(false)}
              className={[
                'relative z-10 rounded-lg px-3 py-1.5 text-sm font-bold text-center',
                'transition-colors duration-150 ease-out',
                !isCompare ? 'text-ink dark:text-ink-dark' : 'text-muted dark:text-muted-dark hover:text-ink dark:hover:text-ink-dark',
              ].join(' ')}
            >
              Single Card
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isCompare}
              onClick={() => setIsCompare(true)}
              className={[
                'relative z-10 rounded-lg px-3 py-1.5 text-sm font-bold text-center',
                'transition-colors duration-150 ease-out',
                isCompare ? 'text-ink dark:text-ink-dark' : 'text-muted dark:text-muted-dark hover:text-ink dark:hover:text-ink-dark',
              ].join(' ')}
            >
              Versus Mode
            </button>
          </div>
        </div>

        {!isCompare ? (
          <>
            {/* Platform selection */}
            <div className="space-y-2">
              <Label>Platform</Label>
              <div
                role="tablist"
                aria-label="Platform"
                className="relative grid grid-cols-2 p-1 rounded-xl bg-chip dark:bg-chip-dark border border-line dark:border-line-dark"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-canvas dark:bg-canvas-dark shadow-sm border border-line dark:border-line-dark transition-transform duration-200 ease-out"
                  style={{ transform: platform === 'lichess' ? 'translateX(100%)' : 'translateX(0)' }}
                />
                <PlatformTab active={platform === 'chess.com'} onClick={() => setPlatform('chess.com')}>
                  Chess.com
                </PlatformTab>
                <PlatformTab active={platform === 'lichess'} onClick={() => setPlatform('lichess')}>
                  Lichess
                </PlatformTab>
              </div>
            </div>

            {/* Username credential settings */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <Label htmlFor={id}>Username</Label>
              <div className="relative group">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted group-focus-within:text-accent transition-colors duration-150" />
                <input
                  id={id}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={localUsername}
                  onChange={(e) => setLocalUsername(e.target.value)}
                  onBlur={() => setUsername(localUsername)}
                  placeholder={platform === 'lichess' ? 'e.g. DrNykterstein' : 'e.g. hikaru'}
                  className="field pl-9 py-2.5"
                  aria-invalid={submitAttempted && localUsername.trim().length === 0}
                />
                {localUsername && (
                  <button
                    type="button"
                    onClick={() => { setLocalUsername(''); setUsername(''); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center h-6 w-6 rounded text-muted hover:text-ink hover:bg-chip dark:hover:text-ink-dark dark:hover:bg-chip-dark transition-colors duration-150"
                    aria-label="Clear username"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                )}
              </div>
              {submitAttempted && localUsername.trim().length === 0 && (
                <p className="text-xs text-rose-500 dark:text-rose-400 animate-fadeUp">Please enter a username.</p>
              )}

              <button
                ref={ctaRef}
                type="submit"
                onClick={handleCtaClick}
                disabled={isLoading}
                className="btn-primary w-full mt-2"
              >
                {isLoading ? (
                  <>
                    <Spinner /> Generating…
                  </>
                ) : justGenerated ? (
                  <>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 animate-[checkPop_300ms_ease-out]" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-11" />
                    </svg>
                    Card ready
                  </>
                ) : (
                  <>
                    <Bolt className="h-3.5 w-3.5" />
                    Generate Stat Card
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Player profile 1 credentials */}
            <div className="space-y-3 p-3.5 rounded-xl border border-line dark:border-line-dark bg-chip/35 dark:bg-chip-dark/20">
              <Label>Player 1</Label>
              <div
                role="tablist"
                aria-label="P1 Platform"
                className="relative grid grid-cols-2 p-1 rounded-xl bg-canvas dark:bg-canvas-dark border border-line dark:border-line-dark"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-chip dark:bg-chip-dark border border-line dark:border-line-dark transition-transform duration-200 ease-out"
                  style={{ transform: platform === 'lichess' ? 'translateX(100%)' : 'translateX(0)' }}
                />
                <button
                  type="button"
                  onClick={() => setPlatform('chess.com')}
                  className={[
                    'relative z-10 py-1.5 text-xs font-bold rounded-lg text-center',
                    platform === 'chess.com' ? 'text-ink dark:text-ink-dark' : 'text-muted dark:text-muted-dark hover:text-ink'
                  ].join(' ')}
                >
                  Chess.com
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform('lichess')}
                  className={[
                    'relative z-10 py-1.5 text-xs font-bold rounded-lg text-center',
                    platform === 'lichess' ? 'text-ink dark:text-ink-dark' : 'text-muted dark:text-muted-dark hover:text-ink'
                  ].join(' ')}
                >
                  Lichess
                </button>
              </div>
              <div className="relative group">
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={localUsername}
                  onChange={(e) => setLocalUsername(e.target.value)}
                  onBlur={() => setUsername(localUsername)}
                  placeholder="Player 1 Username"
                  className="field py-2"
                  aria-invalid={submitAttempted && localUsername.trim().length === 0}
                />
              </div>
              {submitAttempted && localUsername.trim().length === 0 && (
                <p className="text-[11px] text-rose-500 dark:text-rose-400 animate-fadeUp">Enter Player 1 username.</p>
              )}
            </div>

            {/* Player profile 2 credentials */}
            <div className="space-y-3 p-3.5 rounded-xl border border-line dark:border-line-dark bg-chip/35 dark:bg-chip-dark/20">
              <Label>Player 2</Label>
              <div
                role="tablist"
                aria-label="P2 Platform"
                className="relative grid grid-cols-2 p-1 rounded-xl bg-canvas dark:bg-canvas-dark border border-line dark:border-line-dark"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-chip dark:bg-chip-dark border border-line dark:border-line-dark transition-transform duration-200 ease-out"
                  style={{ transform: platform2 === 'lichess' ? 'translateX(100%)' : 'translateX(0)' }}
                />
                <button
                  type="button"
                  onClick={() => setPlatform2('chess.com')}
                  className={[
                    'relative z-10 py-1.5 text-xs font-bold rounded-lg text-center',
                    platform2 === 'chess.com' ? 'text-ink dark:text-ink-dark' : 'text-muted dark:text-muted-dark hover:text-ink'
                  ].join(' ')}
                >
                  Chess.com
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform2('lichess')}
                  className={[
                    'relative z-10 py-1.5 text-xs font-bold rounded-lg text-center',
                    platform2 === 'lichess' ? 'text-ink dark:text-ink-dark' : 'text-muted dark:text-muted-dark hover:text-ink'
                  ].join(' ')}
                >
                  Lichess
                </button>
              </div>
              <div className="relative group">
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={localUsername2}
                  onChange={(e) => setLocalUsername2(e.target.value)}
                  onBlur={() => setUsername2(localUsername2)}
                  placeholder="Player 2 Username"
                  className="field py-2"
                  aria-invalid={submitAttempted && localUsername2.trim().length === 0}
                />
              </div>
              {submitAttempted && localUsername2.trim().length === 0 && (
                <p className="text-[11px] text-rose-500 dark:text-rose-400 animate-fadeUp">Enter Player 2 username.</p>
              )}
            </div>

            {/* Action trigger controls */}
            <button
              ref={ctaRef}
              type="submit"
              onClick={handleCtaClick}
              disabled={isLoading}
              className="btn-primary w-full mt-2"
            >
              {isLoading ? (
                <>
                  <Spinner /> Comparing…
                </>
              ) : justGenerated ? (
                <>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 animate-[checkPop_300ms_ease-out]" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5 9-11" />
                  </svg>
                  Comparison ready
                </>
              ) : (
                <>
                  <Bolt className="h-3.5 w-3.5" />
                  Compare Players
                </>
              )}
            </button>
          </form>
        )}


      </div>

      <div className="px-5 sm:px-6 py-4 mt-auto border-t border-line dark:border-line-dark text-[11px] text-muted dark:text-muted-dark flex items-center justify-between font-sans">
        <span>© ChessCard</span>
        <span className="hover:text-ink dark:hover:text-ink-dark cursor-default font-semibold">v0.3 · beta</span>
      </div>
    </aside>
  )
}

const Label = React.memo(function Label({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted dark:text-muted-dark"
    >
      {children}
    </label>
  )
})

const PlatformTab = React.memo(function PlatformTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'relative z-10 boing rounded-lg px-3 py-1.5 text-sm font-semibold text-center',
        'transition-colors duration-150 ease-snappy',
        active ? 'text-ink dark:text-ink-dark' : 'text-muted dark:text-muted-dark hover:text-ink dark:hover:text-ink-dark',
      ].join(' ')}
    >
      {children}
    </button>
  )
})

const Spinner = React.memo(function Spinner() {
  return <span aria-hidden className="inline-block h-3.5 w-3.5 rounded-full border-2 border-canvas/30 dark:border-canvas-dark/30 border-t-canvas dark:border-t-canvas-dark animate-spin" />
})

