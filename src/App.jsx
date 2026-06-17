import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import StatCardSkeleton from './components/StatCardSkeleton'
import GeneratingFX from './components/GeneratingFX'
import ActionBar from './components/ActionBar'
import BackgroundFX from './components/BackgroundFX'
import Confetti from './components/Confetti'
import { fetchPlayerStats, getDemoStats } from './lib/api'
import { SidebarIcon } from './components/Icons'

// Dynamically import heavy UI modules to optimize initial bundle size.
const StatCard = lazy(() => import('./components/StatCard'))
const ComparisonCard = lazy(() => import('./components/ComparisonCard'))
const ApiExplorer = lazy(() => import('./components/ApiExplorer'))

const THEME_KEY = 'chesscard.theme'

/** Module-level constant so the Toaster config object isn't recreated every render */
const TOAST_OPTIONS = {
  duration: 2500,
  style: {
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    border: '2px solid',
    padding: '10px 16px',
    boxShadow: '0 8px 24px -8px rgba(28, 25, 23, 0.2)',
  },
  success: {
    style: {
      background: '#0F2418',
      color: '#6EE7B7',
      borderColor: '#065F46',
    },
    iconTheme: { primary: '#34D399', secondary: '#0F2418' },
  },
  error: {
    style: {
      background: '#2A1215',
      color: '#FCA5A5',
      borderColor: '#7F1D1D',
    },
    iconTheme: { primary: '#F87171', secondary: '#2A1215' },
  },
  loading: {
    style: {
      background: '#2A2010',
      color: '#FDE68A',
      borderColor: '#78350F',
    },
  },
}

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readUrlParams() {
  if (typeof window === 'undefined') return null
  const sp = new URLSearchParams(window.location.search)
  const u = sp.get('u')
  const p = sp.get('p')
  const u2 = sp.get('u2')
  const p2 = sp.get('p2')
  if (!u) return null
  return {
    platform: p === 'lichess' ? 'lichess' : 'chess.com',
    username: u,
    isCompare: !!(u2),
    platform2: p2 === 'lichess' ? 'lichess' : 'chess.com',
    username2: u2 || '',
  }
}

function writeUrlParams(platform, username, isCompare, platform2, username2) {
  const sp = new URLSearchParams()
  sp.set('p', platform)
  sp.set('u', username)
  if (isCompare && username2) {
    sp.set('p2', platform2)
    sp.set('u2', username2)
  }
  const url = `${window.location.pathname}?${sp.toString()}`
  window.history.replaceState(null, '', url)
}

export default function App() {
  // Core state variables.
  const urlParams = readUrlParams()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [platform, setPlatform] = useState(urlParams?.platform || 'chess.com')
  const [username, setUsername] = useState(urlParams?.username || '')
  const [data, setData] = useState(null)
  const [source, setSource] = useState(null) // 'api' | 'cache' | 'demo'
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [theme, setTheme] = useState(getInitialTheme)
  const [justGenerated, setJustGenerated] = useState(false)
  const [confettiKey, setConfettiKey] = useState(0)
  const [apiEvents, setApiEvents] = useState([])
  const [latencyMs, setLatencyMs] = useState(null)

  // Comparison state variables.
  const [isCompare, setIsCompare] = useState(urlParams?.isCompare || false)
  const [platform2, setPlatform2] = useState(urlParams?.platform2 || 'lichess')
  const [username2, setUsername2] = useState(urlParams?.username2 || '')
  const [data2, setData2] = useState(null)
  const [source2, setSource2] = useState(null)

  const cardRef = useRef(null)
  const successTimerRef = useRef(null)
  const requestIdRef = useRef(0) // Protects against race conditions from overlapping fetch actions.
  const abortControllerRef = useRef(null) // Stores AbortController references to cancel obsolete requests.
  const queryClient = useQueryClient()

  // Stabilize the search parameters in reference objects.
  // This allows runFetch to retain a stable callback identity across user keystrokes.
  const platformRef = useRef(platform)
  const usernameRef = useRef(username)
  const platform2Ref = useRef(platform2)
  const username2Ref = useRef(username2)
  const isCompareRef = useRef(isCompare)
  platformRef.current = platform
  usernameRef.current = username
  platform2Ref.current = platform2
  username2Ref.current = username2
  isCompareRef.current = isCompare

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    window.localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  // Clear statistics and errors when the primary platform configuration changes.
  useEffect(() => {
    setData(null)
    setSource(null)
    if (!isCompare) setError(null)
  }, [platform])

  useEffect(() => {
    if (!username.trim()) {
      setData(null)
      setSource(null)
      setError(null)
    }
  }, [username])

  useEffect(() => {
    setData2(null)
    setSource2(null)
  }, [platform2])

  useEffect(() => {
    if (!username2.trim()) {
      setData2(null)
      setSource2(null)
    }
  }, [username2])

  useEffect(() => {
    setData(null)
    setSource(null)
    setData2(null)
    setSource2(null)
    setError(null)
    setApiEvents([])
    setIsLoading(false)
    setIsRefreshing(false)
  }, [isCompare])

  const runFetch = useCallback(async ({ force = false, isRefresh = false, customPlatform = null, customUsername = null, customPlatform2 = null, customUsername2 = null } = {}) => {
    // Read current values from refs or custom overrides so this callback doesn't depend on
    // platform/username state directly (avoids identity churn on keystrokes).
    const _platform = customPlatform || platformRef.current
    const _username = customUsername !== null ? customUsername : usernameRef.current
    const _platform2 = customPlatform2 || platform2Ref.current
    const _username2 = customUsername2 !== null ? customUsername2 : username2Ref.current

    const _isCompare = isCompareRef.current

    if (!_username.trim()) return
    if (_isCompare && !_username2.trim()) return

    // Cancel any in-flight request
    if (abortControllerRef.current) abortControllerRef.current.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    const signal = controller.signal

    const myId = ++requestIdRef.current

    if (isRefresh) setIsRefreshing(true)
    else setIsLoading(true)
    setError(null)
    setJustGenerated(false)
    setApiEvents([])
    setLatencyMs(null)

    if (!isRefresh) {
      await new Promise((r) => setTimeout(r, 220))
    }

    if (myId !== requestIdRef.current) return

    if (!_isCompare) {
      // Single Mode
      const onProgress = (e) => {
        if (myId !== requestIdRef.current) return
        setApiEvents((prev) => {
          const i = prev.findIndex((p) => p.label === e.label)
          if (i >= 0) {
            const next = prev.slice()
            next[i] = { ...next[i], ...e }
            return next
          }
          return [...prev, e]
        })
      }

      const result = await fetchPlayerStats({ platform: _platform, username: _username, onProgress, force, signal })

      if (myId !== requestIdRef.current) return

      if (result.source === 'aborted') {
        setIsLoading(false)
        setIsRefreshing(false)
        return
      }

      if (result.ok) {
        setData(result.data)
        setSource(result.source)
        setLatencyMs(result.latencyMs)
        // Cache data payload in React Query registry for cross-component access.
        const cacheKey = ['player', _platform, _username.trim().toLowerCase()]
        queryClient.setQueryData(cacheKey, result.data)
        queryClient.invalidateQueries({ queryKey: cacheKey, refetchType: 'none' })
      } else {
        setData(getDemoStats(_platform))
        setSource('demo')
        const errMsg = result.error
          ? `Couldn't reach ${_platform === 'lichess' ? 'Lichess' : 'Chess.com'} (${result.error}). Showing a demo profile.`
          : `Couldn't reach ${_platform === 'lichess' ? 'Lichess' : 'Chess.com'}. Showing a demo profile.`
        setError(errMsg)
        toast.error(errMsg, { duration: 4000 })
      }
    } else {
      // Comparison Mode
      const onProgress1 = (e) => {
        if (myId !== requestIdRef.current) return
        setApiEvents((prev) => {
          const label = `P1: ${e.label}`
          const i = prev.findIndex((p) => p.label === label)
          if (i >= 0) {
            const next = prev.slice()
            next[i] = { ...next[i], ...e, label }
            return next
          }
          return [...prev, { ...e, label }]
        })
      }

      const onProgress2 = (e) => {
        if (myId !== requestIdRef.current) return
        setApiEvents((prev) => {
          const label = `P2: ${e.label}`
          const i = prev.findIndex((p) => p.label === label)
          if (i >= 0) {
            const next = prev.slice()
            next[i] = { ...next[i], ...e, label }
            return next
          }
          return [...prev, { ...e, label }]
        })
      }

      try {
        const result1 = await fetchPlayerStats({ platform: _platform, username: _username, onProgress: onProgress1, force, signal })

        if (myId !== requestIdRef.current) return
        if (result1.source === 'aborted') {
          setIsLoading(false)
          setIsRefreshing(false)
          return
        }
        
        // Stagger sequential requests to avoid platform rate limits.
        await new Promise((r) => setTimeout(r, 150))
        
        const result2 = await fetchPlayerStats({ platform: _platform2, username: _username2, onProgress: onProgress2, force, signal })

        if (myId !== requestIdRef.current) return
        if (result2.source === 'aborted') {
          setIsLoading(false)
          setIsRefreshing(false)
          return
        }

        let hasError = false
        const errMsgs = []

        if (result1.ok) {
          setData(result1.data)
          setSource(result1.source)
          setLatencyMs(result1.latencyMs)
          const key1 = ['player', _platform, _username.trim().toLowerCase()]
          queryClient.setQueryData(key1, result1.data)
          queryClient.invalidateQueries({ queryKey: key1, refetchType: 'none' })
        } else {
          setData(getDemoStats(_platform))
          setSource('demo')
          hasError = true
          errMsgs.push(`P1 (${_platform === 'lichess' ? 'Lichess' : 'Chess.com'}): ${result1.error || 'Connection failed'}`)
        }

        if (result2.ok) {
          setData2(result2.data)
          setSource2(result2.source)
          const key2 = ['player', _platform2, _username2.trim().toLowerCase()]
          queryClient.setQueryData(key2, result2.data)
          queryClient.invalidateQueries({ queryKey: key2, refetchType: 'none' })
        } else {
          setData2(getDemoStats(_platform2))
          setSource2('demo')
          hasError = true
          errMsgs.push(`P2 (${_platform2 === 'lichess' ? 'Lichess' : 'Chess.com'}): ${result2.error || 'Connection failed'}`)
        }

        if (hasError) {
          const errMsg = `Showing demo profiles because we couldn't load: ${errMsgs.join('; ')}`
          setError(errMsg)
          toast.error(errMsg, { duration: 5000 })
        }
      } catch (err) {
        if (myId !== requestIdRef.current) return
        setData(getDemoStats(_platform))
        setSource('demo')
        setData2(getDemoStats(_platform2))
        setSource2('demo')
        const errMsg = 'An unexpected error occurred during comparison. Showing demo profiles.'
        setError(errMsg)
        toast.error(errMsg)
      }
    }

    setIsLoading(false)
    setIsRefreshing(false)
    setJustGenerated(true)
    setConfettiKey((k) => k + 1)
    if (successTimerRef.current) window.clearTimeout(successTimerRef.current)
    successTimerRef.current = window.setTimeout(() => setJustGenerated(false), 1800)
  }, [queryClient])

  const handleGenerate = (optUsername = null, optPlatform = null) => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false)
    }
    const targetUsername = optUsername !== null ? optUsername : username
    const targetPlatform = optPlatform !== null ? optPlatform : platform
    const isSameUser = data?.profile &&
      data.profile.username.toLowerCase() === targetUsername.trim().toLowerCase() &&
      data.platform === targetPlatform
    runFetch({ force: isSameUser, isRefresh: false, customUsername: targetUsername, customPlatform: targetPlatform })
  }

  const handleGenerateCompare = (optUsername = null, optPlatform = null, optUsername2 = null, optPlatform2 = null) => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false)
    }
    const targetUsername = optUsername !== null ? optUsername : username
    const targetPlatform = optPlatform !== null ? optPlatform : platform
    const targetUsername2 = optUsername2 !== null ? optUsername2 : username2
    const targetPlatform2 = optPlatform2 !== null ? optPlatform2 : platform2
    const isSameUser = data?.profile && data2?.profile &&
      data.profile.username.toLowerCase() === targetUsername.trim().toLowerCase() &&
      data.platform === targetPlatform &&
      data2.profile.username.toLowerCase() === targetUsername2.trim().toLowerCase() &&
      data2.platform === targetPlatform2
    runFetch({
      force: isSameUser,
      isRefresh: false,
      customUsername: targetUsername,
      customPlatform: targetPlatform,
      customUsername2: targetUsername2,
      customPlatform2: targetPlatform2
    })
  }

  const handleRefresh = () => runFetch({ force: true, isRefresh: true })

  useEffect(() => () => {
    if (successTimerRef.current) window.clearTimeout(successTimerRef.current)
    if (abortControllerRef.current) abortControllerRef.current.abort()
  }, [])

  // Update browser URL query string params when data is retrieved.
  useEffect(() => {
    if (data?.profile?.username) {
      writeUrlParams(platform, data.profile.username, isCompare, platform2, data2?.profile?.username || username2)
    }
  }, [data, data2, platform, platform2, isCompare, username2])

  // Synchronize component state with browser back/forward history navigation events.
  useEffect(() => {
    const handlePopState = () => {
      const params = readUrlParams()
      if (params) {
        setPlatform(params.platform)
        setUsername(params.username)
        setIsCompare(params.isCompare)
        setPlatform2(params.platform2)
        setUsername2(params.username2)

        platformRef.current = params.platform
        usernameRef.current = params.username
        isCompareRef.current = params.isCompare
        platform2Ref.current = params.platform2
        username2Ref.current = params.username2

        runFetch()
      } else {
        setPlatform('chess.com')
        setUsername('')
        setIsCompare(false)
        setPlatform2('lichess')
        setUsername2('')
        setData(null)
        setData2(null)
        setError(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [runFetch])

  // Trigger initial fetch on component mount if parameters are present in URL.
  const hasAutoGeneratedRef = useRef(false)
  useEffect(() => {
    if (hasAutoGeneratedRef.current) return
    if (urlParams?.username) {
      hasAutoGeneratedRef.current = true
      // Close sidebar on mobile/tablet on initial load if query parameters exist.
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setIsSidebarOpen(false)
      }
      // Short delay to ensure reference parameters are synchronized.
      setTimeout(() => runFetch(), 100)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  return (
    <div className="relative min-h-screen overflow-x-hidden flex flex-col lg:flex-row bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark">
      <BackgroundFX />

      {/* Hot-toast notifier provider configured with theme styles */}
      <Toaster
        position="top-center"
        toastOptions={TOAST_OPTIONS}
      />

      <Sidebar
        platform={platform}
        setPlatform={setPlatform}
        username={username}
        setUsername={setUsername}
        platform2={platform2}
        setPlatform2={setPlatform2}
        username2={username2}
        setUsername2={setUsername2}
        isCompare={isCompare}
        setIsCompare={setIsCompare}
        onGenerate={handleGenerate}
        onGenerateCompare={handleGenerateCompare}
        isLoading={isLoading}
        justGenerated={justGenerated}
        theme={theme}
        toggleTheme={toggleTheme}
        isOpen={isSidebarOpen}
      />

      {/* Mobile sidebar backdrop overlay component */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-[#0d0d0d]/40 dark:bg-black/65 backdrop-blur-[2px] lg:hidden transition-opacity duration-300"
        />
      )}

      <main className="relative flex-1 min-w-0 transition-all duration-300 ease-in-out">
        <TopBar
          platform={platform}
          username={data?.profile?.username || username}
          hasData={!!data}
          source={source}
          latencyMs={latencyMs}
          platform2={platform2}
          username2={data2?.profile?.username || username2}
          hasData2={!!data2}
          isCompare={isCompare}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />

        <div className="px-5 sm:px-8 lg:px-12 py-8 lg:py-12">
          <div className="max-w-3xl mx-auto">
            {/* Header section containing greeting and subtexts */}
            <div className="mb-8 lg:mb-10 space-y-3">
              <div
                className="inline-flex items-center gap-1.5 border border-line dark:border-line-dark bg-canvas/60 dark:bg-canvas-dark/60 backdrop-blur px-2.5 py-1 rounded-full text-[11px] font-semibold text-muted dark:text-muted-dark animate-fadeUp"
                style={{ animationDelay: '0ms' }}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
                  <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                Public data · no signup
              </div>
              <h1
                className="font-serif text-[26px] sm:text-[34px] lg:text-[40px] leading-[1.05] font-semibold tracking-tight animate-fadeUp"
                style={{ animationDelay: '60ms', animationFillMode: 'backwards' }}
              >
                {isCompare ? 'Compare chess players' : 'Your chess, '}
                <span className="text-muted dark:text-muted-dark italic font-normal">
                  {isCompare ? 'side-by-side.' : 'as a card.'}
                </span>
              </h1>
              <p
                className="text-[13.5px] sm:text-[14.5px] text-muted dark:text-muted-dark max-w-xl leading-relaxed animate-fadeUp"
                style={{ animationDelay: '120ms', animationFillMode: 'backwards' }}
              >
                {isCompare
                  ? 'Compare ratings, win ratios, styles, and openings between any two profiles on Lichess and Chess.com.'
                  : 'Generate a clean, downloadable infographic from your public Lichess or Chess.com profile — peak rating, current streak, win/loss ratio, and most-played opening.'}
              </p>
            </div>

            <section className="relative">
              {error && (
                <div role="alert" aria-live="assertive" className="mb-5 rounded-lg border border-amber-300/50 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 px-3.5 py-2.5 text-[12.5px] backdrop-blur animate-fadeUp font-medium">
                  {error}
                </div>
              )}

              <div className="relative flex flex-col items-center">
                <Confetti trigger={confettiKey} />

                <Suspense fallback={<div className="animate-fadeUp"><StatCardSkeleton isCompare={isCompare} /></div>}>
                {isLoading ? (
                  <div className="animate-fadeUp" key="loading">
                    <GeneratingFX events={apiEvents} />
                  </div>
                ) : isCompare ? (
                  data && data2 ? (
                    <div
                      className="animate-fadeUp"
                      style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
                    >
                      <ComparisonCard
                        data1={data}
                        data2={data2}
                        cardRef={cardRef}
                        source1={source}
                        source2={source2}
                        onRefresh={
                          source === 'api' || source === 'cache' || source2 === 'api' || source2 === 'cache'
                            ? handleRefresh
                            : null
                        }
                        isRefreshing={isRefreshing}
                        theme={theme}
                        isDark={theme === 'dark'}
                      />
                    </div>
                  ) : (
                    <div className="animate-fadeUp" key="empty">
                      <StatCardSkeleton isCompare={isCompare} />
                    </div>
                  )
                ) : data ? (
                  <div
                    className="animate-fadeUp"
                    style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
                  >
                    <StatCard
                      data={data}
                      cardRef={cardRef}
                      source={source}
                      onRefresh={source === 'api' || source === 'cache' ? handleRefresh : null}
                      isRefreshing={isRefreshing}
                      theme={theme}
                      isDark={theme === 'dark'}
                    />
                  </div>
                ) : (
                  <div className="animate-fadeUp" key="empty">
                    <StatCardSkeleton isCompare={isCompare} />
                  </div>
                )}

                <ActionBar data={data} data2={isCompare ? data2 : null} isCompare={isCompare} cardRef={cardRef} isDark={theme === 'dark'} />

                {!data && !isLoading && (
                  <p
                    className="mt-8 text-[12.5px] text-muted dark:text-muted-dark animate-fadeUp"
                    style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
                  >
                    Enter usernames and click{' '}
                    <span className="text-ink dark:text-ink-dark font-semibold">
                      {isCompare ? 'Compare Players' : 'Generate'}
                    </span>{' '}
                    to preview the comparison.
                  </p>
                )}

                {data && !isCompare && <ApiExplorer data={data} />}
                </Suspense>
              </div>
            </section>

            <Footer />
          </div>
        </div>
      </main>
    </div>
  )
}

const TopBar = React.memo(function TopBar({
  platform,
  username,
  hasData,
  source,
  latencyMs,
  platform2,
  username2,
  hasData2,
  isCompare,
  isSidebarOpen,
  setIsSidebarOpen,
}) {
  return (
    <div className="sticky top-0 z-20 bg-canvas/80 dark:bg-canvas-dark/80 backdrop-blur border-b border-line dark:border-line-dark">
      <div className="px-4 sm:px-6 lg:px-8 h-12 min-h-[48px] flex items-center gap-3 text-[12.5px]">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1 rounded hover:bg-chip dark:hover:bg-chip-dark text-muted hover:text-ink dark:hover:text-ink-dark transition-all duration-150 shrink-0"
          aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <SidebarIcon className="h-5 w-5" />
        </button>
        <span className="text-muted dark:text-muted-dark font-sans font-bold">chesscard</span>
        <span className="text-line dark:text-line-dark">/</span>
        {!isCompare ? (
          <>
            <span className="text-muted dark:text-muted-dark">
              {platform === 'lichess' ? 'Lichess' : 'Chess.com'}
            </span>
            {hasData && username && (
              <>
                <span className="text-line dark:text-line-dark">/</span>
                <span className="text-ink dark:text-ink-dark font-semibold truncate min-w-0">{username}</span>
              </>
            )}
          </>
        ) : (
          <>
            <span className="text-muted dark:text-muted-dark">Compare</span>
            {hasData && hasData2 && (
              <>
                <span className="text-line dark:text-line-dark">/</span>
                <span className="text-ink dark:text-ink-dark font-semibold truncate min-w-0">
                  {username} vs {username2}
                </span>
              </>
            )}
          </>
        )}
        <div className="ml-auto flex items-center gap-2 shrink-0 whitespace-nowrap text-[11px] text-muted dark:text-muted-dark">
          {hasData && latencyMs != null && source === 'api' && (
            <span className="hidden sm:inline-flex items-center gap-1 tabular-nums font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              fetched in {latencyMs}ms
            </span>
          )}
          {hasData && source === 'cache' && (
            <span className="hidden sm:inline-flex items-center gap-1 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              cached
            </span>
          )}
          {hasData && source === 'demo' && (
            <span className="hidden sm:inline-flex items-center gap-1 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              demo data
            </span>
          )}
        </div>
      </div>
    </div>
  )
})

const Footer = React.memo(function Footer() {
  return (
    <footer className="mt-14 pt-8 pb-4 border-t border-line dark:border-line-dark text-[11.5px] text-muted dark:text-muted-dark flex flex-wrap items-center justify-between gap-3 font-medium">
      <span>Built for the love of the game · ♟</span>
      <span>Public data from Chess.com & Lichess APIs.</span>
    </footer>
  )
})
