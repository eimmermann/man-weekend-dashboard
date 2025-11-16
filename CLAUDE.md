# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Man Weekend Dashboard is a Next.js application for managing group weekend trips. It tracks attendees, expenses, schedules, games (pickleball and poker), weekend availability, and trip logistics across multiple years.

## Essential Commands

### Development
```bash
npm run dev              # Start dev server with Turbopack
npm run build            # Production build (outputs to .next-prod)
npm run build:check      # Type-check build (outputs to .next-check)
npm run start            # Start production server
npm run lint             # Run ESLint
```

### Build System Notes
- Development uses Turbopack for faster builds
- Production builds use `NEXT_DIST_DIR=.next-prod` to avoid clobbering dev artifacts
- On Vercel, always uses default `.next` directory (handled automatically)

## Database Setup

This app uses **Neon Postgres** (serverless) via `@neondatabase/serverless`.

**Required environment variable:**
```
DATABASE_URL="postgres://user:password@host:port/db?sslmode=require"
```

Add this to `.env.local` in the project root.

**Schema auto-initialization:**
- Tables are created automatically on first run via `ensureSchema()` in `src/lib/neon.ts`
- No manual migrations needed
- Database functions are in `src/lib/db.ts`

## Architecture

### Year-Based Data Model

The application is multi-year aware. Almost all data is scoped by year:
- Each year has its own settings (trip dates, Airbnb URL, hero image, address) stored in `app_years` table
- Attendees, expenses, stuff entries, and other data are year-specific
- **YearContext** (`src/context/YearContext.tsx`) provides global year state:
  - Year selection syncs with URL params (`?year=2026`) and localStorage
  - Components use `useYear()` hook to access current year
  - API routes accept optional `year` query parameter

### Core Data Entities

1. **Attendees** - Trip participants (year-scoped)
   - Name, starting address, arrival/departure dates
   - Geocoded location (lat/lng) for map display

2. **Expenses** - Shared expenses with split tracking
   - Payer, beneficiaries, amount, description
   - Fine-grained tracking: which beneficiaries have marked as paid
   - Settlement calculation algorithm in `computePokerSettlement()` minimizes transactions

3. **Weekend Events & Blockers** - Two-table system for tracking unavailability
   - `weekend_events`: The event definition (birthday, wedding, etc.)
   - `blocked_weekends`: Derived year-specific weekend blocks (Thursday-Sunday)
   - Supports recurring events (generates blocks for 10 years)
   - Weekend choice: 'before', 'after', or 'both' weekends around event date
   - Functions: `calculateWeekendBlocks()` and `calculateRecurringWeekendBlocks()` in `src/lib/weekend-utils.ts`

4. **Schedule Activities** - Daily activities with time slots
   - Attendee participation tracking
   - Color coding, notes support

5. **Games Tracking**
   - **Pickleball**: Team games with scores, winners
   - **Poker**: Buy-in/cash-out tracking with settlement calculation

6. **Stuff Tracker** - Who's bringing what items (year-scoped)
   - Auto-creates items, supports categories
   - Quantity tracking per attendee

### Data Access Pattern

**Server-side:** Direct database calls via `src/lib/db.ts` functions (called from API routes)

**Client-side:** SWR for data fetching with year-aware keys
```typescript
const { data: attendees } = useSWR(`/api/attendees?year=${year}`, fetcher);
```

### API Routes Structure

All routes in `src/app/api/`:
- Most support year filtering via query param: `?year=2026`
- RESTful patterns: GET (list), POST (create), PUT/PATCH (update), DELETE
- Validation using Zod schemas
- Example: `/api/attendees?year=2026` returns only attendees for that year

### Component Architecture

**Tab-based UI** (`src/components/HomeTabs.tsx`):
- Overview: Countdown, Pokemon, Map, Attendees
- Planning: Weekend Selector (availability calendar)
- Schedule: Daily activities timeline
- Games: Pickleball and Poker trackers
- Bill: Expenses, Total Spend, Settlement ("Final Bill")

**Tab state synced to URL:** `?tab=overview&year=2026`

### Key Utilities

- **`src/lib/weekend-utils.ts`**: Weekend calculation logic
  - `getAllWeekendsInYear(year)`: Generates all Thursday-Sunday weekends
  - `calculateWeekendBlocks()`: Determines blocked weekends from event
  - Used for availability calendar

- **`src/lib/geocode.ts`**: Address → lat/lng conversion (for map markers)

- **`src/lib/pokemon.ts`**: Daily Pokemon selection (fun feature)

- **`src/lib/budget.ts`**: Expense settlement algorithm minimization

### Weekend Blocker System Details

**Legacy vs New Schema:**
- Old: `weekend_blockers` table (single table, now deprecated)
- New: `weekend_events` + `blocked_weekends` (two-table system)
- Migration handled automatically in `ensureSchema()`
- Both APIs exist for backwards compatibility

**Weekend Calculation:**
- Weekends are Thursday-Sunday (4-day trips)
- Event date + weekend choice determines which weekend(s) are blocked
- Recurring events: Same calendar date each year, generates blocks across years

## Important Patterns

### Year Management
Always pass `year` to API calls and ensure components use `useYear()` hook:
```typescript
const { year } = useYear();
const { data } = useSWR(`/api/expenses?year=${year}`, fetcher);
```

### Settlement Calculation
`computePokerSettlement()` in `src/lib/db.ts` implements a greedy consolidation algorithm to minimize number of transfers when settling debts.

### Admin Features
- Admin modal: Press `Ctrl+Alt+S` to open year management
- Create new years, optionally copy attendees from previous year
- Recurring events auto-generate blocks for new years

### Hero Image
Place image at `public/house-hero.jpg` for Airbnb listing display. Recommended size: 1600×900+. Configure remote image domains in `next.config.ts` if using external URLs.

## TypeScript Paths

Uses `@/*` alias for `./src/*` imports.

## Styling

Tailwind CSS with dark gradient theme:
- Primary: slate-900/800 gradient backgrounds
- Cards: slate-800 with slate-700 borders
- Accent colors for different features (emerald for available weekends, etc.)
