# ChessCard

A polished, Claude-inspired web app that turns a **Chess.com** or **Lichess** username into a clean, downloadable stat card infographic.

## Stack

- **React 18** + **Vite 5** — fast HMR, zero-config
- **Tailwind CSS 3** — utility-first styling with a custom warm-canvas palette
- **Framer Motion** — spring physics, 3D tilt, animated counters
- **html-to-image** — for exporting the card to PNG (2x scale)
- **canvas-confetti** — chess-themed confetti burst on card generation
- Pure public APIs (no backend required)

## Features

- Segmented **Chess.com / Lichess** platform toggle with a sliding thumb
- **Versus mode** — compare two players side-by-side in a ComparisonCard
- Live fetch from each platform's public API with progressive status log
- Graceful **demo fallback** when the network or username is unavailable
- Beautiful, serif-driven **infographic card**:
  - Profile identity: avatar, name, title badge, country, platform badge
  - Archetype / style badge (TACTICIAN, BERSERKER, SCHOLAR, etc.)
  - Peak rating + live rating + rating trend
  - W/L/D ratio with stacked bar + ratio cells
  - Current streak + longest historical streak
  - Most-played opening with win rate
  - Per-format rating grid (Rapid, Blitz, Bullet, Daily, Chess960)
  - Color split (White vs Black win rates)
  - First move distribution
  - Win rate by game length (Short/Medium/Long/Epic)
  - "Beating the Odds" — win rate vs higher-rated opponents
  - Time of day chart (24-hour bar chart of play frequency)
  - Toughest opponent card
  - Recent form (last N game results)
- **3-tab swipeable card**: Overview, Repertoire, Insights
- **ComparisonCard**: side-by-side profiles, VS delta, format bars, streak comparison, style matchup
- Interactive **3D tilt on hover** with glare/shine effects
- **Light + Dark** themes (auto-detected, persisted)
- **Download PNG** (2x scale) and **Share to X** actions
- **Mascot** chess knight that reacts to app state
- Shimmer **skeleton loading** states
- **Background FX**: floating chess pieces, gradient orbs, dot grid, film grain
- Fully responsive — stacks beautifully on mobile, side-by-side on desktop
- Snappy `duration-150` "clicky" micro-interactions on every interactive surface
- **Reduced motion** support (`prefers-reduced-motion`)
- **Keyboard navigation** (arrow keys for tab switching, touch swipe on mobile)
- **API Explorer** — collapsible JSON viewer showing raw API responses
- **Sticky top bar** with breadcrumbs + latency indicator
- **Error boundary** with friendly fallback UI

## Run

```bash
npm install
npm run dev
```

Then open <http://localhost:5173>.

## Build

```bash
npm run build
npm run preview
```

## Layout

```
src/
├── App.jsx                       # State, theme, layout, fetch orchestration
├── main.jsx                      # React entry + React Query provider
├── index.css                     # Tailwind layers, custom keyframes, scrollbar styles
├── components/
│   ├── Sidebar.jsx               # Logo, platform toggle, input, CTA, premium tile
│   ├── StatCard.jsx              # The downloadable infographic (single player)
│   ├── ComparisonCard.jsx        # Side-by-side player comparison
│   ├── StatCardSkeleton.jsx      # Loading placeholder
│   ├── ActionBar.jsx             # Download PNG + Share to X
│   ├── ApiExplorer.jsx           # Collapsible raw API response viewer
│   ├── Mascot.jsx                # Chess knight mascot with idle/loading/success/error states
│   ├── BackgroundFX.jsx          # Floating chess pieces, gradient orbs, film grain
│   ├── Confetti.jsx              # Chess-themed confetti burst
│   ├── GeneratingFX.jsx          # Progressive API call log during loading
│   ├── AnimatedNumber.jsx        # Spring-animated number counter
│   ├── LiveBadge.jsx             # "Live" indicator badge
│   ├── StyleBadge.jsx            # Archetype/style badge (TACTICIAN, etc.)
│   ├── RecentForm.jsx            # Last N game results as colored chips
│   ├── TimeControlGrid.jsx       # Per-format rating grid
│   ├── ColorSplit.jsx            # White vs Black win rates
│   ├── FirstMove.jsx             # Opening move distribution
│   ├── WinRateByLength.jsx       # Win rate by game length chart
│   ├── TimeOfDay.jsx             # 24-hour play frequency chart
│   ├── ToughestOpponent.jsx      # Highest-rated opponent faced
│   ├── BeatingTheOdds.jsx        # Win rate vs higher-rated opponents
│   └── Icons.jsx                 # Inline SVG icon set
├── lib/
│   ├── api.js                    # Chess.com + Lichess fetchers + demo fallback
│   ├── apiUtils.js               # RequestQueue, PersistentCache, fetchWithRetry, normalization
│   ├── insights.js               # Stats computation, archetype detection
│   ├── format.js                 # Number / rating / percent helpers
│   └── useIsDark.js              # MutationObserver hook for dark mode detection
```

## Notes

- Chess.com's API supports CORS for unauthenticated public reads.
- Lichess's `/api/user/{username}` and `/api/games/user/{username}` endpoints are used; the latter is queried (max 500 games) to compute per-format stats, openings, and time-of-day distribution.
- If a fetch fails (rate limit, 404, offline), the app surfaces a soft warning and renders the demo profile so the layout is still demonstrable.
- The app uses a persistent localStorage cache (5-minute TTL) to avoid redundant API calls.
- The `RequestQueue` limits concurrency to 3 simultaneous requests with 100ms delay between batches.
