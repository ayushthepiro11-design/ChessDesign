import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { useSafeReducedMotion } from '../lib/useSafeReducedMotion'
import { Flame, Spark, Trophy } from './Icons'
import AnimatedNumber from './AnimatedNumber'
import LiveBadge from './LiveBadge'
import { compactNumber, formatPercent, formatStreak } from '../lib/format'
import StyleBadge from './StyleBadge'


const FACES = [
  { key: 'ratings',    label: 'Formats' },
  { key: 'repertoire', label: 'Repertoire' },
  { key: 'matchup',    label: 'Matchup' },
]

export default React.memo(function ComparisonCard({
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
  const reduce = useSafeReducedMotion()
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

  // Reset navigation index and local caches on profile parameter changes.
  useEffect(() => {
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

  // Scoped keyboard listener for tab panel transitions.
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

  // Touch event tracking for mobile swipe gestures.
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

  // Helper to extract player initials for fallback avatar representations.
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
      className="group relative w-full max-w-[720px] sm:max-w-[760px] transition-transform duration-300 ease-boing"
    >
      <div
        ref={innerRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        tabIndex={0}
        role="region"
        aria-label="Chess players comparison card"
        className={[
          'relative w-full rounded-2xl overflow-hidden bg-canvas dark:bg-canvas-dark',
          'border border-line dark:border-line-dark',
          'shadow-card dark:shadow-cardDark',
          'flex flex-col min-h-[210px] lg:min-h-[220px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          'transition-all duration-200',
          'hover:shadow-md',
        ].join(' ')}
        style={{
          touchAction: 'pan-y',
        }}
      >
        {/* Centered profile watermark */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 select-none overflow-hidden"
        >
          <div className="absolute -right-4 -top-8 text-[250px] leading-none font-serif text-ink/[0.04] dark:text-ink-dark/[0.05]">
            ♔
          </div>
          <div className="absolute -left-6 -bottom-12 text-[190px] leading-none font-serif text-ink/[0.03] dark:text-ink-dark/[0.04]">
            ♕
          </div>
        </div>

        {/* Top Header Panel: Player 1 Profile & Ratings VS Player 2 Profile & Ratings */}
        <div className="w-full border-b border-line dark:border-line-dark p-2.5 sm:p-3.5 bg-chip/5 dark:bg-chip-dark/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 overflow-hidden">
          
          {/* Player 1 details */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 border-l-4 border-l-pixel-red pl-2.5 sm:border-l-0 sm:pl-0">
            <div className="relative grid place-items-center h-9 w-9 sm:h-10 sm:w-10 min-h-[2.25rem] sm:min-h-[2.5rem] min-w-[2.25rem] sm:min-w-[2.5rem] rounded-full bg-chip dark:bg-chip-dark border border-pixel-red overflow-hidden shrink-0 transition-transform duration-300 ease-out hover:scale-105">
              {data1.profile.avatar && !avatar1Failed ? (
                <img src={data1.profile.avatar} alt={`Avatar of ${data1.profile.username}`} className="h-full w-full object-cover" loading="lazy" onError={() => setAvatar1Failed(true)} />
              ) : (
                <span className="font-sans font-bold text-xs">{initials1}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[7px] sm:text-[8px] font-bold bg-pixel-red/10 text-pixel-red dark:bg-pixel-red/20 uppercase tracking-wide">
                  {data1.platform === 'lichess' ? 'Lichess' : 'Chess.com'}
                </span>
                <h2 className="font-sans text-[13px] sm:text-[14px] leading-tight font-bold truncate">
                  {data1.profile.name || data1.profile.username}
                </h2>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted dark:text-muted-dark flex-wrap">
                <span>@{data1.profile.username}</span>
                <span className="text-muted/40">•</span>
                <span className="font-bold text-ink dark:text-ink-dark">Peak {data1.primary.peak} / Live {r1}</span>
              </div>
              {data1.insights?.style && (
                <div className="mt-1">
                  <StyleBadge style={data1.insights.style} sampleSize={data1.insights.sampleSize} compact />
                </div>
              )}
            </div>
          </div>

          {/* VS badge in center */}
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 shrink-0 justify-center min-w-0">
            <div className="h-7 w-7 rounded-full bg-ink text-canvas dark:bg-ink-dark dark:text-canvas-dark border-2 border-line dark:border-line-dark grid place-items-center font-black text-[9px] shadow-sm select-none vs-glow shrink-0">
              VS
            </div>
            {ratingDelta > 0 && (
              <span className="text-[9px] font-extrabold text-accent bg-accent/10 rounded px-1.5 py-0.5 uppercase tracking-wider whitespace-nowrap">
                Δ {ratingDelta} pts
              </span>
            )}
          </div>

          {/* Player 2 details */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 border-l-4 border-l-pixel-green pl-2.5 sm:border-l-0 sm:pl-0 sm:justify-end sm:text-right">
            <div className="flex sm:flex-row-reverse items-center gap-3 min-w-0 w-full justify-start">
              <div className="relative grid place-items-center h-9 w-9 sm:h-10 sm:w-10 min-h-[2.25rem] sm:min-h-[2.5rem] min-w-[2.25rem] sm:min-w-[2.5rem] rounded-full bg-chip dark:bg-chip-dark border border-pixel-green overflow-hidden shrink-0 transition-transform duration-300 ease-out hover:scale-105">
                {data2.profile.avatar && !avatar2Failed ? (
                  <img src={data2.profile.avatar} alt={`Avatar of ${data2.profile.username}`} className="h-full w-full object-cover" loading="lazy" onError={() => setAvatar2Failed(true)} />
                ) : (
                  <span className="font-sans font-bold text-xs">{initials2}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex sm:flex-row-reverse items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[7px] sm:text-[8px] font-bold bg-pixel-green/10 text-pixel-green dark:bg-pixel-green/20 uppercase tracking-wide">
                    {data2.platform === 'lichess' ? 'Lichess' : 'Chess.com'}
                  </span>
                  <h2 className="font-sans text-[13px] sm:text-[14px] leading-tight font-bold truncate">
                    {data2.profile.name || data2.profile.username}
                  </h2>
                </div>
                <div className="mt-0.5 flex sm:flex-row-reverse items-center gap-2 text-[10px] text-muted dark:text-muted-dark flex-wrap">
                  <span>@{data2.profile.username}</span>
                  <span className="text-muted/40">•</span>
                  <span className="font-bold text-ink dark:text-ink-dark">Peak {data2.primary.peak} / Live {r2}</span>
                </div>
                {data2.insights?.style && (
                  <div className="mt-1 flex sm:justify-end">
                    <StyleBadge style={data2.insights.style} sampleSize={data2.insights.sampleSize} compact />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center Section: Matchup Hub & Stats */}
        <div className="flex-1 min-w-0 p-3.5 flex flex-col justify-between gap-3 relative z-10">
          {/* Matchup heading summary */}
          <div className="flex items-center justify-between gap-4 pb-2 border-b-2 border-line/50 dark:border-line-dark/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted dark:text-muted-dark truncate min-w-0">Matchup Details</span>
          </div>

          {/* Tab selection controls */}
          <FaceNav active={face} onSelect={goToStable} />

          {/* Transition panel container */}
          <div className="relative overflow-hidden flex-1 flex flex-col min-h-[125px] md:min-h-[135px]" aria-live="polite" style={{ contain: 'content' }}>
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


      </div>

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

      {/* Mobile-focused slider controls */}
      <ArrowButton direction="prev" onClick={() => goToStable(face - 1)} disabled={face === 0} />
      <ArrowButton direction="next" onClick={() => goToStable(face + 1)} disabled={face === FACES.length - 1} />
    </div>
  )
})

/* ----------------------------------------------------------------------------
 * 1. UI Navigation Components
 * ---------------------------------------------------------------------------- */

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

/* ----------------------------------------------------------------------------
 * 2. Tab Panel Child Elements
 * ---------------------------------------------------------------------------- */

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
            {/* Comparative ratio bar */}
            <div
              className="h-1.5 w-full rounded-full overflow-hidden bg-chip dark:bg-chip-dark border border-line/30 flex cursor-pointer"
              onMouseEnter={(e) => onHover?.(e, `${fmt.toUpperCase()} Rating · P1 ${p1Val || '—'} vs P2 ${p2Val || '—'}${delta !== null ? ` (Gap: ${delta} pts)` : ''}`)}
              onMouseMove={(e) => onHover?.(e, `${fmt.toUpperCase()} Rating · P1 ${p1Val || '—'} vs P2 ${p2Val || '—'}${delta !== null ? ` (Gap: ${delta} pts)` : ''}`)}
              onMouseLeave={() => onHover?.(null, null)}
            >
              <div className="h-full bg-accent" style={{ width: `${ratio}%` }} />
              <div className="h-full bg-ink/75 dark:bg-ink-dark/75" style={{ width: `${100 - ratio}%` }} />
            </div>
            {/* Record summary metrics */}
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
      {/* Cumulative player one records */}
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

      {/* Cumulative player two records */}
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

      {/* Performance metrics by color */}
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

      {/* Comparative game length statistics */}
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
      {/* Narrative style analysis summary */}
      <div className="rounded-xl border border-line dark:border-line-dark p-3.5 bg-accent-soft/15 dark:bg-accent-softDark/15">
        <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted dark:text-muted-dark mb-1 flex items-center gap-1.5">
          <Spark className="h-3.5 w-3.5 text-pixel-yellow shrink-0" />
          Style Matchup Analysis
        </div>
        <p className="text-[11.5px] leading-relaxed text-ink/85 dark:text-ink-dark/85 italic line-clamp-3 font-sans">
          "{analysisText}"
        </p>
      </div>

      {/* Opening repertoire comparison */}
      <div className="grid grid-cols-2 gap-2">
        {/* Player one opening highlight */}
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

        {/* Player two opening highlight */}
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

      {/* Synchronization and streak status */}
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


