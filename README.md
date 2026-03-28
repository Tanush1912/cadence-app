# Cadence

A personal behavioral system disguised as a habit tracker. Built with Next.js, GunDB, and Gemini AI.

**No account. No cloud. Your data stays on your device.**

<p align="center">
  <img src="docs/screenshots/03-habits-page.png" width="200" />
  <img src="docs/screenshots/05-stats-page.png" width="200" />
  <img src="docs/screenshots/07-add-habit.png" width="200" />
  <img src="docs/screenshots/06-settings-page.png" width="200" />
</p>

---

## Core Tracking

- **Card-based habits** with per-habit mini heatmaps, monochrome icons, and per-habit color picker (8 colors)
- **Swipe gestures** — right to complete, left to reveal edit/skip/archive
- **Friction scoring** — inline 3-dot rating (easy/moderate/hard) after each completion
- **Frequency types** — daily, weekdays, 3x/week, specific days
- **Weekly day selector** with color-coded completion dots
- **Category filter** — All / Morning / Evening / Anytime
- **Historical editing** — past 3 days editable, retroactive entries marked
- **Streak tracking** — period-based, respects frequency schedules
- **Streak recovery** — 1-day grace period, max 2/week, requires 3+ day prior streak
- **Skip intentionally** — log a skip with reason (Tired/Busy/Sick/Rest day), improves data quality
- **Minimum mode** — toggle for bad days, shows only floor versions of habits

<p align="center">
  <img src="docs/screenshots/08-checkin-drawer.png" width="250" />
</p>

## AI Features

- **AI Check-in** — describe your day in text or voice, Gemini classifies which habits you completed, confirm with one tap
- **Voice journal** — tap mic, speak, Gemini transcribes instantly. Per-day entries with optional mood tagging
- **Full-screen voice mode** — mic expands to centered recording UI with waveform animation
- **Weekly AI reflection** — streaming conversation with Gemini reviewing your week, pattern extraction saved for future sessions
- **Reflection memory** — stores behavioral patterns across weeks, AI references them in future reflections

## Intelligence Layer

- **Next Best Action** — one line telling you what to do right now, derived from dependencies + decay + time of day
- **System Health Score** — 0-100 composite of completion, streaks, friction, and decay (hidden until 3+ days of data)
- **Keystone habit detection** — surfaces habits that boost overall completion when done, with confidence levels
- **Habit dependency graph** — pairwise relationships grouped as Boosters and Breakers with actionable suggestions
- **Habit decay alerts** — flags habits dropping 20%+ in consistency
- **Root cause detection** — correlates journal keywords + friction + skip reasons to explain why habits are missed
- **Dead habit detection** — identifies habits at <10% for 14+ days, prompts to archive
- **Long-term friction memory** — tracks consecutive weeks of high friction per habit
- **Silent coaching nudges** — inline on habit cards: "inactive lately", "↓ try 1 minute", "personal best", "getting consistent", "↑ exercise helps"
- **Time context awareness** — morning greeting, evening journal auto-expand, time-appropriate next actions
- **Auto simplification** — when system health drops below 40%, automatically filters to floor-only habits
- **Confidence layer** — every insight shows high/medium confidence based on sample size

## Stats

- **GitHub-style heatmap** — 365-day contribution grid with 5-level green color scale
- **Per-habit consistency** — ranked list with progress bars and decay/friction warnings
- **Connections** — Boosters and Breakers with impact percentages and suggestions
- **Keystone habits** — habits that make everything else easier
- **Timing** — when you typically complete each habit (mode-based)
- **Inactive section** — dead habits with one-tap archive

## Organization

- **Habit bundles** — group habits, one-tap complete all (max 3 bundles)
- **Experiment mode** — test a change for 2 weeks, compare before/after, keep or revert
- **Focus habit** — auto-highlighted habit most at risk of being skipped
- **Search** — instant search across habits, journal entries, and #tags
- **Context tags** — auto-extracted hashtags from journal text

## Settings & Customization

- **Per-habit colors** — 8 options per habit
- **Accent color theming** — 7 app-wide options (white, teal, amber, green, rose, purple, blue)
- **Daily goal slider** — 50-100%
- **Push notification reminders** — daily at your chosen time via Web Push
- **Data export** — JSON + Markdown
- **Encrypted API key storage** — AES-256-GCM with non-extractable CryptoKey

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Database | GunDB (local-only, IndexedDB) |
| AI | Gemini 2.5 Flash |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Animations | Framer Motion |
| Gestures | @use-gesture/react |
| Encryption | Web Crypto API (AES-256-GCM) |
| Push | Web Push API + Vercel Cron |
| Deploy | Vercel |

## Getting Started

```bash
cd cadence-frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables (optional)

Push notifications require VAPID keys:

```bash
npx web-push generate-vapid-keys
```

Add to `.env.local`:

```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_MAILTO=mailto:you@example.com
```

## Architecture

```
cadence-frontend/
  src/
    app/
      api/            # Serverless functions (transcribe, checkin, reminders, gemini)
      page.tsx         # Onboarding gate → app shell
    components/
      habits/          # Cards, journal, check-in, drawers, coaching nudges
      stats/           # Heatmap, health ring, dependencies, consistency
      system/          # Settings, experiments, bundles, reminders
      layout/          # App shell, floating nav, header, accent provider
    lib/
      gun/             # GunDB client, provider, data cache, types
      hooks/           # 20+ custom hooks (habits, logs, stats, health, dependencies, etc.)
      crypto/          # API key encryption (AES-256-GCM vault)
      utils/           # Dates, frequency, tags, habit icons
```

Data flows through a centralized `DataProvider` that loads all habits and logs once from GunDB. All hooks derive from the shared cache. Tab switching is instant (CSS-hidden, not unmounted).

## License

MIT
