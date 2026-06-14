import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, useReducedMotion, useSpring } from 'framer-motion'
import { Flame, Spark, Trophy } from './Icons'
import AnimatedNumber from './AnimatedNumber'
import LiveBadge from './LiveBadge'
import { compactNumber, formatPercent, formatStreak } from '../lib/format'

const FACES = [
  { key: 'ratings',    label: 'Formats' },
  { key: 'repertoire', label: 'Repertoire' },
  { key: 'matchup',    label: 'Matchup' },
]

export default function ComparisonCard({
  data1,
  data2,
  cardRef: externalCardRef,
  source1,
  source2,
  onRefresh,
  isRefreshing,
  isDark,
}) {
  const localCardRef = useRef(null)
  const cardRef = externalCardRef || localCardRef
  const innerRef = useRef(null)
  const reduce = useReducedMotion()
  const [booped, setBooped] = useState(false)
  const [shineKey, setShineKey] = useState(0)
  const [face, setFace] = useState(0)
  const [avatar1Failed, setAvatar1Failed] = useState(false)
  const [avatar2Failed, setAvatar2Failed] = useState(false)
  const [tooltipContent, setTooltipContent] = useState(null)
  const tx = useMotionValue(0)
  const ty = useMotionValue(0)

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

  // Derived transforms using spring values
  const tiltTransform = useTransform(
    [rxSpring, rySpring],
    ([latestRx, latestRy]) => `rotateX(${latestRx}deg) rotateY(${latestRy}deg)`
  )
  const glareBackground = useTransform(
    [gx, gy],
    ([latestGx, latestGy]) =>
      `radial-gradient(480px circle at ${latestGx}% ${latestGy}%, rgba(255,255,255,0.2), transparent 45%)`
  )
  const watermarkTransform = useTransform(
    [rySpring, rxSpring],
    ([latestRy, latestRx]) =>
      `translateZ(-30px) translateX(${-latestRy * 1.2}px) translateY(${latestRx * 1.2}px) ${booped ? 'scale(1.02)' : 'scale(1)'}`
  )

  // Reset face index and tooltip when profiles change
  useEffect(() => {
    setShineKey((k) => k + 1)
    setFace(0)
    setAvatar1Failed(false)
    setAvatar2Failed(false)
    setTooltipContent(null)
  }, [
    data1?.profile?.username,
    data1?.platform,
    data2?.profile?.username,
    data2?.platform,
  ])

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

  if (!data1 || !data2) return null

  const handleMove = useCallback((e) => {
    if (reduce) return
    const cardEl = cardRef.current
    if (!cardEl) return
    const rect = cardEl.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    rx.set((0.5 - py) * 4)
    ry.set((px - 0.5) * 4)
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

  // Profile initials fallbacks
  const initials1 = (data1.profile.name || data1.profile.username || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  const initials2 = (data2.profile.name || data2.profile.username || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  const r1 = data1.primary.rating
  const r2 = data2.primary.rating
  const ratingDelta = Math.abs(r1 - r2)

  return (
    <div
      ref={cardRef}
      id="chesscard-canvas"
      className={[
        'group relative w-full max-w-[780px] transition-transform duration-300 ease-boing',
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
        aria-label="Chess players comparison card"
        className={[
          'relative w-full rounded-2xl overflow-hidden bg-canvas dark:bg-canvas-dark',
          'border border-line dark:border-line-dark',
          'shadow-card dark:shadow-cardDark',
          'flex flex-col xl:flex-row min-h-[400px] xl:min-h-[420px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          'transition-all duration-200',
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
        {/* Parallax Watermark Kings/Queens */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 select-none overflow-hidden transition-transform duration-500 ease-boing"
          style={{ transform: watermarkTransform }}
        >
          <div className="absolute -right-4 -top-8 text-[320px] leading-none font-serif text-ink/[0.04] dark:text-ink-dark/[0.05]">
            ♔
          </div>
          <div className="absolute -left-6 -bottom-12 text-[240px] leading-none font-serif text-ink/[0.03] dark:text-ink-dark/[0.04]">
            ♕
          </div>
        </motion.div>

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
                'linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.0) 30%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0.0) 70%, transparent 100%)',
              transform: 'skewX(-20deg)',
              mixBlendMode: 'soft-light',
            }}
          />
        </div>

        {/* ==================== LEFT PANEL: PLAYER 1 PROFILE ==================== */}
        <div className="w-full xl:w-[200px] shrink-0 border-b xl:border-b-0 xl:border-r border-line dark:border-line-dark p-4 sm:p-5 bg-pixel-red/[0.03] dark:bg-pixel-red/[0.015] flex flex-col justify-between gap-3.5 relative z-10 overflow-hidden border-l-4 border-l-pixel-red xl:border-l-0">
          <div className="space-y-4 text-center xl:text-left">
            <div className="flex flex-col items-center xl:items-start gap-2.5">
              <div className="relative grid place-items-center h-12 w-12 min-h-[3rem] min-w-[3rem] rounded-full bg-chip dark:bg-chip-dark border border-pixel-red overflow-hidden shrink-0 transition-transform duration-300 ease-out hover:scale-105">
                {data1.profile.avatar && !avatar1Failed ? (
                  <img src={data1.profile.avatar} alt={`Avatar of ${data1.profile.username}`} className="h-full w-full object-cover" onError={() => setAvatar1Failed(true)} />
                ) : (
                  <span className="font-sans font-bold text-sm">{initials1}</span>
                )}
              </div>
              <div className="min-w-0 w-full">
                <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[8.5px] font-bold bg-pixel-red/10 text-pixel-red dark:bg-pixel-red/20 uppercase tracking-wide">
                  {data1.platform === 'lichess' ? 'Lichess' : 'Chess.com'}
                </span>
                <h2 className="mt-1 font-sans text-[16px] leading-tight font-bold truncate">
                  {data1.profile.name || data1.profile.username}
                </h2>
                <div className="mt-0.5 text-[11px] text-muted dark:text-muted-dark truncate">
                  @{data1.profile.username}
                </div>
              </div>
            </div>

            {/* P1 Main rating */}
            <div className="rounded-xl border border-pixel-red/20 p-3 flex flex-col bg-gradient-to-br from-pixel-red/[0.04] to-transparent">
              <div className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-pixel-red dark:text-pixel-red flex items-center gap-1">
                <Trophy className="h-3 w-3 text-amber-500" />
                P1 Peak / Live
              </div>
              <div className="mt-1 flex flex-col items-start leading-none">
                <span className="font-sans text-[18px] sm:text-[20px] font-extrabold leading-none tracking-tight tabular-nums">
                  <AnimatedNumber value={r1} />
                </span>
                <span className="text-[10px] text-muted dark:text-muted-dark font-sans font-semibold tabular-nums mt-0.5">
                  peak {data1.primary.peak}
                </span>
              </div>
              <div className="mt-1.5 text-[9px] text-muted dark:text-muted-dark font-bold uppercase tracking-wider">
                {data1.primary.label}
              </div>
            </div>
          </div>

          {/* Archetype badge P1 */}
          {data1.insights?.style && (
            <div className="rounded-xl border-2 border-line dark:border-line-dark p-3 bg-chip/40 dark:bg-chip-dark/25 relative overflow-hidden flex flex-col justify-between min-h-[96px] mt-2">
              <div className="absolute right-0 top-0 opacity-[0.06] text-[50px] leading-none font-serif select-none pointer-events-none">
                {data1.insights.style.icon}
              </div>
              <div>
                <div className="inline-flex rounded px-1 py-0.5 text-[7.5px] font-bold bg-line/60 dark:bg-line-dark/60 uppercase">
                  P1 Style
                </div>
                <div className="font-sans text-[13px] font-extrabold leading-tight mt-1 text-ink dark:text-ink-dark">
                  {data1.insights.style.archetype}
                </div>
              </div>
              <p className="text-[9.5px] leading-snug text-muted dark:text-muted-dark mt-1 select-none line-clamp-2">
                {data1.insights.style.tagline}
              </p>
            </div>
          )}
        </div>

        {/* ==================== CENTER PANEL: Matchup Hub & Stats ==================== */}
        <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col justify-between gap-3.5 relative z-10">
          {/* Matchup Header with VS circle and delta */}
          <div className="flex items-center justify-between gap-4 pb-2 border-b-2 border-line/50 dark:border-line-dark/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted dark:text-muted-dark truncate min-w-0">Matchup Details</span>
            
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="h-7 w-7 rounded-full bg-ink text-canvas dark:bg-ink-dark dark:text-canvas-dark border-2 border-line dark:border-line-dark grid place-items-center font-black text-[9px] shadow-sm select-none vs-glow shrink-0">
                VS
              </div>
              {ratingDelta > 0 && (
                <span className="text-[9px] font-extrabold text-accent bg-accent/10 rounded px-1.5 py-0.5 uppercase tracking-wider whitespace-nowrap">
                  Δ {ratingDelta} pts
                </span>
              )}
            </div>
          </div>

          {/* Navigation tabs */}
          <FaceNav active={face} onSelect={goToStable} />

          {/* Tab content slider */}
          <div className="relative overflow-hidden flex-1 flex flex-col min-h-[200px] md:min-h-[220px]" aria-live="polite" style={{ contain: 'content' }}>
            <motion.div
              className="flex h-full"
              animate={{ x: `-${face * 100}%` }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
              style={{ willChange: 'transform' }}
            >
              <Face>
                <FormatsTab data1={data1} data2={data2} onHover={handleTooltipHover} />
              </Face>
              <Face>
                <RepertoireTab data1={data1} data2={data2} onHover={handleTooltipHover} />
              </Face>
              <Face>
                <MatchupTab data1={data1} data2={data2} source1={source1} source2={source2} onRefresh={onRefresh} isRefreshing={isRefreshing} />
              </Face>
            </motion.div>
          </div>
        </div>

        {/* ==================== RIGHT PANEL: PLAYER 2 PROFILE ==================== */}
        <div className="w-full xl:w-[200px] shrink-0 border-t xl:border-t-0 xl:border-l border-line dark:border-line-dark p-4 sm:p-5 bg-pixel-green/[0.03] dark:bg-pixel-green/[0.015] flex flex-col justify-between gap-3.5 relative z-10 overflow-hidden order-last xl:order-none border-r-4 border-r-pixel-green xl:border-r-0 xl:border-l-pixel-green">
          <div className="space-y-4 text-center xl:text-left">
            <div className="flex flex-col items-center xl:items-start gap-2.5">
              <div className="relative grid place-items-center h-12 w-12 min-h-[3rem] min-w-[3rem] rounded-full bg-chip dark:bg-chip-dark border border-pixel-green overflow-hidden shrink-0 transition-transform duration-300 ease-out hover:scale-105">
                {data2.profile.avatar && !avatar2Failed ? (
                  <img src={data2.profile.avatar} alt={`Avatar of ${data2.profile.username}`} className="h-full w-full object-cover" onError={() => setAvatar2Failed(true)} />
                ) : (
                  <span className="font-sans font-bold text-sm">{initials2}</span>
                )}
              </div>
              <div className="min-w-0 w-full">
                <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[8.5px] font-bold bg-pixel-green/10 text-pixel-green dark:bg-pixel-green/20 uppercase tracking-wide">
                  {data2.platform === 'lichess' ? 'Lichess' : 'Chess.com'}
                </span>
                <h2 className="mt-1 font-sans text-[16px] leading-tight font-bold truncate">
                  {data2.profile.name || data2.profile.username}
                </h2>
                <div className="mt-0.5 text-[11px] text-muted dark:text-muted-dark truncate">
                  @{data2.profile.username}
                </div>
              </div>
            </div>

            {/* P2 Main rating */}
            <div className="rounded-xl border border-pixel-green/20 p-3 flex flex-col bg-gradient-to-br from-pixel-green/[0.04] to-transparent">
              <div className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-pixel-green dark:text-pixel-green flex items-center gap-1">
                <Trophy className="h-3 w-3 text-amber-500" />
                P2 Peak / Live
              </div>
              <div className="mt-1 flex flex-col items-start leading-none">
                <span className="font-sans text-[18px] sm:text-[20px] font-extrabold leading-none tracking-tight tabular-nums">
                  <AnimatedNumber value={r2} />
                </span>
                <span className="text-[10px] text-muted dark:text-muted-dark font-sans font-semibold tabular-nums mt-0.5">
                  peak {data2.primary.peak}
                </span>
              </div>
              <div className="mt-1.5 text-[9px] text-muted dark:text-muted-dark font-bold uppercase tracking-wider">
                {data2.primary.label}
              </div>
            </div>
          </div>

          {/* Archetype badge P2 */}
          {data2.insights?.style && (
            <div className="rounded-xl border-2 border-line dark:border-line-dark p-3 bg-chip/40 dark:bg-chip-dark/25 relative overflow-hidden flex flex-col justify-between min-h-[96px] mt-2">
              <div className="absolute right-0 top-0 opacity-[0.06] text-[50px] leading-none font-serif select-none pointer-events-none">
                {data2.insights.style.icon}
              </div>
              <div>
                <div className="inline-flex rounded px-1 py-0.5 text-[7.5px] font-bold bg-line/60 dark:bg-line-dark/60 uppercase">
                  P2 Style
                </div>
                <div className="font-sans text-[13px] font-extrabold leading-tight mt-1 text-ink dark:text-ink-dark">
                  {data2.insights.style.archetype}
                </div>
              </div>
              <p className="text-[9.5px] leading-snug text-muted dark:text-muted-dark mt-1 select-none line-clamp-2">
                {data2.insights.style.tagline}
              </p>
            </div>
          )}
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
            'relative z-10 px-2 py-1.5 rounded-full text-[9.5px] font-bold uppercase tracking-[0.12em] whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-200 ease-out',
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

const FormatsTab = React.memo(function FormatsTab({ data1, data2, onHover }) {
  const getRatingForFormat = (data, formatKey) => {
    const found = data.perFormat.find((f) => {
      const fKey = f.key.startsWith('chess_') ? f.key.replace('chess_', '') : f.key
      return fKey.toLowerCase() === formatKey.toLowerCase()
    })
    return found ? found.rating : null
  }

  const getRecordForFormat = (data, formatKey) => {
    const found = data.perFormat.find((f) => {
      const fKey = f.key.startsWith('chess_') ? f.key.replace('chess_', '') : f.key
      return fKey.toLowerCase() === formatKey.toLowerCase()
    })
    return found?.record || { win: 0, loss: 0, draw: 0 }
  }

  const formats = ['blitz', 'rapid', 'bullet']

  return (
    <div className="h-full overflow-y-auto pr-1 space-y-3 font-mono text-[10.5px] leading-normal pt-1.5 scrollbar-thin" style={{ scrollbarGutter: 'stable' }}>
      {formats.map((fmt) => {
        const p1Val = getRatingForFormat(data1, fmt)
        const p2Val = getRatingForFormat(data2, fmt)
        if (p1Val == null && p2Val == null) return null

        const showP1Wins = p1Val !== null && p2Val !== null && p1Val > p2Val
        const showP2Wins = p1Val !== null && p2Val !== null && p2Val > p1Val

        const p1ValOrZero = p1Val || 0
        const p2ValOrZero = p2Val || 0
        const sum = p1ValOrZero + p2ValOrZero
        const ratio = sum > 0 ? (p1ValOrZero / sum) * 100 : 50
        const delta = p1Val !== null && p2Val !== null ? Math.abs(p1Val - p2Val) : null

        const rec1 = getRecordForFormat(data1, fmt)
        const rec2 = getRecordForFormat(data2, fmt)
        const t1 = (rec1.win || 0) + (rec1.loss || 0) + (rec1.draw || 0)
        const t2 = (rec2.win || 0) + (rec2.loss || 0) + (rec2.draw || 0)
        const wr1 = t1 ? Math.round((rec1.win / t1) * 100) : 0
        const wr2 = t2 ? Math.round((rec2.win / t2) * 100) : 0

        return (
          <div key={fmt} className="border-b border-line/45 dark:border-line-dark/40 pb-2 last:border-b-0 last:pb-0 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-sans font-bold capitalize text-ink dark:text-ink-dark">
                {fmt}
              </span>
              <div className="flex items-center gap-3">
                <span className={['tabular-nums text-right', showP1Wins ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted'].join(' ')}>
                  P1: {p1Val || '—'} {showP1Wins && '▲'}
                </span>
                <span className={['tabular-nums text-right', showP2Wins ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted'].join(' ')}>
                  P2: {p2Val || '—'} {showP2Wins && '▲'}
                </span>
              </div>
            </div>
            {/* Comparative bar */}
            <div
              className="h-1.5 w-full rounded-full overflow-hidden bg-chip dark:bg-chip-dark border border-line/30 flex cursor-pointer"
              onMouseEnter={(e) => onHover?.(e, `${fmt.toUpperCase()} Rating · P1 ${p1Val || '—'} vs P2 ${p2Val || '—'}${delta !== null ? ` (Gap: ${delta} pts)` : ''}`)}
              onMouseMove={(e) => onHover?.(e, `${fmt.toUpperCase()} Rating · P1 ${p1Val || '—'} vs P2 ${p2Val || '—'}${delta !== null ? ` (Gap: ${delta} pts)` : ''}`)}
              onMouseLeave={() => onHover?.(null, null)}
            >
              <div className="h-full bg-accent" style={{ width: `${ratio}%` }} />
              <div className="h-full bg-ink/75 dark:bg-ink-dark/75" style={{ width: `${100 - ratio}%` }} />
            </div>
            {/* Records line */}
            <div className="flex justify-between text-[8.5px] text-muted dark:text-muted-dark font-sans font-medium px-0.5 leading-none">
              <span
                className="cursor-pointer hover:text-ink dark:hover:text-ink-dark transition-colors"
                onMouseEnter={(e) => {
                  if (rec1 && (rec1.win || rec1.loss || rec1.draw)) {
                    onHover?.(e, `P1 Wins: ${rec1.win.toLocaleString()} · Losses: ${rec1.loss.toLocaleString()} · Draws: ${rec1.draw.toLocaleString()}`)
                  }
                }}
                onMouseMove={(e) => {
                  if (rec1 && (rec1.win || rec1.loss || rec1.draw)) {
                    onHover?.(e, `P1 Wins: ${rec1.win.toLocaleString()} · Losses: ${rec1.loss.toLocaleString()} · Draws: ${rec1.draw.toLocaleString()}`)
                  }
                }}
                onMouseLeave={() => onHover?.(null, null)}
              >
                {t1 > 0 ? `${wr1}% WR (${t1} g)` : 'no record'}
              </span>
              <span
                className="cursor-pointer hover:text-ink dark:hover:text-ink-dark transition-colors"
                onMouseEnter={(e) => {
                  if (rec2 && (rec2.win || rec2.loss || rec2.draw)) {
                    onHover?.(e, `P2 Wins: ${rec2.win.toLocaleString()} · Losses: ${rec2.loss.toLocaleString()} · Draws: ${rec2.draw.toLocaleString()}`)
                  }
                }}
                onMouseMove={(e) => {
                  if (rec2 && (rec2.win || rec2.loss || rec2.draw)) {
                    onHover?.(e, `P2 Wins: ${rec2.win.toLocaleString()} · Losses: ${rec2.loss.toLocaleString()} · Draws: ${rec2.draw.toLocaleString()}`)
                  }
                }}
                onMouseLeave={() => onHover?.(null, null)}
              >
                {t2 > 0 ? `${wr2}% WR (${t2} g)` : 'no record'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
})

const RepertoireTab = React.memo(function RepertoireTab({ data1, data2, onHover }) {
  const getRecordDetails = (data) => {
    const total = data.total?.games || 0
    const wins = data.total?.wins || 0
    const losses = data.total?.losses || 0
    const draws = data.total?.draws || 0
    const winRate = data.total?.winRate || 0
    const lossRate = total ? losses / total : 0
    const drawRate = total ? draws / total : 0
    return { total, wins, losses, draws, winRate, lossRate, drawRate }
  }

  const rec1 = getRecordDetails(data1)
  const rec2 = getRecordDetails(data2)

  const getColorDetails = (d) => {
    const split = d.insights?.colorSplit
    const whiteWr = split?.white?.winRate || 0
    const blackWr = split?.black?.winRate || 0
    return { whiteWr, blackWr }
  }

  const col1 = getColorDetails(data1)
  const col2 = getColorDetails(data2)

  const p1WhiteSplit = data1.insights?.colorSplit?.white
  const p2WhiteSplit = data2.insights?.colorSplit?.white
  const p1BlackSplit = data1.insights?.colorSplit?.black
  const p2BlackSplit = data2.insights?.colorSplit?.black

  return (
    <div className="h-full overflow-y-auto pr-1 space-y-3 pt-1 scrollbar-thin" style={{ scrollbarGutter: 'stable' }}>
      {/* Player 1 Record */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[9px]">
          <span className="font-semibold uppercase text-muted dark:text-muted-dark truncate max-w-[50%]">
            P1: {data1.primary.label}
          </span>
          <span className="tabular-nums font-semibold text-muted dark:text-muted-dark">
            {rec1.total} games ({formatPercent(rec1.winRate, 0)} WR)
          </span>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full border border-line dark:border-line-dark bg-chip">
          <div
            className="h-full bg-emerald-600 dark:bg-emerald-400 cursor-pointer"
            style={{ width: `${rec1.winRate * 100}%` }}
            onMouseEnter={(e) => onHover?.(e, `P1 Wins: ${rec1.wins.toLocaleString()} games (${formatPercent(rec1.winRate, 1)})`)}
            onMouseMove={(e) => onHover?.(e, `P1 Wins: ${rec1.wins.toLocaleString()} games (${formatPercent(rec1.winRate, 1)})`)}
            onMouseLeave={() => onHover?.(null, null)}
          />
          <div
            className="h-full bg-amber-500 dark:bg-amber-300 cursor-pointer"
            style={{ width: `${rec1.drawRate * 100}%` }}
            onMouseEnter={(e) => onHover?.(e, `P1 Draws: ${rec1.draws.toLocaleString()} games (${formatPercent(rec1.drawRate, 1)})`)}
            onMouseMove={(e) => onHover?.(e, `P1 Draws: ${rec1.draws.toLocaleString()} games (${formatPercent(rec1.drawRate, 1)})`)}
            onMouseLeave={() => onHover?.(null, null)}
          />
          <div
            className="h-full bg-rose-600 dark:bg-rose-400 cursor-pointer"
            style={{ width: `${rec1.lossRate * 100}%` }}
            onMouseEnter={(e) => onHover?.(e, `P1 Losses: ${rec1.losses.toLocaleString()} games (${formatPercent(rec1.lossRate, 1)})`)}
            onMouseMove={(e) => onHover?.(e, `P1 Losses: ${rec1.losses.toLocaleString()} games (${formatPercent(rec1.lossRate, 1)})`)}
            onMouseLeave={() => onHover?.(null, null)}
          />
        </div>
      </div>

      {/* Player 2 Record */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[9px]">
          <span className="font-semibold uppercase text-muted dark:text-muted-dark truncate max-w-[50%]">
            P2: {data2.primary.label}
          </span>
          <span className="tabular-nums font-semibold text-muted dark:text-muted-dark">
            {rec2.total} games ({formatPercent(rec2.winRate, 0)} WR)
          </span>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full border border-line dark:border-line-dark bg-chip">
          <div
            className="h-full bg-emerald-600 dark:bg-emerald-400 cursor-pointer"
            style={{ width: `${rec2.winRate * 100}%` }}
            onMouseEnter={(e) => onHover?.(e, `P2 Wins: ${rec2.wins.toLocaleString()} games (${formatPercent(rec2.winRate, 1)})`)}
            onMouseMove={(e) => onHover?.(e, `P2 Wins: ${rec2.wins.toLocaleString()} games (${formatPercent(rec2.winRate, 1)})`)}
            onMouseLeave={() => onHover?.(null, null)}
          />
          <div
            className="h-full bg-amber-500 dark:bg-amber-300 cursor-pointer"
            style={{ width: `${rec2.drawRate * 100}%` }}
            onMouseEnter={(e) => onHover?.(e, `P2 Draws: ${rec2.draws.toLocaleString()} games (${formatPercent(rec2.drawRate, 1)})`)}
            onMouseMove={(e) => onHover?.(e, `P2 Draws: ${rec2.draws.toLocaleString()} games (${formatPercent(rec2.drawRate, 1)})`)}
            onMouseLeave={() => onHover?.(null, null)}
          />
          <div
            className="h-full bg-rose-600 dark:bg-rose-400 cursor-pointer"
            style={{ width: `${rec2.lossRate * 100}%` }}
            onMouseEnter={(e) => onHover?.(e, `P2 Losses: ${rec2.losses.toLocaleString()} games (${formatPercent(rec2.lossRate, 1)})`)}
            onMouseMove={(e) => onHover?.(e, `P2 Losses: ${rec2.losses.toLocaleString()} games (${formatPercent(rec2.lossRate, 1)})`)}
            onMouseLeave={() => onHover?.(null, null)}
          />
        </div>
      </div>

      {/* Color Split Comparison */}
      <div className="rounded-xl border border-line dark:border-line-dark p-2 bg-chip/5 dark:bg-chip-dark/5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="text-[9px] font-semibold uppercase text-muted dark:text-muted-dark flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full border border-line bg-canvas dark:bg-canvas-dark dark:border-line-dark" />
              As White
            </div>
            <div className="flex justify-between text-[9.5px] font-mono tabular-nums">
              <span
                className={['cursor-pointer', col1.whiteWr > col2.whiteWr ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-muted'].join(' ')}
                onMouseEnter={(e) => {
                  if (p1WhiteSplit) {
                    onHover?.(e, `P1 White · Wins: ${p1WhiteSplit.wins} · Losses: ${p1WhiteSplit.losses} · Draws: ${p1WhiteSplit.draws}`)
                  }
                }}
                onMouseMove={(e) => {
                  if (p1WhiteSplit) {
                    onHover?.(e, `P1 White · Wins: ${p1WhiteSplit.wins} · Losses: ${p1WhiteSplit.losses} · Draws: ${p1WhiteSplit.draws}`)
                  }
                }}
                onMouseLeave={() => onHover?.(null, null)}
              >
                P1: {formatPercent(col1.whiteWr, 0)}
              </span>
              <span
                className={['cursor-pointer', col2.whiteWr > col1.whiteWr ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-muted'].join(' ')}
                onMouseEnter={(e) => {
                  if (p2WhiteSplit) {
                    onHover?.(e, `P2 White · Wins: ${p2WhiteSplit.wins} · Losses: ${p2WhiteSplit.losses} · Draws: ${p2WhiteSplit.draws}`)
                  }
                }}
                onMouseMove={(e) => {
                  if (p2WhiteSplit) {
                    onHover?.(e, `P2 White · Wins: ${p2WhiteSplit.wins} · Losses: ${p2WhiteSplit.losses} · Draws: ${p2WhiteSplit.draws}`)
                  }
                }}
                onMouseLeave={() => onHover?.(null, null)}
              >
                P2: {formatPercent(col2.whiteWr, 0)}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[9px] font-semibold uppercase text-muted dark:text-muted-dark flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-ink dark:bg-ink-dark border border-line dark:border-line-dark" />
              As Black
            </div>
            <div className="flex justify-between text-[9.5px] font-mono tabular-nums">
              <span
                className={['cursor-pointer', col1.blackWr > col2.blackWr ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-muted'].join(' ')}
                onMouseEnter={(e) => {
                  if (p1BlackSplit) {
                    onHover?.(e, `P1 Black · Wins: ${p1BlackSplit.wins} · Losses: ${p1BlackSplit.losses} · Draws: ${p1BlackSplit.draws}`)
                  }
                }}
                onMouseMove={(e) => {
                  if (p1BlackSplit) {
                    onHover?.(e, `P1 Black · Wins: ${p1BlackSplit.wins} · Losses: ${p1BlackSplit.losses} · Draws: ${p1BlackSplit.draws}`)
                  }
                }}
                onMouseLeave={() => onHover?.(null, null)}
              >
                P1: {formatPercent(col1.blackWr, 0)}
              </span>
              <span
                className={['cursor-pointer', col2.blackWr > col1.blackWr ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-muted'].join(' ')}
                onMouseEnter={(e) => {
                  if (p2BlackSplit) {
                    onHover?.(e, `P2 Black · Wins: ${p2BlackSplit.wins} · Losses: ${p2BlackSplit.losses} · Draws: ${p2BlackSplit.draws}`)
                  }
                }}
                onMouseMove={(e) => {
                  if (p2BlackSplit) {
                    onHover?.(e, `P2 Black · Wins: ${p2BlackSplit.wins} · Losses: ${p2BlackSplit.losses} · Draws: ${p2BlackSplit.draws}`)
                  }
                }}
                onMouseLeave={() => onHover?.(null, null)}
              >
                P2: {formatPercent(col2.blackWr, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Average Game Length */}
      <div className="flex items-center justify-between text-[9.5px] text-muted dark:text-muted-dark font-sans leading-none border-t border-line/40 dark:border-line-dark/40 pt-1.5">
        <span>Average game length:</span>
        <div className="font-mono">
          <span>P1: {data1.insights?.avgLength || '—'} mov</span>
          <span className="mx-1.5 text-line">|</span>
          <span>P2: {data2.insights?.avgLength || '—'} mov</span>
        </div>
      </div>
    </div>
  )
})

const MatchupTab = React.memo(function MatchupTab({ data1, data2, source1, source2, onRefresh, isRefreshing }) {
  const s1 = data1.insights?.style
  const s2 = data2.insights?.style

  const getMatchupAnalysis = (arch1, arch2) => {
    if (!arch1 || !arch2) return 'Two unique chess styles face off. Prepare for an unpredictable game!'
    if (arch1 === arch2) {
      return `Mirror Match: Both players share the ${arch1} archetype. A symmetrical, psychological test of consistency.`
    }
    const desc = {
      'BERSERKER': 'uses raw speed, clocks, and time pressure',
      'SCHOLAR': 'focuses heavily on pattern recall, puzzles, and tactics',
      'TACTICIAN': 'excels in sharp, double-edged complications',
      'GRINDER': 'relies on massive game volumes and persistence',
      'MARATHONER': 'prefers deep endgames and long-winding structures',
      'DIPLOMAT': 'defends cleanly and frequently draws games',
      'SPEED DEMON': 'lives in blitz/bullet clock limits',
      'GIANT KILLER': 'excels when punching above their rating class',
      'SPECIALIST': 'is highly prepared in specific openings',
      'WHITE KNIGHT': 'dominates with first-move white advantage',
      'SHADOW PLAY': 'is lethal playing counterattacks as Black',
      'BALANCED': 'plays a steady, multi-faceted game',
    }
    const d1 = desc[arch1] || 'brings a distinct plan'
    const d2 = desc[arch2] || 'brings a distinct plan'
    return `P1 (${arch1}) ${d1}, while P2 (${arch2}) ${d2}. Expect a clash of approaches!`
  }

  const analysisText = getMatchupAnalysis(s1?.archetype, s2?.archetype)

  return (
    <div className="h-full overflow-y-auto pr-1 space-y-3 pt-1 flex flex-col justify-between scrollbar-thin" style={{ scrollbarGutter: 'stable' }}>
      {/* Matchup Analysis text box */}
      <div className="rounded-xl border border-line dark:border-line-dark p-3.5 bg-gradient-to-br from-accent-soft/10 to-transparent dark:from-accent-softDark/10">
        <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted dark:text-muted-dark mb-1 flex items-center gap-1.5">
          <Spark className="h-3.5 w-3.5 text-pixel-yellow shrink-0" />
          Style Matchup Analysis
        </div>
        <p className="text-[11.5px] leading-relaxed text-ink/85 dark:text-ink-dark/85 italic line-clamp-3 font-sans">
          "{analysisText}"
        </p>
      </div>

      {/* Openings side by side */}
      <div className="grid grid-cols-2 gap-2">
        {/* P1 Favorite opening */}
        <div className="rounded-xl border border-pixel-red/20 p-2 min-w-0 bg-pixel-red/[0.02] flex flex-col justify-between">
          <div>
            <div className="text-[8.5px] font-bold uppercase tracking-wider text-pixel-red truncate">
              P1 Opening
            </div>
            <div className="font-sans font-bold text-[11px] sm:text-[12px] truncate mt-1 text-ink dark:text-ink-dark" title={data1.insights?.signatureOpening?.name || data1.topOpening || '—'}>
              {data1.insights?.signatureOpening?.name || data1.topOpening || '—'}
            </div>
          </div>
          {data1.insights?.signatureOpening ? (
            <div className="flex justify-between items-center text-[8.5px] text-muted dark:text-muted-dark mt-2 pt-1.5 border-t border-line/30 dark:border-line-dark/30 font-mono leading-none">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{Math.round(data1.insights.signatureOpening.winRate * 100)}% WR</span>
              <span>{data1.insights.signatureOpening.games} games</span>
            </div>
          ) : (
            <div className="flex justify-between items-center text-[8.5px] text-muted dark:text-muted-dark mt-2 pt-1.5 border-t border-line/30 dark:border-line-dark/30 font-mono leading-none">
              <span>—</span>
            </div>
          )}
        </div>

        {/* P2 Favorite opening */}
        <div className="rounded-xl border border-pixel-green/20 p-2 min-w-0 bg-pixel-green/[0.02] flex flex-col justify-between">
          <div>
            <div className="text-[8.5px] font-bold uppercase tracking-wider text-pixel-green truncate">
              P2 Opening
            </div>
            <div className="font-sans font-bold text-[11px] sm:text-[12px] truncate mt-1 text-ink dark:text-ink-dark" title={data2.insights?.signatureOpening?.name || data2.topOpening || '—'}>
              {data2.insights?.signatureOpening?.name || data2.topOpening || '—'}
            </div>
          </div>
          {data2.insights?.signatureOpening ? (
            <div className="flex justify-between items-center text-[8.5px] text-muted dark:text-muted-dark mt-2 pt-1.5 border-t border-line/30 dark:border-line-dark/30 font-mono leading-none">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{Math.round(data2.insights.signatureOpening.winRate * 100)}% WR</span>
              <span>{data2.insights.signatureOpening.games} games</span>
            </div>
          ) : (
            <div className="flex justify-between items-center text-[8.5px] text-muted dark:text-muted-dark mt-2 pt-1.5 border-t border-line/30 dark:border-line-dark/30 font-mono leading-none">
              <span>—</span>
            </div>
          )}
        </div>
      </div>

      {/* Live Badge and Refresh section */}
      <div className="flex justify-between items-center mt-1 pt-1.5 border-t border-line/45 dark:border-line-dark/45">
        <LiveBadge
          fetchedAt={data1.fetchedAt}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          source={source1 === 'demo' && source2 === 'demo' ? 'demo' : 'api'}
        />
        <div className="flex gap-2 text-[9px] font-sans font-semibold uppercase tracking-wider text-muted dark:text-muted-dark">
          {data1.streak?.count > 0 && <span>P1 str: {formatStreak(data1.streak)}</span>}
          {data2.streak?.count > 0 && <span>P2 str: {formatStreak(data2.streak)}</span>}
        </div>
      </div>
    </div>
  )
})


