// Insights — derive "signature" analytics from a normalized game log.
//
// Both Chess.com and Lichess produce wildly different game shapes, so each
// fetcher normalizes to a single shape (`NormalizedGame`) and then calls
// `computeInsights` to derive all the card's derived stats. The downstream
// components only know about this normalized shape.

/**
 * @typedef {Object} NormalizedGame
 * @property {'W'|'L'|'D'} result          User's outcome in this game.
 * @property {'white'|'black'} side         Which color the user played.
 * @property {number} [opponentRating]      Opponent's rating at the time.
 * @property {number} [myRating]            User's rating at the time.
 * @property {string} [opponentUsername]    Opponent's username on the platform.
 * @property {string} [firstMove]           SAN of the first move (e.g. 'e4').
 * @property {string} [openingName]         Opening name (e.g. 'Sicilian Defense').
 * @property {string} [openingEco]          ECO code (e.g. 'B90').
 * @property {'bullet'|'blitz'|'rapid'|'classical'|'correspondence'|'daily'|'ultraBullet'|'chess960'} [speed]
 * @property {number} [length]              Fullmove count (move pairs).
 * @property {number} [ts]                  Game end timestamp, ms.
 */

/**
 * @typedef {Object} StyleBadge
 * @property {string} archetype            ALL CAPS, e.g. 'TACTICIAN'.
 * @property {string} icon                 Chess glyph used as the badge mark.
 * @property {string} tagline              One-sentence description.
 * @property {string} tone                 'warm' | 'cool' | 'bold' | 'subtle'.
 */

/**
 * @typedef {Object} Insights
 * @property {{white: Split, black: Split}} colorSplit
 * @property {Array<{move: string, count: number, pct: number}>} firstMove
 * @property {?SignatureOpening} signatureOpening
 * @property {{type: 'W'|'L', length: number}} longestStreak
 * @property {StyleBadge} style
 * @property {number} avgLength            Average game length in fullmoves.
 * @property {?number} puzzleRating        Lichess puzzle rating, if known.
 * @property {Array<LengthBucket>} lengthBuckets
 * @property {?ToughestOpponent} toughestOpponent
 * @property {Array<number>} hourlyPlay    24-element array, count per hour-of-day.
 * @property {?number} peakHour            0-23, hour of day with most games.
 * @property {?BeatingOdds} beatingOdds
 * @property {number} sampleSize           Number of games the insights are based on.
 */

/**
 * @typedef {Object} Split
 * @property {number} games
 * @property {number} wins
 * @property {number} losses
 * @property {number} draws
 * @property {number} winRate
 */

/**
 * @typedef {Object} SignatureOpening
 * @property {string} name
 * @property {string} [eco]
 * @property {number} games
 * @property {number} wins
 * @property {number} losses
 * @property {number} draws
 * @property {number} winRate
 * @property {?number} avgOpponent
 */

/**
 * @typedef {Object} LengthBucket
 * @property {string} key                  'short' | 'medium' | 'long' | 'epic'
 * @property {string} label                'Short' | 'Medium' | 'Long' | 'Epic'
 * @property {number} min                  Inclusive minimum fullmoves.
 * @property {number} max                  Inclusive maximum fullmoves (Infinity for last).
 * @property {number} games
 * @property {number} wins
 * @property {number} losses
 * @property {number} draws
 * @property {number} winRate
 */

/**
 * @typedef {Object} ToughestOpponent
 * @property {string} username
 * @property {number} rating                Highest rating the opponent had vs us.
 * @property {number} wins
 * @property {number} losses
 * @property {number} draws
 * @property {number} totalGames
 * @property {string} [profileUrl]         Link to opponent's profile.
 */

/**
 * @typedef {Object} BeatingOdds
 * @property {number} games                Games where opponent rating > user rating.
 * @property {number} wins
 * @property {number} losses
 * @property {number} draws
 * @property {number} winRate
 * @property {number} avgDelta             Average (opponentRating - myRating).
 */

const MOVE_CATEGORIES = ['e4', 'd4', 'c4', 'Nf3', 'f4', 'flank', 'other']

const LENGTH_BUCKETS = [
  { key: 'short',  label: 'Short',  min: 0,  max: 20 },
  { key: 'medium', label: 'Medium', min: 20, max: 40 },
  { key: 'long',   label: 'Long',   min: 40, max: 70 },
  { key: 'epic',   label: 'Epic',   min: 70, max: Infinity },
]

/**
 * Map a Lichess-style puzzle rating to a "top X%" label. Roughly
 * approximates Lichess's published distribution so the percentile feels
 * honest without us pulling real data.
 */
function puzzleRatingPercentile(rating) {
  if (!Number.isFinite(rating)) return null
  if (rating >= 3000) return 1
  if (rating >= 2700) return 2
  if (rating >= 2500) return 5
  if (rating >= 2300) return 10
  if (rating >= 2100) return 20
  if (rating >= 1900) return 40
  if (rating >= 1700) return 60
  return 80
}

/**
 * Classify a SAN first move into a small set of buckets for the chart.
 */
export function classifyFirstMove(san) {
  if (!san) return 'other'
  const m = String(san).toLowerCase()
  if (m === 'e4') return 'e4'
  if (m === 'd4') return 'd4'
  if (m === 'c4') return 'c4'
  if (m === 'nf3') return 'Nf3'
  if (m === 'f4') return 'f4'
  // Flank openings: b3, g3, a3, h3, Na3, Nh3, etc.
  if (m === 'b3' || m === 'g3' || m === 'a3' || m === 'h3' || m.startsWith('na') || m.startsWith('nh')) return 'flank'
  return 'other'
}

function emptySplit() {
  return { games: 0, wins: 0, losses: 0, draws: 0, winRate: 0 }
}

function deriveArchetype({ winRate, drawRate, bulletRatio, fastRatio, avgLength, totalGames, puzzleRating, beatingOdds, colorSplit, signatureOpening }) {
  // Priority-ordered: most specific / most distinctive traits win.
  // We keep each rule's threshold on the conservative side so casual
  // players with a few games don't get mislabelled.

  if (beatingOdds && beatingOdds.winRate >= 0.55 && beatingOdds.games >= 4) {
    return {
      archetype: 'GIANT KILLER',
      icon: '🏹',
      tone: 'bold',
      tagline: `${Math.round(beatingOdds.winRate * 100)}% win rate against stronger players. You punch up.`,
    }
  }

  if (signatureOpening && signatureOpening.games >= 5 && signatureOpening.winRate >= 0.65) {
    const shortName = signatureOpening.name.split(':')[0]
    return {
      archetype: 'SPECIALIST',
      icon: '📖',
      tone: 'warm',
      tagline: `${Math.round(signatureOpening.winRate * 100)}% win rate in the ${shortName}. Highly prepared.`,
    }
  }

  if (colorSplit && colorSplit.white?.winRate >= 0.65 && colorSplit.white?.games >= 6) {
    return {
      archetype: 'WHITE KNIGHT',
      icon: '♘',
      tone: 'warm',
      tagline: `${Math.round(colorSplit.white.winRate * 100)}% win rate as White. Dominating with the first move.`,
    }
  }

  if (colorSplit && colorSplit.black?.winRate >= 0.60 && colorSplit.black?.games >= 6) {
    return {
      archetype: 'SHADOW PLAY',
      icon: '♞',
      tone: 'cool',
      tagline: `${Math.round(colorSplit.black.winRate * 100)}% win rate as Black. Lethal on the counter.`,
    }
  }

  if (puzzleRating && puzzleRating >= 2000) {
    return {
      archetype: 'SCHOLAR',
      icon: '♝',
      tone: 'cool',
      tagline: `Puzzle rating ${puzzleRating} — you study the patterns others miss.`,
    }
  }
  if (totalGames >= 2000) {
    return {
      archetype: 'GRINDER',
      icon: '♜',
      tone: 'bold',
      tagline: `${totalGames.toLocaleString()} games played. Relentless dedication to the board.`,
    }
  }
  if (bulletRatio >= 0.4) {
    return {
      archetype: 'BERSERKER',
      icon: '♞',
      tone: 'bold',
      tagline: `${Math.round(bulletRatio * 100)}% bullet — speed is your weapon.`,
    }
  }
  if (avgLength >= 45) {
    return {
      archetype: 'MARATHONER',
      icon: '♚',
      tone: 'subtle',
      tagline: `Average game is ${Math.round(avgLength)} moves. Deep waters.`,
    }
  }
  if (drawRate >= 0.25) {
    return {
      archetype: 'DIPLOMAT',
      icon: '♛',
      tone: 'cool',
      tagline: `${Math.round(drawRate * 100)}% of your games end in a draw. You negotiate.`,
    }
  }
  if (fastRatio >= 0.7) {
    return {
      archetype: 'SPEED DEMON',
      icon: '♞',
      tone: 'bold',
      tagline: `You live in fast time controls. Tactics over depth.`,
    }
  }
  if (winRate >= 0.58) {
    return {
      archetype: 'TACTICIAN',
      icon: '♞',
      tone: 'warm',
      tagline: `${Math.round(winRate * 100)}% win rate — sharp, clean play.`,
    }
  }
  return {
    archetype: 'BALANCED',
    icon: '♛',
    tone: 'subtle',
    tagline: 'No strong style yet — keep playing to discover yours.',
  }
}

/**
 * @param {NormalizedGame[]} games
 * @param {{ puzzleRating?: number }} [opts]
 * @returns {Insights}
 */
export function computeInsights(games, opts = {}) {
  const sample = Array.isArray(games) ? games : []
  const sampleSize = sample.length

  const split = { white: emptySplit(), black: emptySplit() }
  const firstMoveCounts = new Map()
  const openingAgg = new Map()
  const opponentAgg = new Map()
  const hourlyPlay = new Array(24).fill(0)
  const lengthBucketAgg = LENGTH_BUCKETS.map((b) => ({
    ...b,
    games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
  }))
  const beating = { games: 0, wins: 0, losses: 0, draws: 0, winRate: 0, sumDelta: 0, deltaSamples: 0 }
  let totalWins = 0
  let totalDraws = 0

  let totalLength = 0
  let lengthSamples = 0
  let bulletCount = 0
  let fastCount = 0
  let peakHourCount = 0
  let peakHour = null
  let highestOpponentRating = 0
  let highestOpponentUsername = null
  const ratingHistory = []

  for (const g of sample) {
    if (g.side === 'white' || g.side === 'black') {
      const s = split[g.side]
      s.games++
      if (g.result === 'W') { s.wins++; totalWins++ }
      else if (g.result === 'L') s.losses++
      else { s.draws++; totalDraws++ }
    }
    if (g.firstMove) {
      const cat = classifyFirstMove(g.firstMove)
      firstMoveCounts.set(cat, (firstMoveCounts.get(cat) || 0) + 1)
    }
    if (g.openingName) {
      let agg = openingAgg.get(g.openingName)
      if (!agg) {
        agg = {
          name: g.openingName,
          eco: g.openingEco || null,
          games: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          sumOpp: 0,
          oppSamples: 0,
        }
        openingAgg.set(g.openingName, agg)
      }
      agg.games++
      if (g.result === 'W') agg.wins++
      else if (g.result === 'L') agg.losses++
      else agg.draws++
      if (Number.isFinite(g.opponentRating)) {
        agg.sumOpp += g.opponentRating
        agg.oppSamples++
      }
    }
    // Per-opponent aggregation. We key by username when available so a
    // single strong opponent shows up as a single record even if we faced
    // them at different rating snapshots.
    if (g.opponentUsername) {
      const key = g.opponentUsername.toLowerCase()
      let opp = opponentAgg.get(key)
      if (!opp) {
        opp = {
          username: g.opponentUsername,
          peakRating: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          totalGames: 0,
        }
        opponentAgg.set(key, opp)
      }
      if (Number.isFinite(g.opponentRating) && g.opponentRating > opp.peakRating) {
        opp.peakRating = g.opponentRating
      }
      opp.totalGames++
      if (g.result === 'W') opp.wins++
      else if (g.result === 'L') opp.losses++
      else opp.draws++

      if (Number.isFinite(g.opponentRating) && g.opponentRating > highestOpponentRating) {
        highestOpponentRating = g.opponentRating
        highestOpponentUsername = g.opponentUsername
      }
    }
    if (Number.isFinite(g.length)) {
      totalLength += g.length
      lengthSamples++
      for (const b of lengthBucketAgg) {
        if (g.length >= b.min && g.length < b.max) {
          b.games++
          if (g.result === 'W') b.wins++
          else if (g.result === 'L') b.losses++
          else b.draws++
          break
        }
      }
    }
    if (g.speed === 'bullet' || g.speed === 'ultraBullet') bulletCount++
    if (g.speed === 'bullet' || g.speed === 'blitz' || g.speed === 'ultraBullet') fastCount++

    // Hour-of-day from timestamp
    if (Number.isFinite(g.ts)) {
      const h = new Date(g.ts).getUTCHours()
      hourlyPlay[h]++
      if (hourlyPlay[h] > peakHourCount) {
        peakHourCount = hourlyPlay[h]
        peakHour = h
      }
    }

    // Beating the odds = games where opponent was rated higher than us
    if (Number.isFinite(g.opponentRating) && Number.isFinite(g.myRating) && g.opponentRating > g.myRating) {
      beating.games++
      if (g.result === 'W') beating.wins++
      else if (g.result === 'L') beating.losses++
      else beating.draws++
      beating.sumDelta += g.opponentRating - g.myRating
      beating.deltaSamples++
    }

    // Rating history — collect (ts, rating) pairs for the line chart
    if (Number.isFinite(g.ts) && Number.isFinite(g.myRating)) {
      ratingHistory.push({ ts: g.ts, rating: g.myRating })
    }
  }

  for (const b of lengthBucketAgg) {
    b.winRate = b.games ? b.wins / b.games : 0
  }
  beating.winRate = beating.games ? beating.wins / beating.games : 0
  beating.avgDelta = beating.deltaSamples ? Math.round(beating.sumDelta / beating.deltaSamples) : 0

  for (const k of ['white', 'black']) {
    const s = split[k]
    s.winRate = s.games ? s.wins / s.games : 0
  }

  const totalFirstMoves = [...firstMoveCounts.values()].reduce((a, b) => a + b, 0)
  const firstMove = MOVE_CATEGORIES
    .map((cat) => {
      const count = firstMoveCounts.get(cat) || 0
      return { move: cat, count, pct: totalFirstMoves ? count / totalFirstMoves : 0 }
    })
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count)

  // Signature opening = best WR over at least 5 games. If none qualifies,
  // we fall back to the most-played opening with 3+ games for a softer
  // signal — keeps the card interesting for casual users with thin data.
  let signatureOpening = null
  for (const agg of openingAgg.values()) {
    if (agg.games >= 5) {
      const wr = agg.wins / agg.games
      if (!signatureOpening || wr > signatureOpening.winRate) {
        signatureOpening = {
          name: agg.name,
          eco: agg.eco,
          games: agg.games,
          wins: agg.wins,
          losses: agg.losses,
          draws: agg.draws,
          winRate: wr,
          avgOpponent: agg.oppSamples ? Math.round(agg.sumOpp / agg.oppSamples) : null,
        }
      }
    }
  }
  if (!signatureOpening) {
    let fallback = null
    for (const agg of openingAgg.values()) {
      if (agg.games < 3) continue
      if (!fallback || agg.games > fallback.games) {
        fallback = {
          name: agg.name,
          eco: agg.eco,
          games: agg.games,
          wins: agg.wins,
          losses: agg.losses,
          draws: agg.draws,
          winRate: agg.wins / agg.games,
          avgOpponent: agg.oppSamples ? Math.round(agg.sumOpp / agg.oppSamples) : null,
        }
      }
    }
    if (fallback) signatureOpening = fallback
  }

  // Longest streak — sort by ts ascending (oldest first) and walk.
  const sorted = sample.filter((g) => Number.isFinite(g.ts)).slice().sort((a, b) => a.ts - b.ts)
  let longestW = 0
  let longestL = 0
  let curW = 0
  let curL = 0
  for (const g of sorted) {
    if (g.result === 'W') {
      curW++
      if (curW > longestW) longestW = curW
      curL = 0
    } else if (g.result === 'L') {
      curL++
      if (curL > longestL) longestL = curL
      curW = 0
    } else {
      curW = 0
      curL = 0
    }
  }
  const longestStreak =
    longestW >= longestL
      ? { type: 'W', length: longestW }
      : { type: 'L', length: longestL }

  // Style
  const total = sampleSize
  const wins = totalWins
  const draws = totalDraws
  const winRate = total ? wins / total : 0
  const drawRate = total ? draws / total : 0
  const bulletRatio = total ? bulletCount / total : 0
  const fastRatio = total ? fastCount / total : 0
  const avgLength = lengthSamples ? totalLength / lengthSamples : 0

  const style = deriveArchetype({
    winRate,
    drawRate,
    bulletRatio,
    fastRatio,
    avgLength,
    totalGames: opts.totalGames || total,
    puzzleRating: opts.puzzleRating,
    beatingOdds: beating.games > 0 ? beating : null,
    colorSplit: split,
    signatureOpening,
  })

  // Toughest opponent = whoever has the highest peak rating we've seen.
  // Tied with the username we saw on the strongest game.
  let toughestOpponent = null
  if (highestOpponentUsername) {
    const opp = opponentAgg.get(highestOpponentUsername.toLowerCase())
    if (opp) {
      toughestOpponent = {
        username: opp.username,
        rating: opp.peakRating,
        wins: opp.wins,
        losses: opp.losses,
        draws: opp.draws,
        totalGames: opp.totalGames,
        profileUrl: opts.platform === 'lichess'
          ? `https://lichess.org/@/${opp.username}`
          : opts.platform === 'chess.com'
          ? `https://www.chess.com/member/${opp.username}`
          : null,
      }
    }
  }

  // Puzzle percentile (Lichess only)
  const puzzleRating = opts.puzzleRating || null
  const puzzlePercentile = puzzleRating ? puzzleRatingPercentile(puzzleRating) : null

  return {
    colorSplit: split,
    firstMove,
    signatureOpening,
    longestStreak,
    style,
    avgLength: Math.round(avgLength),
    puzzleRating,
    puzzlePercentile,
    lengthBuckets: lengthBucketAgg,
    toughestOpponent,
    hourlyPlay,
    peakHour: peakHourCount > 0 ? peakHour : null,
    beatingOdds: beating.games > 0 ? beating : null,
    sampleSize,
  }
}

/**
 * @param {string} pgn
 * @returns {?string}
 */
export function extractFirstMoveFromPgn(pgn) {
  if (!pgn) return null
  // PGN headers end with a blank line, then moves begin with "1. <san>".
  // We just need the first SAN token after any "1." marker.
  const m = /(?:^|\s)1\.\s*(\S+)/.exec(pgn)
  return m ? m[1] : null
}

/**
 * Roughly count fullmoves in a PGN. Counts unique "N." tokens.
 *
 * IMPORTANT: this must operate ONLY on the moves section, not the
 * bracketed header block. The PGN `[Date "2024.01.15"]` header contains
 * `2024.` which a naive regex would mistake for move number 2024.
 * @param {string} pgn
 * @returns {number}
 */
export function countPgnFullmoves(pgn) {
  if (!pgn) return 0
  // Strip the header block. Headers are `[...]` lines; everything after the
  // first blank line is the moves section.
  let moves = pgn
  const headerEnd = pgn.indexOf('\n\n')
  if (headerEnd >= 0) {
    moves = pgn.slice(headerEnd + 2)
  } else {
    // No blank-line separator (rare) — drop any leading `[...]` lines.
    const lines = pgn.split('\n')
    const start = lines.findIndex((l) => !l.trim().startsWith('['))
    if (start > 0) moves = lines.slice(start).join('\n')
  }
  // Strip curly-brace comments which may contain numbers (e.g. "{2.5 hours}")
  // that would be falsely matched as move numbers.
  moves = moves.replace(/\{[^}]*\}/g, '')
  let max = 0
  const re = /(\d+)\.{1,3}/g
  let match
  while ((match = re.exec(moves)) != null) {
    const n = Number(match[1])
    if (Number.isFinite(n) && n > max) max = n
  }
  return max
}
