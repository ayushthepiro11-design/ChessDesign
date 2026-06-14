import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, useReducedMotion, useSpring } from 'framer-motion'
import { Flame, Spark, Target, Trophy } from './Icons'
import AnimatedNumber from './AnimatedNumber'
import BeatingTheOdds from './BeatingTheOdds'
import ColorSplit from './ColorSplit'
import FirstMove from './FirstMove'
import LiveBadge from './LiveBadge'
import RecentForm from './RecentForm'
import StyleBadge from './StyleBadge'
import TimeControlGrid from './TimeControlGrid'
import TimeOfDay from './TimeOfDay'
import ToughestOpponent from './ToughestOpponent'
import WinRateByLength from './WinRateByLength'
import { compactNumber, formatPercent, formatStreak } from '../lib/format'

const FACES = [
  { key: 'overview',   label: 'Overview' },
  { key: 'repertoire', label: 'Repertoire' },
  { key: 'insights',   label: 'Insights' },
]

export default function StatCard({ data, cardRef: externalCardRef, source, onRefresh, isRefreshing, theme, isDark }) {
  const localCardRef = useRef(null)
  const cardRef = externalCardRef || localCardRef
  const innerRef = useRef(null)
  const reduce = useReducedMotion()
  const [booped, setBooped] = useState(false)
  const [shineKey, setShineKey] = useState(0)
  const [face, setFace] = useState(0)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [tooltipContent, setTooltipContent] = useState(null)
  const tx = useMotionValue(0)
  const ty = useMotionValue(0)

  // Framer Motion motion values for 3D tilt
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const gx = useMotionValue(50)
  const gy = useMotionValue(50)
  const gOpacity = useMotionValue(0)

  // Spring configuration for buttery smooth hover tilt and snap-back
  const springConfig = { damping: 25, stiffness: 220 }
  const rxSpring = useSpring(rx, springConfig)
  const rySpring = useSpring(ry, springConfig)

  // Derived transforms using spring values to prevent conflicts with CSS transitions
  const tiltTransform = useTransform(
    [rxSpring, rySpring],
    ([latestRx, latestRy]) => `rotateX(${latestRx}deg) rotateY(${latestRy}deg)`
  )
  const glareBackground = useTransform(
    [gx, gy],
    ([latestGx, latestGy]) =>
      `radial-gradient(480px circle at ${latestGx}% ${latestGy}%, rgba(255,255,255,0.12), transparent 45%)`
  )
  const watermarkTransform = useTransform(
    [rySpring, rxSpring],
    ([latestRy, latestRx]) =>
      `translateZ(-30px) translateX(${-latestRy * 1.5}px) translateY(${latestRx * 1.5}px) ${booped ? 'scale(1.03)' : 'scale(1)'}`
  )

  // Reset to first tab when username changes
  const handleTooltipHover = useCallback((e, content) => {
    if (!e || !content) {
      setTooltipContent(null)
      return
    }
    setTooltipContent((prev) => (prev !== content ? content : prev))
    const cardEl = cardRef.current
    if (!cardEl) return
    const rect = cardEl.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    tx.set(x)
    ty.set(y)
  }, [cardRef, tx, ty])

  // Reset to first tab and clear tooltip when username changes
  useEffect(() => {
    setShineKey((k) => k + 1)
    setFace(0)
    setAvatarFailed(false)
    setTooltipContent(null)
  }, [data?.profile?.username, data?.platform])

  useEffect(() => {
    setTooltipContent(null)
  }, [face])

  const goToStable = useCallback((i) => setFace(Math.max(0, Math.min(FACES.length - 1, i))), [])

  // Keyboard navigation (scoped to card element)
  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const onKey = (e) => {
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === 'ArrowLeft') goToStable(face - 1)
      else if (e.key === 'ArrowRight') goToStable(face + 1)
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [face])

  // Touch swipe
  const touchStart = useRef(null)
  const onTouchStart = (e) => {
    touchStart.current = e.touches[0].clientX
  }
  const onTouchEnd = (e) => {
    if (touchStart.current == null) return
    const delta = e.changedTouches[0].clientX - touchStart.current
    if (Math.abs(delta) > 50) {
      if (delta < 0) goToStable(face + 1)
      else goToStable(face - 1)
    }
    touchStart.current = null
  }

  if (!data) return null

  const handleMove = useCallback((e) => {
    if (reduce) return
    const cardEl = cardRef.current
    if (!cardEl) return
    const rect = cardEl.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    rx.set((0.5 - py) * 5)
    ry.set((px - 0.5) * 5)
    gx.set(px * 100)
    gy.set(py * 100)
    gOpacity.set(1)
  }, [cardRef, reduce, rx, ry, gx, gy, gOpacity])

  const handleEnter = () => {
    setBooped(true)
  }
  const handleLeave = () => {
    setBooped(false)
    rx.set(0)
    ry.set(0)
    gOpacity.set(0)
  }

  // Profile initials fallback helper
  const initials = (data.profile.name || data.profile.username || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  return (
    <div
      ref={cardRef}
      id="chesscard-canvas"
      className={[
        'group relative w-full max-w-[660px] transition-all duration-300 ease-boing',
        booped ? '-translate-y-1.5' : '',
      ].join(' ')}
      style={{ perspective: '1200px' }}
    >
      <motion.div
        ref={innerRef}
        onMouseEnter={handleEnter}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        tabIndex={0}
        role="region"
        aria-label="Chess player stats card"
        className={[
          'relative w-full rounded-2xl overflow-hidden bg-canvas dark:bg-canvas-dark',
          'border border-line dark:border-line-dark',
          'shadow-card dark:shadow-cardDark',
          'flex flex-col lg:flex-row min-h-[380px] lg:min-h-[400px]',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          booped
            ? 'shadow-lg'
            : '',
        ].join(' ')}
        style={{
          transformStyle: 'preserve-3d',
          transform: tiltTransform,
          touchAction: 'pan-y',
          willChange: 'transform',
        }}
      >

        {/* Glare */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-200 ease-snappy z-10"
          style={{
            opacity: gOpacity,
            background: glareBackground,
            mixBlendMode: 'soft-light',
          }}
        />

        {/* Shine Sweep */}
        <div key={shineKey} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl z-10">
          <div
            className="absolute -inset-y-2 -left-1/3 w-1/2 animate-[shineSweep_1200ms_ease-out_forwards]"
            style={{
              background:
                'linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.0) 30%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.0) 70%, transparent 100%)',
              mixBlendMode: 'soft-light',
            }}
          />
        </div>

        {/* ==================== LEFT COLUMN: PROFILE CARD ==================== */}
        <div className="w-full lg:w-[220px] shrink-0 border-b lg:border-b-0 lg:border-r border-line dark:border-line-dark p-4 sm:p-5 bg-chip/10 dark:bg-chip-dark/15 flex flex-col justify-between gap-4 relative z-10 overflow-hidden">
          {/* Left Column Parallax Watermark (Knight/Rook) centered to prevent shifting */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 select-none overflow-hidden rounded-2xl z-0"
            style={{ transform: watermarkTransform }}
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[200px] leading-none font-serif text-ink/[0.03] dark:text-ink-dark/[0.04] select-none">
              {data.platform === 'lichess' ? '♞' : '♜'}
            </div>
          </motion.div>

          {/* Profile Identity Block */}
          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative grid place-items-center h-12 w-12 min-h-[3rem] min-w-[3rem] rounded-full bg-chip dark:bg-chip-dark border border-line dark:border-line-dark text-ink dark:text-ink-dark font-sans text-lg font-bold overflow-hidden shrink-0 transition-transform duration-300 ease-out hover:scale-110 hover:rotate-[6deg]">
                {data.profile.avatar && !avatarFailed ? (
                  <img
                    src={data.profile.avatar}
                    alt={`Avatar of ${data.profile.username}`}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <span className="font-sans font-extrabold text-sm">{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0 w-full">
                  {data.profile.title && (
                    <span className="inline-flex items-center justify-center h-[18px] px-1.5 rounded text-[9px] font-extrabold tracking-wider bg-[#b33430] text-white uppercase shrink-0">
                      {data.profile.title}
                    </span>
                  )}
                  <h2 className="font-sans text-[17px] leading-tight font-bold tracking-tight truncate flex-1 min-w-0" title={data.profile.name || data.profile.username}>
                    {data.profile.name || data.profile.username}
                  </h2>
                </div>
                {(data.profile.name || data.profile.country) && (
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted dark:text-muted-dark min-w-0">
                    {data.profile.name && <span className="truncate min-w-0 flex-shrink">@{data.profile.username}</span>}
                    {data.profile.country && (
                      <>
                        {data.profile.name && <span className="shrink-0">·</span>}
                        <span className="truncate max-w-[100px] min-w-0" title={data.profile.country}>{data.profile.country}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Platform Badge */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted dark:text-muted-dark uppercase tracking-wider">Platform</span>
              <PlatformBadge platform={data.platform} />
            </div>
          </div>

          {/* Archetype Style Badge */}
          {data.insights?.style && (
            <div className="py-0.5 relative z-10">
              <StyleBadge style={data.insights.style} sampleSize={data.insights.sampleSize} />
            </div>
          )}

          {/* Primary stats block (Peak/Current/Puzzle) */}
          <div className="grid grid-cols-2 gap-2 mt-auto relative z-10">
            <Stat
              label="Peak"
              value={<AnimatedNumber value={data.primary.peak} />}
              sub={data.primary.label}
              icon={<Trophy className="h-3 w-3" />}
              emphasis
            />
            <Stat
              label="Live"
              value={<AnimatedNumber value={data.primary.rating} />}
              sub={data.primary.prog != null && data.primary.prog !== 0
                ? (data.primary.prog > 0 ? `▲ +${data.primary.prog}` : `▼ ${data.primary.prog}`)
                : 'Live'}
              icon={<Target className="h-3 w-3" />}
              subTone={data.primary.prog > 0 ? 'up' : data.primary.prog < 0 ? 'down' : 'neutral'}
            />
            {data.insights?.puzzleRating && (
              <div className="col-span-2">
                <Stat
                  label="Puzzle"
                  value={<AnimatedNumber value={data.insights.puzzleRating} />}
                  sub={data.insights.puzzlePercentile ? `top ${data.insights.puzzlePercentile}% Lichess` : 'Lichess'}
                  icon={<span className="font-serif text-[11px] leading-none">♝</span>}
                  subTone="up"
                />
              </div>
            )}
          </div>
        </div>

        {/* ==================== RIGHT COLUMN: TABS & DATA ==================== */}
        <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col justify-between gap-4 relative z-10">
          {/* Right Column Parallax Watermark (King/Queen) centered to prevent shifting */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 select-none overflow-hidden rounded-2xl z-0"
            style={{ transform: watermarkTransform }}
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[280px] leading-none font-serif text-ink/[0.04] dark:text-ink-dark/[0.05] select-none">
              {data.platform === 'lichess' ? '♔' : '♕'}
            </div>
          </motion.div>

          {/* Tab Selection */}
          <div className="relative z-10">
            <FaceNav active={face} onSelect={goToStable} />
          </div>

          {/* Swipeable content container */}
          <div className="relative overflow-hidden flex-1 flex flex-col min-h-[240px] md:min-h-[270px] z-10" aria-live="polite" style={{ contain: 'content' }}>
            <motion.div
              className="flex h-full"
              animate={{ x: `-${face * 100}%` }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
              style={{ willChange: 'transform' }}
            >
              <Face>
                <OverviewTab data={data} onHover={handleTooltipHover} />
              </Face>
              <Face>
                <RepertoireTab data={data} onHover={handleTooltipHover} />
              </Face>
              <Face>
                <InsightsTab data={data} isDark={isDark} onHover={handleTooltipHover} />
              </Face>
            </motion.div>
          </div>

          {/* Footer */}
          <footer className="relative z-10 flex items-center justify-between pt-1 gap-2 flex-wrap border-t-2 border-line/50 dark:border-line-dark/50">
            <LiveBadge
              fetchedAt={data.fetchedAt}
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
              source={source}
            />
            <span className="text-[9.5px] uppercase tracking-[0.14em] text-muted dark:text-muted-dark font-semibold">
              chesscard.studio
            </span>
          </footer>
        </div>
      </motion.div>

      {tooltipContent && (
        <motion.div
          className="absolute z-50 pointer-events-none bg-canvas dark:bg-canvas-dark border-2 border-line dark:border-line-dark px-2.5 py-1.5 text-[11px] font-mono text-ink dark:text-ink-dark shadow-[0_4px_12px_rgba(0,0,0,0.3)] select-none"
          style={{
            left: tx,
            top: ty,
            transform: 'translate(-50%, -105%)',
          }}
        >
          {tooltipContent}
        </motion.div>
      )}

      {/* Swipe buttons */}
      <ArrowButton direction="prev" onClick={() => goToStable(face - 1)} disabled={face === 0} />
      <ArrowButton direction="next" onClick={() => goToStable(face + 1)} disabled={face === FACES.length - 1} />
    </div>
  )
}

/* ----------------- Navigation chrome ----------------- */

const FaceNav = React.memo(function FaceNav({ active, onSelect }) {
  return (
    <div
      role="tablist"
      className="relative grid grid-cols-3 gap-1 p-1 rounded-full border border-line dark:border-line-dark bg-chip/50 dark:bg-chip-dark/50"
    >
      {FACES.map((f, i) => (
        <button
          key={f.key}
          role="tab"
          type="button"
          aria-selected={active === i}
          onClick={() => onSelect(i)}
          className={[
            'relative z-10 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-200 ease-out',
            active === i ? 'text-canvas-dark dark:text-canvas' : 'text-muted dark:text-muted-dark hover:text-ink dark:hover:text-ink-dark',
          ].join(' ')}
        >
          {f.label}
          {active === i && (
            <span
              aria-hidden
              className="absolute inset-0 -z-10 rounded-full bg-pixel-yellow"
              style={{ animation: 'punchIn 250ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
            />
          )}
        </button>
      ))}
    </div>
  )
})

const ArrowButton = React.memo(function ArrowButton({ direction, onClick, disabled }) {
  const isPrev = direction === 'prev'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isPrev ? 'Previous section' : 'Next section'}
      className={[
        'absolute top-1/2 -translate-y-1/2 z-20 hidden sm:grid place-items-center',
        'h-10 w-10 rounded-full border border-line dark:border-line-dark',
        'bg-canvas/95 dark:bg-canvas-dark/95 backdrop-blur shadow-md',
        'transition-all duration-200 ease-out',
        'hover:scale-105 active:scale-95',
        disabled ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100',
        isPrev ? 'left-[-20px] min-[820px]:left-[-48px]' : 'right-[-20px] min-[820px]:right-[-48px]',
      ].join(' ')}
    >
      <span className="font-sans text-[18px] leading-none text-ink dark:text-ink-dark">
        {isPrev ? '‹' : '›'}
      </span>
    </button>
  )
})

const Face = React.memo(function Face({ children }) {
  return (
    <div className="w-full h-full shrink-0 px-0.5 flex flex-col" style={{ minWidth: '100%' }}>
      {children}
    </div>
  )
})

/* ----------------- Sub Tabs ----------------- */

const OverviewTab = React.memo(function OverviewTab({ data, onHover }) {
  return (
    <div className="h-full overflow-y-auto pr-1 space-y-4 scrollbar-thin" style={{ scrollbarGutter: 'stable' }}>
      {/* Time controls comparison grid */}
      {data.perFormat?.length > 1 && (
        <Section delay={40}>
          <TimeControlGrid perFormat={data.perFormat} primaryKey={data.primary.key} onHover={onHover} />
        </Section>
      )}

      {/* Streak + Best Opening stats side by side */}
      <Section delay={120}>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-line dark:border-line-dark p-3 min-h-[96px] flex flex-col justify-between transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-pixel-yellow/50 hover:shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.08em] text-muted dark:text-muted-dark">
              <span className="flex items-center gap-1.5">
                <Flame className="h-3 w-3 text-pixel-yellow" />
                Streak
              </span>
              {data.insights?.longestStreak?.length > 0 && (
                <span className="text-[9px] text-muted dark:text-muted-dark tabular-nums normal-case font-medium tracking-normal">
                  best {data.insights.longestStreak.type}{data.insights.longestStreak.length}
                </span>
              )}
            </div>
            <div className="mt-1 font-sans text-[20px] leading-none font-extrabold tracking-tight">
              {formatStreak(data.streak)}
            </div>
            <div className="text-[10px] text-muted dark:text-muted-dark">
              {data.streak.sign === 'W' ? 'consecutive wins' : data.streak.sign === 'L' ? 'consecutive losses' : 'even'}
            </div>
          </div>

          <div className="rounded-xl border border-line dark:border-line-dark p-3 min-h-[96px] flex flex-col justify-between transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-pixel-red/50 hover:shadow-sm">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted dark:text-muted-dark">
              <Spark className="h-3 w-3 text-pixel-red" />
              Best opening
            </div>
            <div className="mt-1 font-sans text-[12px] sm:text-[13px] leading-tight font-bold tracking-tight truncate" title={data.insights?.signatureOpening?.name || data.topOpening || '—'}>
              {data.insights?.signatureOpening?.name || data.topOpening || '—'}
            </div>
            <div className="text-[10px] text-muted dark:text-muted-dark tabular-nums">
              {data.insights?.signatureOpening ? (
                <>
                  <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                    {Math.round(data.insights.signatureOpening.winRate * 100)}%
                  </span>{' '}
                  · {data.insights.signatureOpening.games}g
                </>
              ) : data.topOpeningGames ? (
                <>{compactNumber(data.topOpeningGames)} games</>
              ) : (
                '—'
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Recent Form */}
      {data.recentForm?.length > 0 && (
        <Section delay={200}>
          <div className="rounded-xl border border-line dark:border-line-dark p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted dark:text-muted-dark">
                Recent form
              </span>
              <span className="text-[10px] text-muted dark:text-muted-dark">
                last {data.recentForm.length} games
              </span>
            </div>
            <RecentForm form={data.recentForm} />
          </div>
        </Section>
      )}
    </div>
  )
})

const RepertoireTab = React.memo(function RepertoireTab({ data, onHover }) {
  const total = data.total?.games || 0
  const winPct = data.total?.winRate || 0
  const lossPct = total ? (data.total.losses || 0) / total : 0
  const drawPct = total ? (data.total.draws || 0) / total : 0

  return (
    <div className="h-full overflow-y-auto pr-1 space-y-4 scrollbar-thin" style={{ scrollbarGutter: 'stable' }}>
      {/* Ratio bar */}
      <Section delay={40}>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted dark:text-muted-dark">
              Record · {data.primary.label}
            </span>
            <span className="text-[11px] text-muted dark:text-muted-dark tabular-nums">
              <AnimatedNumber value={total} /> games
            </span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-chip dark:bg-chip-dark border border-line dark:border-line-dark">
            <Bar
              width={winPct}
              delay={100}
              className="bg-emerald-600 dark:bg-emerald-400"
              onMouseEnter={(e) => onHover?.(e, `Wins: ${(data.total.wins || 0).toLocaleString()} games (${formatPercent(winPct, 1)})`)}
              onMouseMove={(e) => onHover?.(e, `Wins: ${(data.total.wins || 0).toLocaleString()} games (${formatPercent(winPct, 1)})`)}
              onMouseLeave={() => onHover?.(null, null)}
            />
            <Bar
              width={drawPct}
              delay={200}
              className="bg-amber-500 dark:bg-amber-300"
              onMouseEnter={(e) => onHover?.(e, `Draws: ${(data.total.draws || 0).toLocaleString()} games (${formatPercent(drawPct, 1)})`)}
              onMouseMove={(e) => onHover?.(e, `Draws: ${(data.total.draws || 0).toLocaleString()} games (${formatPercent(drawPct, 1)})`)}
              onMouseLeave={() => onHover?.(null, null)}
            />
            <Bar
              width={lossPct}
              delay={300}
              className="bg-rose-600 dark:bg-rose-400"
              onMouseEnter={(e) => onHover?.(e, `Losses: ${(data.total.losses || 0).toLocaleString()} games (${formatPercent(lossPct, 1)})`)}
              onMouseMove={(e) => onHover?.(e, `Losses: ${(data.total.losses || 0).toLocaleString()} games (${formatPercent(lossPct, 1)})`)}
              onMouseLeave={() => onHover?.(null, null)}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <RatioCell label="Wins" value={data.total.wins} pct={winPct} tone="win" delay={180} />
            <RatioCell label="Draws" value={data.total.draws} pct={drawPct} tone="draw" delay={240} />
            <RatioCell label="Losses" value={data.total.losses} pct={lossPct} tone="loss" delay={300} />
          </div>
        </div>
      </Section>

      {/* Color Split */}
      {data.insights?.colorSplit && (
        <Section delay={120}>
          <ColorSplit data={data.insights.colorSplit} />
        </Section>
      )}

      {/* First Move */}
      {data.insights?.firstMove?.length > 0 && (
        <Section delay={200}>
          <FirstMove data={data.insights.firstMove} />
        </Section>
      )}
    </div>
  )
})

const InsightsTab = React.memo(function InsightsTab({ data, isDark, onHover }) {
  return (
    <div className="h-full overflow-y-auto pr-1 space-y-4 scrollbar-thin" style={{ scrollbarGutter: 'stable' }}>
      {/* Average Game Length */}
      <Section delay={40}>
        <div className="rounded-xl border border-line dark:border-line-dark p-3.5 flex items-center justify-between bg-gradient-to-r from-accent-soft/20 to-transparent dark:from-accent-softDark/10">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted dark:text-muted-dark">
            Average Game Length
          </span>
          <span className="font-sans font-extrabold text-[15px] tabular-nums">
            {data.insights?.avgLength || '—'} moves
          </span>
        </div>
      </Section>

      {/* Win Rate by Length */}
      {data.insights?.lengthBuckets?.some((b) => b.games > 0) && (
        <Section delay={100}>
          <WinRateByLength data={data.insights.lengthBuckets} isDark={isDark} onHover={onHover} />
        </Section>
      )}

      {/* Beating the Odds */}
      {data.insights?.beatingOdds && (
        <Section delay={160}>
          <BeatingTheOdds data={data.insights.beatingOdds} isDark={isDark} />
        </Section>
      )}

      {/* Time of Day */}
      {data.insights?.hourlyPlay?.length > 0 && (
        <Section delay={220}>
          <TimeOfDay hourlyPlay={data.insights.hourlyPlay} peakHour={data.insights.peakHour} isDark={isDark} onHover={onHover} />
        </Section>
      )}

      {/* Toughest Opponent */}
      {data.insights?.toughestOpponent && (
        <Section delay={280}>
          <ToughestOpponent data={data.insights.toughestOpponent} userRating={data.primary.rating} />
        </Section>
      )}
    </div>
  )
})

/* ----------------- Atoms ----------------- */

const Section = React.memo(function Section({ children, delay = 0 }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.3, delay: delay / 1000, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {children}
    </motion.div>
  )
})

function Bar({ width, delay, className, onMouseEnter, onMouseMove, onMouseLeave }) {
  return (
    <div
      className={['h-full transition-[width] duration-700 ease-boing origin-left cursor-pointer', className].join(' ')}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        width: `${width * 100}%`,
        transitionDelay: `${delay}ms`,
        animation: `barPop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms backwards`,
      }}
    />
  )
}

const Stat = React.memo(function Stat({ label, value, sub, icon, emphasis = false, subTone = 'neutral' }) {
  const reduce = useReducedMotion()
  const subColor =
    subTone === 'up'
      ? 'text-emerald-700 dark:text-emerald-300'
      : subTone === 'down'
      ? 'text-rose-700 dark:text-rose-300'
      : 'text-muted dark:text-muted-dark'
  return (
    <motion.div
      whileHover={reduce ? {} : { y: -2, transition: { type: 'spring', stiffness: 500, damping: 20 } }}
      className={[
        'rounded-xl border border-line dark:border-line-dark p-2.5 min-w-0 flex flex-col',
        'transition-all duration-200 ease-out',
        'hover:shadow-sm',
        emphasis
          ? 'bg-gradient-to-br from-accent-soft/45 to-transparent dark:from-accent-softDark/20'
          : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-muted dark:text-muted-dark">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-sans text-[18px] sm:text-[20px] leading-none font-extrabold tracking-tight">
        {value}
      </div>
      {sub && <div className={['mt-0.5 text-[9.5px] sm:text-[10px] truncate tabular-nums font-semibold', subColor].join(' ')} title={sub}>{sub}</div>}
    </motion.div>
  )
})

const RatioCell = React.memo(function RatioCell({ label, value, pct, tone, delay = 0 }) {
  const toneClass =
    tone === 'win'
      ? 'text-emerald-700 dark:text-emerald-300'
      : tone === 'loss'
      ? 'text-rose-700 dark:text-rose-300'
      : 'text-amber-700 dark:text-amber-300'
  const dotClass =
    tone === 'win'
      ? 'bg-emerald-600 dark:bg-emerald-400'
      : tone === 'loss'
      ? 'bg-rose-600 dark:bg-rose-400'
      : 'bg-amber-500 dark:bg-amber-400'
  return (
    <div
      className="rounded-lg border border-line dark:border-line-dark px-2 py-1.5 flex flex-col items-start hover:-translate-y-0.5 transition-all duration-200 ease-out"
      style={{ animation: `punchIn 400ms cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms backwards` }}
    >
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted dark:text-muted-dark whitespace-nowrap">
        <span className={['h-1.5 w-1.5 rounded-full shrink-0', dotClass].join(' ')} />
        {label}
      </div>
      <div className="mt-1 font-sans text-[13px] sm:text-[14px] leading-none font-extrabold tabular-nums">
        {compactNumber(value)}
      </div>
      <div className={['mt-0.5 text-[9px] sm:text-[9.5px] tabular-nums font-semibold', toneClass].join(' ')}>
        {formatPercent(pct, 1)}
      </div>
    </div>
  )
})

const PlatformBadge = React.memo(function PlatformBadge({ platform }) {
  const isLichess = platform === 'lichess'
  return (
    <span
      className={[
        'shrink-0 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
        'transition-transform duration-200 ease-boing hover:scale-105',
        isLichess
          ? 'bg-[#21201E] text-white dark:bg-[#312E2B]'
          : 'bg-[#81B64C] text-white',
      ].join(' ')}
    >
      {isLichess ? 'Lichess' : 'Chess.com'}
    </span>
  )
})
