# Track The Trades – Developer Guide

## Stack

- React 18 + Vite + TypeScript (strict mode)
- Tailwind CSS with custom dark theme (`tailwind.config.js`)
- Supabase (PostgreSQL + Row-Level Security + Auth)
- Netlify hosting (`netlify.toml` with SPA redirect)
- Key libraries: recharts, papaparse, date-fns, react-router-dom v6, lucide-react, react-hot-toast, @dnd-kit

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # tsc + vite build
npm run preview  # Preview production build
```

## File Map

```
src/
├── App.tsx                    # Router: protected routes wrapped in AppLayout
├── types/index.ts             # ALL TypeScript interfaces (single source of truth)
├── lib/
│   ├── supabase.ts            # Untyped Supabase client (createClient<any>)
│   ├── utils.ts               # computeStats, computeDailyPnl, computeCumulativePnl,
│   │                          #   computeWeeklyStats, getDateRange, formatters
│   ├── trade-matcher.ts       # FIFO round-trip matching algorithm
│   ├── csv-parser.ts          # TradeStation CSV → ParsedOrder[] (PapaParse)
│   ├── contract-specs.ts      # ~30 futures point values (ES=$50, NQ=$20, etc.)
│   ├── goals.ts               # computeGoalProgress() with pacing & projections
│   ├── badges.ts              # BADGE_DEFINITIONS + computeBadgeStatuses/checkNewlyEarned
│   └── coaching.ts            # evaluateCoachingCues() – today-scoped risk nudges
├── hooks/
│   ├── useBadges.ts            # load/award/revoke earned_badges
│   ├── useGoalCelebration.ts   # queues newly-achieved goals for celebration
│   ├── useCoachingSettings.ts  # loads/upserts coaching_settings row
│   └── useCoachingCues.ts      # evaluates + per-day dismisses coaching cues
├── contexts/
│   ├── AuthContext.tsx         # useAuth() – user, signIn, signUp, signOut
│   └── AccountContext.tsx      # useAccount() – accounts[], activeAccount, CRUD
├── pages/                     # All lazy-loaded via React.lazy()
│   ├── AuthPage.tsx
│   ├── DashboardPage.tsx
│   ├── TradesPage.tsx
│   ├── ImportPage.tsx
│   ├── GoalsPage.tsx
│   ├── AccountsPage.tsx
│   ├── BadgesPage.tsx
│   ├── TaxPage.tsx
│   └── CalendarPage.tsx
└── components/
    ├── layout/                # AppLayout, Sidebar, StatusBanner
    ├── dashboard/             # DateFilter, StatsCards, PnlChart, RecentTrades,
    │                          #   WeeklyStats, GoalsWidget, StreakWidget, BadgesWidget
    ├── trades/                # TradesTable (sortable/filterable)
    ├── import/                # ImportWizard (upload → preview → confirm)
    ├── calendar/              # TradeCalendar (heatmap)
    ├── goals/                 # GoalCard, GoalForm, GoalAchievedModal
    ├── badges/                # BadgeCard, BadgeUnlockModal
    ├── coaching/              # CoachingBanner, CoachingSettingsPanel
    └── tax/                   # TaxDashboardCards, TaxBreakdownTable,
                               #   TaxCharts, TaxProfileForm
```

## Routing

All protected routes are children of AppLayout. Unauthenticated users redirect to `/auth`.

```
/            → redirect /dashboard
/dashboard   → DashboardPage
/trades      → TradesPage
/import      → ImportPage
/goals       → GoalsPage
/accounts    → AccountsPage
/badges      → BadgesPage
/tax         → TaxPage
/auth        → AuthPage (public)
*            → redirect /dashboard
```

## Database Schema

### Table: accounts

| Column                  | Type                 | Notes                                                 |
| ----------------------- | -------------------- | ----------------------------------------------------- |
| id                      | UUID PK              |                                                       |
| user_id                 | UUID FK → auth.users | CASCADE                                               |
| name                    | TEXT                 |                                                       |
| account_type            | TEXT                 | CHECK: paper\|live\|demo                              |
| product_type            | TEXT                 | CHECK: futures\|stocks\|crypto\|forex\|options\|mixed |
| broker                  | TEXT                 |                                                       |
| currency                | TEXT                 | default USD                                           |
| starting_balance        | NUMERIC              | nullable                                              |
| color                   | TEXT                 | hex, default #4a7cf4                                  |
| is_default              | BOOLEAN              |                                                       |
| description             | TEXT                 | nullable                                              |
| created_at / updated_at | TIMESTAMPTZ          |                                                       |

### Table: imports

| Column                    | Type                 | Notes                |
| ------------------------- | -------------------- | -------------------- |
| id                        | UUID PK              |                      |
| user_id                   | UUID FK → auth.users | CASCADE              |
| account_id                | UUID FK → accounts   | SET NULL             |
| file_name                 | TEXT                 |                      |
| broker                    | TEXT                 | default TradeStation |
| imported_at               | TIMESTAMPTZ          |                      |
| order_count / trade_count | INT                  |                      |

### Table: orders

| Column                                  | Type     | Notes              |
| --------------------------------------- | -------- | ------------------ |
| id                                      | UUID PK  |                    |
| user_id / import_id / account_id        | UUID FKs |                    |
| order_id                                | TEXT     | UNIQUE per user_id |
| symbol, side, order_type, status        | TEXT     |                    |
| qty, filled_qty                         | INT      |                    |
| limit_price, stop_price, avg_fill_price | NUMERIC  |                    |
| open_time, close_time, duration         | TEXT     |                    |
| commission_fee                          | NUMERIC  |                    |
| expiration_date                         | TEXT     |                    |

### Table: trades

| Column                                         | Type        | Notes              |
| ---------------------------------------------- | ----------- | ------------------ |
| id                                             | UUID PK     |                    |
| user_id / import_id / account_id               | UUID FKs    |                    |
| symbol                                         | TEXT        |                    |
| direction                                      | TEXT        | CHECK: Long\|Short |
| entry_time / exit_time                         | TIMESTAMPTZ |                    |
| entry_price / exit_price                       | NUMERIC     |                    |
| qty                                            | INT         |                    |
| gross_pnl / commission / net_pnl / point_value | NUMERIC     |                    |
| trade_date                                     | DATE        | YYYY-MM-DD         |
| duration_seconds                               | INT         |                    |
| entry_order_id / exit_order_id                 | TEXT        |                    |

### Table: goals

| Column                    | Type     | Notes                                                                                                |
| ------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| id                        | UUID PK  |                                                                                                      |
| user_id / account_id      | UUID FKs |                                                                                                      |
| title                     | TEXT     |                                                                                                      |
| type                      | TEXT     | profit_target\|win_rate\|consistent_days\|consistent_weeks\|profit_factor\|trade_count\|max_drawdown |
| period                    | TEXT     | this_week\|this_month\|this_year\|custom\|all_time                                                   |
| period_start / period_end | DATE     | nullable                                                                                             |
| target_value              | NUMERIC  |                                                                                                      |
| status                    | TEXT     | active\|achieved\|archived                                                                           |

All tables have RLS enabled. Every SELECT/INSERT/UPDATE/DELETE policy checks `auth.uid() = user_id`. When querying Supabase always filter by `account_id` via `activeAccount.id` from `useAccount()`.

## Key TypeScript Types (src/types/index.ts)

```ts
// Core domain
MatchedTrade; // in-memory matched trade before DB insert
DbTrade; // DB row shape
DbOrder; // DB row shape
DbImport; // DB row shape
DbAccount; // DB row shape
DbGoal; // DB row shape

// Stats
TradeStats; // win rate, profit factor, streaks, avg win/loss, etc.
DailyPnl; // date, netPnl, tradeCount, winCount, lossCount
CumulativePnl; // date, cumulative, daily
WeeklyStats; // 13-week rolling window

// Date filtering
DatePreset; // 'today'|'yesterday'|'this_week'|'last_week'|'this_month'|'last_month'|'this_year'|'last_year'|'custom'
DateRange; // { start: Date, end: Date, preset: DatePreset }

// Goals
GoalProgress; // goal, currentValue, percentComplete, paceTarget, isAchieved, projectedDate, etc.

// Import flow
ImportPreview; // allOrders, filledOrders, matchedTrades, existingOrderIds (Set), newTrades, duplicateTrades
```

Always add new types to `src/types/index.ts`, never inline them in components.

## Core Algorithms

### Trade Matching (src/lib/trade-matcher.ts)

FIFO algorithm. Sorts filled orders by `closeTime`, maintains `longQueue` / `shortQueue` per symbol.

- Buy order: closes shorts first (FIFO), then opens a long
- Sell order: closes longs first (FIFO), then opens a short
- `grossPnl = (exitPrice - entryPrice) × qty × pointValue`
- `netPnl = grossPnl - totalCommission`
- Commission split proportionally by matched qty

### CSV Parsing (src/lib/csv-parser.ts)

TradeStation format only. Filters `status='Filled' AND filledQty > 0 AND avgFillPrice != null`. Dates normalized from `MM/DD/YYYY HH:mm:ss` to ISO 8601. Required columns: Symbol, Side, Type, Qty, Filled Qty, Avg Fill Price, Status, Open Time, Close Time, Commission Fee, Order ID.

### Stats (src/lib/utils.ts)

- `computeStats(trades: DbTrade[]): TradeStats` – full metrics
- `computeDailyPnl(trades): DailyPnl[]` – grouped by trade_date
- `computeCumulativePnl(trades): CumulativePnl[]` – running sum
- `computeWeeklyStats(trades, weeksBack=13): WeeklyStats[]` – rolling 13 weeks
- `getDateRange(preset, customStart?, customEnd?): DateRange` – resolves preset via date-fns

### Contract Specs (src/lib/contract-specs.ts)

~30 futures: ES ($50/pt), NQ ($20/pt), MES ($5/pt), MNQ ($2/pt), CL ($1000/pt), GC ($100/pt), etc. Symbol parser handles TradingView format (`CME_MINI:NQ1!`) and standard futures codes (`NQH26`). Unknown contracts fall back to `pointValue=1`.

### Goals (src/lib/goals.ts)

`computeGoalProgress(goal: DbGoal, allTrades: DbTrade[]): GoalProgress`. Filters trades to the goal's period window, computes metric by type, calculates pacing (linear), projects completion date via working-day rate.

## Account Multi-Tenancy

Every data fetch must be scoped by `activeAccount.id`:

```ts
const { activeAccount } = useAccount();
// Filter all DB queries:
.eq('account_id', activeAccount.id)
```

`AccountContext` auto-creates a default account on first login. It migrates pre-account data (`account_id = null`) to the active account via `migrateUnassignedData()` on mount. Active account ID persists in `localStorage` under key `ttt_active_account_id`.

## Supabase Client Pattern

Client is untyped (`createClient<any>`). Use `DbXxx` types explicitly:

```ts
const { data, error } = await supabase
  .from("trades")
  .select("*")
  .eq("user_id", user.id)
  .eq("account_id", activeAccount.id);
const trades = data as DbTrade[];
```

## Color System (Tailwind)

| Token                  | Hex               | Usage                  |
| ---------------------- | ----------------- | ---------------------- |
| bg-deep                | #060711           | Page background        |
| bg-base                | #0d0e1b           | Main background        |
| bg-surface             | #131425           | Cards/panels           |
| bg-hover               | #1a1c2e           | Hover states           |
| border / border-bright | #1e2138 / #2a2d4a | Borders                |
| text-primary           | #dde1f0           | Body text              |
| text-muted             | #6b7194           | Secondary text         |
| text-dim               | #3d4263           | Disabled/placeholder   |
| profit                 | #22d984           | Positive P&L           |
| loss                   | #f14b4b           | Negative P&L           |
| accent                 | #4a7cf4           | Primary actions, links |

Shadow utilities: `shadow-card`, `shadow-glow`, `shadow-glow-profit`, `shadow-glow-loss`.

## Conventions

- **No inline types** – all interfaces in `src/types/index.ts`
- **No mocked data** – all state comes from Supabase; no fixtures in components
- **Date storage** – DB dates are ISO 8601; `trade_date` is `YYYY-MM-DD` (DATE type)
- **All pages lazy-loaded** via `React.lazy()` with `<Suspense>` fallback
- **Toast notifications** via `react-hot-toast` – import `toast` directly
- **Icons** via `lucide-react` only
- **No comments unless WHY is non-obvious** – good names > comments
- **Supabase client** – import from `src/lib/supabase.ts`, never instantiate elsewhere

## Environment Variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Tax Reserve Tracker

**Route:** `/tax` — Tax Reserve Tracker page

**Services:**

- `src/lib/tax-brackets.ts` — Federal bracket tables for 2024+, LTCG rates, standard deductions, NIIT thresholds. Data-driven; add new years by extending the `FEDERAL_ORDINARY_BRACKETS` / `FEDERAL_LTCG_BRACKETS` objects.
- `src/lib/state-tax.ts` — `StateTaxProvider` covering all 50 states + DC (none/flat/progressive). Add states by appending to `STATE_TAX_TABLE`.
- `src/lib/tax-engine.ts` — `computeTaxEstimate(input)` orchestrates ordinary tax, LTCG (stacked), NIIT (3.8%), state tax, reserve mode multiplier, and reserve status. `computeAssetClassIncomeFromTrades()` auto-groups YTD trades by account product_type.

**Asset class tax treatment:**

- Futures → Section 1256: 60% LTCG / 40% ordinary income
- Stocks / Options / Crypto → short-term (ordinary income rates)
- Forex → ordinary income

**Reserve modes:** Minimum 90%, Recommended 100%, Conservative 115% of remaining liability.

**DB table:** `tax_profiles` (one row per user, not per account — tax filing is user-level).

## Badges, Streaks & Coaching

**Badges** (`src/lib/badges.ts`): 40+ `BADGE_DEFINITIONS` (milestone/performance/discipline/mastery × common/rare/epic/legendary), persisted in `earned_badges` and checked/awarded via `useBadges` from `TradesPage`/`ImportPage`. Win-streak and profitable-day-streak badges are recomputed live every render (not persisted) so they auto-revoke the instant a streak breaks — see `STREAK_BADGE_IDS` in `badges.ts`. Unlock celebration is `BadgeUnlockModal` (confetti/ray-burst, rarity-colored).

**Streaks**: `currentProfitableDayStreak()` / `bestProfitableDayStreak()` live in `src/lib/utils.ts` (shared by badges and the dashboard `StreakWidget`).

**Goal celebration**: `useGoalCelebration` (hook) watches active goals for `isAchieved` and queues a one-time `GoalAchievedModal` (same confetti/glow CSS as badges, profit-green theme). Celebrated goal ids persist in `localStorage` (`ttt_celebrated_goals`) so they never re-fire. Wired into both `GoalsPage` and the dashboard `GoalsWidget`.

**Coaching** (`src/lib/coaching.ts`): proactive, same-day risk-management nudges — large single loss, losing streak, daily loss limit — each a % of the active account's `starting_balance`. Preferences (`coaching_settings` table, one row per user) are toggle + threshold per cue type, editable via the gear icon in `CoachingBanner` → `CoachingSettingsPanel`. Per-instance dismissal is `localStorage`-only (`ttt_coaching_dismissed_<accountId>_<date>`, resets daily); disabling a cue _type_ persists to the DB. All cues return `[]` if the active account has no `starting_balance` set.

## Migrations

Run in order in Supabase SQL editor:

1. `supabase/migrations/001_initial.sql` – base schema (imports, orders, trades, goals)
2. `supabase/migrations/002_goals.sql` – goals table
3. `supabase/migrations/002_accounts.sql` – accounts table + account_id FK columns + missing UPDATE policies
4. `supabase/migrations/003_badges.sql` – earned_badges table
5. `supabase/migrations/004_tax_profiles.sql` – tax_profiles table with RLS
6. `supabase/migrations/005_tax_profile_credits.sql` – tax_profiles column additions
7. `supabase/migrations/006_coaching.sql` – coaching_settings table with RLS

When adding new migrations, prefix with the next number. Always add `IF NOT EXISTS` guards and `IF NOT EXISTS` index creation. Always add both the UPDATE policy (missing from 001) and the account_id FK when creating new tables (user-level tables like `tax_profiles`/`coaching_settings` use `UNIQUE(user_id)` instead of `account_id`).

## Adding a New Feature: Checklist

1. Add TypeScript interfaces to `src/types/index.ts`
2. Write migration SQL in `supabase/migrations/NNN_feature.sql` (with account_id FK + RLS policies for all 4 ops)
3. Add any pure computation logic to `src/lib/`
4. Add page to `src/pages/`, lazy-load it in `src/App.tsx`
5. Add nav link in `src/components/layout/Sidebar.tsx`
6. Always scope all DB queries to `activeAccount.id`

## DO THIS WITH EVERY REQUEST:

- IF any changes are made to the app/files, ensure this CLAUDE.md file is updated to reflect them if necessary to assist with token usage efficiency.

## DO NOT DO:

- Don't try to use the "RUN" skill to run the app in the browser and test things. Just tell me when your edits are done and I will test it myself in the browser. You waste way to much time and credits trying to run stuff in the browser.
