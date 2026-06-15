/**
 * @fileoverview API integration modules for Chess.com and Lichess.
 * Implements a resilient request orchestration layer using queueing, retries,
 * failover proxies, and persistent storage caching.
 */

import {
  computeInsights,
  countPgnFullmoves,
  extractFirstMoveFromPgn,
} from './insights.js'

import {
  RequestQueue,
  PersistentCache,
  fetchWithRetry,
  normalizeError,
  validateAndNormalizeProfile,
  validateAndNormalizeGame,
  dynamicMonthLookbackGenerator
} from './apiUtils.js'

const CACHE_TTL = 5 * 60 * 1000
const RECENT_GAMES_LIMIT = 400

/**
 * Throttles outbound connections to avoid platform rate limiting.
 */
const requestQueue = new RequestQueue({ maxConcurrency: 3, minDelay: 100 })

/**
 * Persists data payloads in local storage with automatic TTL invalidation.
 */
const persistentCache = new PersistentCache({ prefix: 'chesscard_api_', ttl: CACHE_TTL })

export const COUNTRY_NAMES = {
  AD: 'Andorra', AE: 'United Arab Emirates', AF: 'Afghanistan', AG: 'Antigua & Barbuda', AI: 'Anguilla', AL: 'Albania', AM: 'Armenia', AO: 'Angola', AQ: 'Antarctica', AR: 'Argentina', AS: 'American Samoa', AT: 'Austria', AU: 'Australia', AW: 'Aruba', AX: 'Åland Islands', AZ: 'Azerbaijan',
  BA: 'Bosnia & Herzegovina', BB: 'Barbados', BD: 'Bangladesh', BE: 'Belgium', BF: 'Burkina Faso', BG: 'Bulgaria', BH: 'Bahrain', BI: 'Burundi', BJ: 'Benin', BL: 'St. Barthélemy', BM: 'Bermuda', BN: 'Brunei', BO: 'Bolivia', BQ: 'Caribbean Netherlands', BR: 'Brazil', BS: 'Bahamas', BT: 'Bhutan', BV: 'Bouvet Island', BW: 'Botswana', BY: 'Belarus', BZ: 'Belize',
  CA: 'Canada', CC: 'Cocos (Keeling) Islands', CD: 'Congo - Kinshasa', CF: 'Central African Republic', CG: 'Congo - Brazzaville', CH: 'Switzerland', CI: 'Côte d’Ivoire', CK: 'Cook Islands', CL: 'Chile', CM: 'Cameroon', CN: 'China', CO: 'Colombia', CR: 'Costa Rica', CU: 'Cuba', CV: 'Cape Verde', CW: 'Curaçao', CX: 'Christmas Island', CY: 'Cyprus', CZ: 'Czechia',
  DE: 'Germany', DJ: 'Djibouti', DK: 'Denmark', DM: 'Dominica', DO: 'Dominican Republic', DZ: 'Algeria',
  EC: 'Ecuador', EE: 'Estonia', EG: 'Egypt', EH: 'Western Sahara', ER: 'Eritrea', ES: 'Spain', ET: 'Ethiopia', FI: 'Finland', FJ: 'Fiji', FK: 'Falkland Islands', FM: 'Micronesia', FO: 'Faroe Islands', FR: 'France',
  GA: 'Gabon', GB: 'United Kingdom', GD: 'Grenada', GE: 'Georgia', GF: 'French Guiana', GG: 'Guernsey', GH: 'Ghana', GI: 'Gibraltar', GL: 'Greenland', GM: 'Gambia', GN: 'Guinea', GP: 'Guadeloupe', GQ: 'Equatorial Guinea', GR: 'Greece', GS: 'South Georgia & South Sandwich Islands', GT: 'Guatemala', GU: 'Guam', GW: 'Guinea-Bissau', GY: 'Guyana',
  HK: 'Hong Kong', HM: 'Heard & McDonald Islands', HN: 'Honduras', HR: 'Croatia', HT: 'Haiti', HU: 'Hungary', ID: 'Indonesia', IE: 'Ireland', IL: 'Israel', IM: 'Isle of Man', IN: 'India', IO: 'British Indian Ocean Territory', IQ: 'Iraq', IR: 'Iran', IS: 'Iceland', IT: 'Italy', JE: 'Jersey', JM: 'Jamaica', JO: 'Jordan', JP: 'Japan',
  KE: 'Kenya', KG: 'Kyrgyzstan', KH: 'Cambodia', KI: 'Kiribati', KM: 'Comoros', KN: 'St. Kitts & Nevis', KP: 'North Korea', KR: 'South Korea', KW: 'Kuwait', KY: 'Cayman Islands', KZ: 'Kazakhstan', LA: 'Laos', LB: 'Lebanon', LC: 'St. Lucia', LI: 'Liechtenstein', LK: 'Sri Lanka', LR: 'Liberia', LS: 'Lesotho', LT: 'Lithuania', LU: 'Luxembourg', LV: 'Latvia', LY: 'Libya',
  MA: 'Morocco', MC: 'Monaco', MD: 'Moldova', ME: 'Montenegro', MF: 'St. Martin', MG: 'Madagascar', MH: 'Marshall Islands', MK: 'North Macedonia', ML: 'Mali', MM: 'Myanmar (Burma)', MN: 'Mongolia', MO: 'Macao', MP: 'Northern Mariana Islands', MQ: 'Martinique', MR: 'Mauritania', MS: 'Montserrat', MT: 'Malta', MU: 'Mauritius', MV: 'Maldives', MW: 'Malawi', MX: 'Mexico', MY: 'Malaysia', MZ: 'Mozambique',
  NA: 'Namibia', NC: 'New Caledonia', NE: 'Niger', NF: 'Norfolk Island', NG: 'Nigeria', NI: 'Nicaragua', NL: 'Netherlands', NO: 'Norway', NP: 'Nepal', NR: 'Nauru', NU: 'Niue', NZ: 'New Zealand', OM: 'Oman',
  PA: 'Panama', PE: 'Peru', PF: 'French Polynesia', PG: 'Papua New Guinea', PH: 'Philippines', PK: 'Pakistan', PL: 'Poland', PM: 'St. Pierre & Miquelon', PN: 'Pitcairn Islands', PR: 'Puerto Rico', PS: 'Palestine', PT: 'Portugal', PW: 'Palau', PY: 'Paraguay', QA: 'Qatar', RE: 'Réunion', RO: 'Romania', RS: 'Serbia', RU: 'Russia', RW: 'Rwanda',
  SA: 'Saudi Arabia', SB: 'Solomon Islands', SC: 'Seychelles', SD: 'Sudan', SE: 'Sweden', SG: 'Singapore', SH: 'St. Helena', SI: 'Slovenia', SJ: 'Svalbard & Jan Mayen', SK: 'Slovakia', SL: 'Sierra Leone', SM: 'San Marino', SN: 'Senegal', SO: 'Somalia', SR: 'Suriname', SS: 'South Sudan', ST: 'São Tomé & Príncipe', SV: 'El Salvador', SX: 'Sint Maarten', SY: 'Syria', SZ: 'Eswatini',
  TC: 'Turks & Caicos Islands', TD: 'Chad', TF: 'French Southern Territories', TG: 'Togo', TH: 'Thailand', TJ: 'Tajikistan', TK: 'Tokelau', TL: 'Timor-Leste', TM: 'Turkmenistan', TN: 'Tunisia', TO: 'Tonga', TR: 'Turkey', TT: 'Trinidad & Tobago', TV: 'Tuvalu', TW: 'Taiwan', TZ: 'Tanzania',
  UA: 'Ukraine', UG: 'Uganda', UM: 'U.S. Outlying Islands', US: 'United States', UY: 'Uruguay', UZ: 'Uzbekistan', VA: 'Vatican City', VC: 'St. Vincent & Grenadines', VE: 'Venezuela', VG: 'British Virgin Islands', VI: 'U.S. Virgin Islands', VN: 'Vietnam', VU: 'Vanuatu', WF: 'Wallis & Futuna', WS: 'Samoa', XK: 'Kosovo', YE: 'Yemen', YT: 'Mayotte', ZA: 'South Africa', ZM: 'Zambia', ZW: 'Zimbabwe'
}

const PROXIES = [
  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
]

/* ============================================================================
 * Chess.com API Client Implementation
 * ============================================================================ */

const CC_FORMAT_ORDER = ['chess_rapid', 'chess_blitz', 'chess_bullet', 'chess_daily', 'chess_960']
const CC_FORMAT_NAMES = {
  chess_rapid: 'Rapid',
  chess_blitz: 'Blitz',
  chess_bullet: 'Bullet',
  chess_daily: 'Daily',
  chess_960: 'Chess960',
}

/**
 * Retrieves player profile, statistics, and game logs from the Chess.com API.
 * Uses a dynamic month-by-month lookback generator to crawl game archives.
 *
 * @param {string} username - The Chess.com identifier to retrieve.
 * @param {Function} [onProgress] - Optional progress notification callback.
 * @param {boolean} [force] - Disregard cache and force remote fetch if true.
 * @param {AbortSignal} [signal] - Optional signal to terminate requests.
 * @returns {Promise<Object>} The normalized profile and analytical data.
 */
async function fetchChessCom(username, onProgress, force, signal) {
  const clean = username.trim().toLowerCase()
  if (!clean) throw new Error('Empty username')

  const calls = []

  // Fetch user profile information.
  const profileUrl = `https://api.chess.com/pub/player/${encodeURIComponent(clean)}`
  onProgress?.({ label: 'profile', status: 'fetching', url: profileUrl })
  const profileRes = await requestQueue.add(() => fetchWithRetry(profileUrl, { signal, proxies: PROXIES }))
  if (!profileRes.ok) throw profileRes;
  const rawProfile = await profileRes.json()
  const profile = validateAndNormalizeProfile(rawProfile, 'chess.com', clean)
  calls.push({ label: 'profile', url: profileRes.url, via: profileRes.url.includes('chess.com') ? 'direct' : 'proxy', latencyMs: 0 })
  onProgress?.({ label: 'profile', status: 'ok', url: profileUrl, latencyMs: 0, via: 'direct' })

  // Fetch platform rating statistics.
  const statsUrl = `https://api.chess.com/pub/player/${encodeURIComponent(clean)}/stats`
  onProgress?.({ label: 'stats', status: 'fetching', url: statsUrl })
  const statsRes = await requestQueue.add(() => fetchWithRetry(statsUrl, { signal, proxies: PROXIES }))
  if (!statsRes.ok) throw statsRes;
  const stats = await statsRes.json()
  calls.push({ label: 'stats', url: statsRes.url, via: statsRes.url.includes('chess.com') ? 'direct' : 'proxy', latencyMs: 0 })
  onProgress?.({ label: 'stats', status: 'ok', url: statsUrl, latencyMs: 0, via: 'direct' })

  // Fetch recent game archives. Crawls backwards month-by-month until
  // either the lookback limit is reached or we reach the player's join date.
  let topOpening = null
  let topOpeningGames = null
  let recentForm = []
  const normalizedGames = []

  try {
    const generator = dynamicMonthLookbackGenerator({
      username: clean,
      profile: profile,
      maxGames: RECENT_GAMES_LIMIT,
      maxMonths: 36,
      queue: requestQueue,
      fetchOptions: { signal },
      isValidGame: (g, u) => {
        if (!g) return false;
        if (!g.white?.username || !g.black?.username) return false;
        const cu = u.trim().toLowerCase();
        const isWhite = g.white.username.toLowerCase() === cu;
        const isBlack = g.black.username.toLowerCase() === cu;
        if (!isWhite && !isBlack) return false;
        const res = isWhite ? g.white.result : g.black.result;
        return typeof res === 'string' && res.length > 0;
      },
      proxies: PROXIES,
      onProgress
    })

    const rawGames = []
    for await (const monthResult of generator) {
      if (monthResult.success) {
        rawGames.push(...monthResult.rawGames)
        if (monthResult.res) {
          calls.push({
            label: 'games',
            url: monthResult.res.url,
            via: monthResult.res.url.includes('chess.com') ? 'direct' : 'proxy',
            latencyMs: 0,
            count: monthResult.rawGames.length
          })
        }
      }
    }

    // Order archives chronologically descending and normalize payload shapes.
    rawGames.sort((a, b) => (b.end_time || 0) - (a.end_time || 0))
    const trimmedRaw = rawGames.slice(0, RECENT_GAMES_LIMIT * 2)

    const processedGames = []
    const counts = new Map()

    for (const g of trimmedRaw) {
      try {
        const norm = validateAndNormalizeGame(g, 'chess.com', clean)
        processedGames.push(norm)
        if (processedGames.length >= RECENT_GAMES_LIMIT) break
      } catch (e) {}
    }

    const gamesToUse = processedGames.slice(0, RECENT_GAMES_LIMIT)
    recentForm = gamesToUse.slice(0, 10).map((g) => g.result)

    for (const g of gamesToUse) {
      if (g.openingName) {
        counts.set(g.openingName, (counts.get(g.openingName) || 0) + 1)
      }
    }

    if (counts.size) {
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
      topOpening = top[0]
      topOpeningGames = top[1]
    }

    normalizedGames.push(...gamesToUse)
  } catch (err) {
    console.warn('[ChessCard] Error processing Chess.com games:', err)
  }

  // Compile structured records categorized by time control format.
  const perFormat = []
  for (const key of CC_FORMAT_ORDER) {
    const s = stats[key]
    if (s?.last?.rating == null) continue
    perFormat.push({
      key,
      label: CC_FORMAT_NAMES[key],
      rating: s.last.rating,
      peak: s.best?.rating || s.last.rating,
      record: s.record || {},
    })
  }

  const primary = perFormat.slice().sort((a, b) => b.rating - a.rating)[0]
  if (!primary) throw new Error('No stats available')

  const wins = primary.record.win || 0
  const losses = primary.record.loss || 0
  const draws = primary.record.draw || 0
  const total = wins + losses + draws

  return {
    platform: 'chess.com',
    profile,
    primary: {
      key: primary.key,
      label: primary.label,
      rating: primary.rating,
      peak: primary.peak,
    },
    perFormat,
    total: {
      games: total,
      wins,
      losses,
      draws,
      winRate: total ? wins / total : 0,
    },
    streak: deriveStreakFromForm(recentForm),
    topOpening,
    topOpeningGames,
    recentForm,
    insights: computeInsights(normalizedGames, { platform: 'chess.com', totalGames: total }),
    fetchedAt: Date.now(),
    calls,
  }
}

/**
 * Evaluates the current consecutive result sequence (wins or losses) from
 * a chronological array of game outcomes.
 *
 * @param {string[]} form - Chronological list of game result codes.
 * @returns {{sign: string, count: number}} Current streak direction and length.
 */
function deriveStreakFromForm(form) {
  if (!form?.length) return { sign: 'W', count: 0 }
  const first = form[0]
  let count = 0
  for (const r of form) {
    if (r === first) count++
    else break
  }
  return { sign: first, count }
}

/* ============================================================================
 * Lichess API Client Implementation
 * ============================================================================ */

const LI_PERF_ORDER = ['rapid', 'blitz', 'bullet', 'classical', 'correspondence', 'ultraBullet']
const LI_PERF_NAMES = {
  rapid: 'Rapid',
  blitz: 'Blitz',
  bullet: 'Bullet',
  classical: 'Classical',
  correspondence: 'Correspondence',
  ultraBullet: 'UltraBullet',
}

/**
 * Retrieves player profile and game archives from the Lichess API.
 * Normalizes results to map against uniform downstream presentation structures.
 *
 * @param {string} username - The Lichess user identifier.
 * @param {Function} [onProgress] - Optional progress notification callback.
 * @param {boolean} [force] - Disregard cache and force remote fetch if true.
 * @param {AbortSignal} [signal] - Optional signal to terminate requests.
 * @returns {Promise<Object>} The normalized profile and analytical data.
 */
async function fetchLichess(username, onProgress, force, signal) {
  const clean = username.trim().toLowerCase()
  if (!clean) throw new Error('Empty username')

  const calls = []

  // Fetch user profile information.
  const profileUrl = `https://lichess.org/api/user/${encodeURIComponent(clean)}`
  onProgress?.({ label: 'profile', status: 'fetching', url: profileUrl })
  const userCall = await requestQueue.add(() => fetchWithRetry(profileUrl, {
    headers: { Accept: 'application/json' },
    signal,
    proxies: PROXIES
  }))
  if (!userCall.ok) throw userCall;
  const userJson = await userCall.json()
  const user = validateAndNormalizeProfile(userJson, 'lichess', clean)
  calls.push({ label: 'profile', url: userCall.url, via: userCall.url?.includes('lichess.org') ? 'direct' : 'proxy', latencyMs: 0 })
  onProgress?.({ label: 'profile', status: 'ok', url: profileUrl, latencyMs: 0, via: 'direct' })

  // Fetch recent game logs using ndjson streaming API.
  let topOpening = null
  let topOpeningGames = null
  let recentForm = []
  let observedPeak = 0
  const normalizedGames = []

  try {
    const gamesUrl = `https://lichess.org/api/games/user/${encodeURIComponent(clean)}?max=${RECENT_GAMES_LIMIT}&pgnInJson=false&clocks=false&evals=false&opening=true&literate=false`
    onProgress?.({ label: 'games', status: 'fetching', url: gamesUrl })
    const gamesCall = await requestQueue.add(() => fetchWithRetry(gamesUrl, {
      headers: { Accept: 'application/x-ndjson' },
      signal,
      proxies: PROXIES
    }))
    if (!gamesCall.ok) throw gamesCall;
    const text = await gamesCall.text()
    calls.push({ label: 'games', url: gamesCall.url, via: gamesCall.url?.includes('lichess.org') ? 'direct' : 'proxy', latencyMs: 0 })
    onProgress?.({ label: 'games', status: 'ok', url: gamesUrl, latencyMs: 0, via: 'direct' })

    const counts = new Map()
    const lines = text.split('\n').filter(Boolean)
    for (const line of lines) {
      try {
        const rawG = JSON.parse(line)
        const g = validateAndNormalizeGame(rawG, 'lichess', clean)

        recentForm.push(g.result)
        if (Number.isFinite(g.myRating) && g.myRating > observedPeak) {
          observedPeak = g.myRating
        }
        if (g.openingName) {
          counts.set(g.openingName, (counts.get(g.openingName) || 0) + 1)
        }
        normalizedGames.push(g)
      } catch (e) {}
    }

    if (counts.size) {
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
      topOpening = top[0]
      topOpeningGames = top[1]
    }
    recentForm = recentForm.slice(0, 10)
  } catch (err) {
    console.warn('[ChessCard] Error processing Lichess games:', err)
  }

  // Parse format metrics and estimate performance outcomes.
  const perfs = userJson.perfs || {}
  const perFormat = []
  for (const key of LI_PERF_ORDER) {
    const p = perfs[key]
    if (!p?.rating) continue

    // Derive performance statistics for this specific variation.
    let sampleWins = 0
    let sampleLosses = 0
    let sampleDraws = 0
    let sampleGamesInVariant = 0
    for (const g of normalizedGames) {
      if (g.speed === key) {
        sampleGamesInVariant++
        if (g.result === 'W') sampleWins++
        else if (g.result === 'L') sampleLosses++
        else sampleDraws++
      }
    }

    let win = 0
    let loss = 0
    let draw = 0

    const totalGamesForPerf = p.games || 0

    if (sampleGamesInVariant > 0) {
      const winRate = sampleWins / sampleGamesInVariant
      const lossRate = sampleLosses / sampleGamesInVariant
      const drawRate = sampleDraws / sampleGamesInVariant

      win = Math.round(totalGamesForPerf * winRate)
      loss = Math.round(totalGamesForPerf * lossRate)
      draw = totalGamesForPerf - win - loss
    } else {
      // Revert to global ratios if local archives don't contain games of this variant.
      const globalWins = userJson.count?.win || 0
      const globalLosses = userJson.count?.loss || 0
      const globalDraws = userJson.count?.draw || 0
      const globalTotal = userJson.count?.all || 0

      const winRate = globalTotal ? globalWins / globalTotal : 0.5
      const lossRate = globalTotal ? globalLosses / globalTotal : 0.4
      const drawRate = globalTotal ? globalDraws / globalTotal : 0.1

      win = Math.round(totalGamesForPerf * winRate)
      loss = Math.round(totalGamesForPerf * lossRate)
      draw = totalGamesForPerf - win - loss
    }

    // Bound value to avoid rounding anomalies.
    if (draw < 0) {
      draw = 0
    }

    perFormat.push({
      key,
      label: LI_PERF_NAMES[key],
      rating: p.rating,
      peak: p.rating,
      record: { win, loss, draw },
      prog: p.prog ?? 0,
    })
  }


  // Select the user's highest rated format as primary.
  const primary = perFormat.slice().sort((a, b) => b.rating - a.rating)[0]
  if (!primary) throw new Error('No stats available')

  const wins = primary.record.win || 0
  const losses = primary.record.loss || 0
  const draws = primary.record.draw || 0
  const total = wins + losses + draws
  const peak = observedPeak > 0 ? Math.max(observedPeak, primary.rating) : primary.rating

  return {
    platform: 'lichess',
    profile: user,
    primary: {
      key: primary.key,
      label: primary.label,
      rating: primary.rating,
      peak,
      prog: primary.prog ?? 0,
    },
    perFormat,
    total: {
      games: total,
      wins,
      losses,
      draws,
      winRate: total ? wins / total : 0,
    },
    streak: deriveStreakFromForm(recentForm),
    topOpening,
    topOpeningGames,
    recentForm,
    insights: computeInsights(normalizedGames, {
      platform: 'lichess',
      puzzleRating: userJson.perfs?.puzzle?.rating,
      totalGames: total,
    }),
    fetchedAt: Date.now(),
    calls,
  }
}

/* ============================================================================
 * Public Orchestration Layer
 * ============================================================================ */

/**
 * Retrieves player stats from cache or retrieves them from the remote APIs.
 *
 * @param {Object} params - Request options.
 * @param {'chess.com'|'lichess'} params.platform - Target platform.
 * @param {string} params.username - Account username.
 * @param {Function} [params.onProgress] - Callback for request stage updates.
 * @param {boolean} [params.force=false] - If true, bypasses local storage cache.
 * @param {AbortSignal} [params.signal] - Signal to cancel active fetches.
 * @returns {Promise<Object>} Operation outcome container.
 */
export async function fetchPlayerStats({ platform, username, onProgress, force = false, signal } = {}) {
  const clean = (username || '').trim().toLowerCase()
  if (!clean) {
    return { ok: false, error: 'Please enter a username.', source: 'none' }
  }

  const key = `${platform}:${clean}`
  const cached = persistentCache.get(key)
  if (cached && !force) {
    const hasValidShape = cached.insights && Array.isArray(cached.insights.lengthBuckets)
    const sampleIsStale = typeof cached.insights?.sampleSize === 'number'
      && cached.insights.sampleSize < 100
      && RECENT_GAMES_LIMIT > cached.insights.sampleSize

    if (hasValidShape && !sampleIsStale) {
      onProgress?.({ label: 'cache', status: 'ok', url: 'localStorage' })
      return { ok: true, data: cached, source: 'cache', latencyMs: 0, calls: cached.calls }
    }
  }

  const t0 = performance.now()
  try {
    const data = platform === 'lichess'
      ? await fetchLichess(clean, onProgress, force, signal)
      : await fetchChessCom(clean, onProgress, force, signal)
    persistentCache.set(key, data)
    return {
      ok: true,
      data,
      source: 'api',
      latencyMs: Math.round(performance.now() - t0),
      calls: data.calls,
    }
  } catch (err) {
    const normalized = await normalizeError(err, platform, username)
    if (normalized.code === 'ABORTED' || err.name === 'AbortError') {
      return {
        ok: false,
        error: 'Request was cancelled.',
        source: 'aborted',
        latencyMs: Math.round(performance.now() - t0),
      }
    }
    console.warn('[ChessCard] API fetch failed:', normalized)
    return {
      ok: false,
      error: normalized.message,
      source: 'failed',
      latencyMs: Math.round(performance.now() - t0),
    }
  }
}



/* ============================================================================
 * Demonstration Fallback Profiles
 * ============================================================================ */

/**
 * Returns a complete high-fidelity mockup profile for demonstration purposes.
 *
 * @param {'chess.com'|'lichess'} platform - Platform schema style to match.
 * @returns {Object} Mock normalized player payload.
 */
export function getDemoStats(platform) {
  const ts = Date.now()
  if (platform === 'lichess') {
    return {
      platform: 'lichess',
      profile: {
        username: 'DrNykterstein',
        name: 'Magnus Carlsen',
        avatar: null,
        title: 'GM',
        country: 'Norway',
        joined: 2009,
        url: 'https://lichess.org/@/DrNykterstein',
        followers: 412000,
      },
      primary: { key: 'blitz', label: 'Blitz', rating: 2847, peak: 2902 },
      perFormat: [
        { key: 'blitz', label: 'Blitz', rating: 2847, peak: 2902, record: { win: 6240, loss: 1812, draw: 920 }, prog: 0 },
        { key: 'rapid', label: 'Rapid', rating: 2789, peak: 2851, record: { win: 2901, loss: 905, draw: 414 }, prog: 0 },
        { key: 'bullet', label: 'Bullet', rating: 3102, peak: 3225, record: { win: 700, loss: 410, draw: 80 }, prog: 0 },
      ],
      total: { games: 14382, wins: 9841, losses: 3127, draws: 1414, winRate: 0.684 },
      streak: { sign: 'W', count: 12 },
      topOpening: 'Italian Game',
      topOpeningGames: 412,
      recentForm: ['W', 'W', 'W', 'D', 'W', 'W', 'L', 'W', 'W', 'W'],
      insights: {
        colorSplit: {
          white: { games: 18, wins: 12, losses: 4, draws: 2, winRate: 0.667 },
          black: { games: 12, wins: 6, losses: 5, draws: 1, winRate: 0.5 },
        },
        firstMove: [
          { move: 'e4', count: 21, pct: 0.7 },
          { move: 'd4', count: 6, pct: 0.2 },
          { move: 'Nf3', count: 2, pct: 0.067 },
          { move: 'other', count: 1, pct: 0.033 },
        ],
        signatureOpening: {
          name: 'Sicilian Defense: Najdorf, Adams Attack',
          eco: 'B90',
          games: 8,
          wins: 7,
          losses: 1,
          draws: 0,
          winRate: 0.875,
          avgOpponent: 2790,
        },
        longestStreak: { type: 'W', length: 23 },
        style: {
          archetype: 'TACTICIAN',
          icon: '♞',
          tone: 'warm',
          tagline: '68% win rate — sharp, clean play.',
        },
        avgLength: 38,
        puzzleRating: 2850,
        puzzlePercentile: 2,
        lengthBuckets: [
          { key: 'short',  label: 'Short',  min: 0,  max: 20,  games: 4,  wins: 3, losses: 1, draws: 0, winRate: 0.75 },
          { key: 'medium', label: 'Medium', min: 20, max: 40, games: 17, wins: 12, losses: 4, draws: 1, winRate: 0.706 },
          { key: 'long',   label: 'Long',   min: 40, max: 70, games: 8,  wins: 5, losses: 2, draws: 1, winRate: 0.625 },
          { key: 'epic',   label: 'Epic',   min: 70, max: Infinity, games: 1, wins: 0, losses: 1, draws: 0, winRate: 0 },
        ],
        toughestOpponent: {
          username: 'GMHikaru',
          rating: 2901,
          wins: 2,
          losses: 3,
          draws: 1,
          totalGames: 6,
          profileUrl: 'https://lichess.org/@/GMHikaru',
        },
        hourlyPlay: [0, 0, 0, 0, 0, 0, 1, 0, 1, 2, 3, 2, 1, 4, 3, 2, 2, 3, 2, 2, 1, 0, 1, 0],
        peakHour: 13,
        beatingOdds: { games: 11, wins: 4, losses: 6, draws: 1, winRate: 0.364, avgDelta: 142, sumDelta: 1562, deltaSamples: 11 },
        sampleSize: 30,
      },
      fetchedAt: ts,
      calls: [],
    }
  }
  return {
    platform: 'chess.com',
    profile: {
      username: 'Hikaru',
      name: 'Hikaru Nakamura',
      avatar: null,
      title: 'GM',
      country: 'United States',
      joined: 2007,
      url: 'https://www.chess.com/member/hikaru',
      followers: 1800000,
      isStreamer: true,
    },
    primary: { key: 'chess_blitz', label: 'Blitz', rating: 3287, peak: 3312 },
    perFormat: [
      { key: 'chess_blitz', label: 'Blitz', rating: 3287, peak: 3312, record: { win: 8420, loss: 2200, draw: 690 } },
      { key: 'chess_rapid', label: 'Rapid', rating: 3105, peak: 3180, record: { win: 5210, loss: 1810, draw: 660 } },
      { key: 'chess_bullet', label: 'Bullet', rating: 3241, peak: 3278, record: { win: 3242, loss: 1600, draw: 348 } },
    ],
    total: { games: 24180, wins: 16872, losses: 5610, draws: 1698, winRate: 0.697 },
    streak: { sign: 'W', count: 8 },
    topOpening: 'London System',
    topOpeningGames: 348,
    recentForm: ['W', 'W', 'D', 'W', 'W', 'W', 'W', 'L', 'W', 'W'],
    insights: {
      colorSplit: {
        white: { games: 17, wins: 11, losses: 4, draws: 2, winRate: 0.647 },
        black: { games: 13, wins: 8, losses: 4, draws: 1, winRate: 0.615 },
      },
      firstMove: [
        { move: 'e4', count: 19, pct: 0.633 },
        { move: 'd4', count: 8, pct: 0.267 },
        { move: 'c4', count: 2, pct: 0.067 },
        { move: 'other', count: 1, pct: 0.033 },
      ],
      signatureOpening: {
        name: 'London System',
        eco: 'D02',
        games: 12,
        wins: 10,
        losses: 1,
        draws: 1,
        winRate: 0.833,
        avgOpponent: 3120,
      },
      longestStreak: { type: 'W', length: 18 },
      style: {
        archetype: 'BERSERKER',
        icon: '♞',
        tone: 'bold',
        tagline: '47% bullet — speed is your weapon.',
      },
      avgLength: 24,
      puzzleRating: null,
      puzzlePercentile: null,
      lengthBuckets: [
        { key: 'short',  label: 'Short',  min: 0,  max: 20,  games: 9, wins: 8, losses: 1, draws: 0, winRate: 0.889 },
        { key: 'medium', label: 'Medium', min: 20, max: 40, games: 16, wins: 11, losses: 4, draws: 1, winRate: 0.688 },
        { key: 'long',   label: 'Long',   min: 40, max: 70, games: 4, wins: 2, losses: 1, draws: 1, winRate: 0.5 },
        { key: 'epic',   label: 'Epic',   min: 70, max: Infinity, games: 1, wins: 0, losses: 1, draws: 0, winRate: 0 },
      ],
      toughestOpponent: {
        username: 'DrNykterstein',
        rating: 2895,
        wins: 0,
        losses: 2,
        draws: 1,
        totalGames: 3,
        profileUrl: 'https://www.chess.com/member/DrNykterstein',
      },
      hourlyPlay: [0, 0, 0, 0, 0, 0, 2, 1, 3, 4, 2, 1, 1, 2, 1, 2, 3, 4, 2, 1, 1, 0, 0, 0],
      peakHour: 8,
      beatingOdds: { games: 8, wins: 3, losses: 4, draws: 1, winRate: 0.375, avgDelta: 98, sumDelta: 784, deltaSamples: 8 },
      sampleSize: 30,
    },
    fetchedAt: ts,
    calls: [],
  }
}
