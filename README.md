# ♟️ ChessCard Studio

[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind--CSS-3.x-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer--Motion-11.x-FF00C1?style=flat-square&logo=framer&logoColor=white)](https://www.framer.com/motion/)

A modern, highly polished web application that analyzes public profiles to detail comprehensive performance statistics, playstyle insights, and active trends, and turns any public **Chess.com** or **Lichess** profile into a beautiful, downloadable infographic stats card. The UI/UX is built with flat, minimalistic elements inspired by the **Chess.com design system**, featuring fluid spring transitions and a comprehensive set of performance metrics.

---

## ✨ Key Features

### 👤 Single Player Mode
- **Identity Panel**: Fetches avatars, real names, national flags, and official titles (e.g., GM, IM, WFM) styled in authentic badges.
- **Style Archetype Badge**: Analyzes play volume and win rates to determine style profiles (e.g. `TACTICIAN`, `BERSERKER`, `SCHOLAR`).
- **Interactive Stat Sheets**: Uses a tabbed layout to view:
  - **Overview**: Active rating progress charts, current streak, and favorite opening moves.
  - **Repertoire**: Custom win/draw/loss distribution cells.
  - **Insights**: Play frequency charts (time of day), average game length, recent form chips, and toughest opponent details.

### ⚔️ Versus Comparison Mode
- **Side-by-Side Comparison**: Input any two players from Lichess or Chess.com and compare them on a single, unified canvas.
- **Branding Accents**: Colors dynamically code Player 1 (Crimson Red) and Player 2 (Emerald Green) to make matchups instantly recognizable.
- **Matchup Hub**: Dynamically compares ratings across Blitz/Rapid/Bullet formats, aggregates favorite openings, and prints a custom tactical matchup analysis.
- **Mobile Realignment**: Features a fully responsive stacked layout on mobile screens with uniform avatar sizing and green/red border separation to preserve visual hierarchy.

### 🎨 Visual & Motion Design
- **Flat Minimalism & Typography**: High-fidelity custom fonts (`Press Start 2P`, `Silkscreen`, `VT323`) and serif families configured for a retro/pixel stat card feel.
- **GPU-Accelerated Backgrounds**: Fluid parallax backgrounds with gradient orbs that scale down and simplify dynamically on mobile screens (reducing layout/paint performance costs by 85%).
- **Responsive Sidebar drawer**: Auto-collapsing sidebar drawer on mobile/tablet breakpoints when initial query parameters exist or upon form generation, maximizing stats card screen real estate.
- **Light & Dark Mode**: Warm parchment paper background in light mode; clean dark-charcoal parchment (`#161513`) in dark mode.
- **Seamless Actions**: Download the high-quality 2x PNG card image or share directly to social media (X/Twitter) using Web Share APIs.

---

## 🛠️ Tech Stack

- **Core Framework**: React 18 (with React Query for data state management)
- **Bundler & Dev Server**: Vite 5 (ultra-fast Hot Module Replacement)
- **Styling Engine**: Tailwind CSS 3 (utility-first styles with a custom warm color palette)
- **Animation Engine**: Framer Motion (buttery smooth spring dynamics)
- **Export Utility**: `html-to-image` (re-renders DOM to 2x high-DPI canvas outputs)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have **Node.js (v18+)** installed.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ayushthepiro11-design/ChessDesign.git
   cd ChessDesign
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the local development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📂 Project Architecture

```
ChessDesign/
├── public/                 # Static assets (Favicons, badges)
├── src/
│   ├── App.jsx             # Main application orchestrator & layout
│   ├── main.jsx            # Entry point & React Query providers
│   ├── index.css           # Global typography, animations & overrides
│   ├── components/
│   │   ├── StatCard.jsx        # Single player card infographic
│   │   ├── ComparisonCard.jsx  # Side-by-side versus comparison card
│   │   ├── Sidebar.jsx         # Chess.com-style sidebar navigation
│   │   ├── ActionBar.jsx       # Card download/share action controls
│   │   ├── LiveBadge.jsx       # Live rating check indicator
│   │   ├── RecentForm.jsx      # Form chips (W/L/D) tracker
│   │   └── ...                 # Additional metric-specific subcomponents
│   └── lib/
│       ├── api.js              # Fetching layer for Lichess and Chess.com
│       ├── apiUtils.js         # Concurrent RequestQueue & PersistentCache helpers
│       ├── insights.js         # Archetypes & statistics compilation logic
│       └── format.js           # Number & ratio formatters
├── tailwind.config.js      # Tailwind design system configurations
└── vite.config.js          # Vite configuration settings
```

---

## 📡 API & Caching Layer

- **Public Endpoints**: Integrates with Chess.com and Lichess public endpoints directly. No developer API keys are required.
- **Persistent Cache**: Responses are saved to `localStorage` with a **5-minute Time-To-Live (TTL)** to avoid duplicate network calls.
- **Concurrency Request Queue**: Standardizes batch calls down to a maximum of 3 concurrent requests with a 100ms delay to respect API rate limits.
- **Performance Optimizations**: 
  - CDNs preconnecting (`lichess1.org` and `images.chesscomfiles.com`) in the HTML document to minimize profile avatar network lookup latency.
  - Asynchronous lazy loading applied to profile avatar `<img>` tags to prevent blocking main document rendering.
- **Graceful Fallbacks**: If an API is rate-limited or offline, the app displays a demo state so the user interface remains fully interactive and testable.


