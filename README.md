# Man Weekend Dashboard

A Next.js application for managing group weekend trips. Track attendees, expenses, schedules, games (pickleball and poker), weekend availability, and trip logistics across multiple years.

## Features

### Multi-Year Support
- **Year-Based Data Model**: All data (attendees, expenses, games, etc.) is scoped by year
- **Year Selector**: Switch between different trip years via URL params (`?year=2026`) or localStorage
- **Admin Panel**: Press `Ctrl+Alt+S` to open year management and create new years

### Core Functionality
- **Attendees**: Track participants with starting addresses, arrival/departure dates, and geocoded map locations
- **Expenses**: Shared expense tracking with fine-grained split management and automated settlement calculation
- **Weekend Availability**: Calendar-based blocker system with support for recurring events (birthdays, anniversaries)
- **Schedule**: Daily activity planning with time slots and participant tracking
- **Games**:
  - **Pickleball**: Team game tracking with scores, win/loss stats, and best teammate analysis
  - **Poker**: Buy-in/cash-out tracking with automated settlement calculation
- **Stuff Tracker**: Who's bringing what items, with categories and quantities

### Settlement Algorithm
The app uses a greedy consolidation algorithm to minimize the number of transfers when settling shared expenses and poker games.

## Database Setup (Neon Postgres)

This app persists data in Postgres using the `@neondatabase/serverless` driver. Tables are **automatically created** on first run.

1. Create a [Neon](https://neon.tech) project and database
2. Copy your connection string
3. Create a `.env.local` file in the project root:

```bash
DATABASE_URL="postgres://user:password@host:port/db?sslmode=require"
```

No manual migrations required! The schema auto-initializes via `ensureSchema()` in `src/lib/neon.ts`.

## Getting Started

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Available Scripts

- `npm run dev` - Start dev server with Turbopack (fast refresh)
- `npm run build` - Production build (outputs to `.next-prod`)
- `npm run build:check` - Type-check build (outputs to `.next-check`)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Build System Notes

- Development uses **Turbopack** for faster builds
- Production builds use `NEXT_DIST_DIR=.next-prod` to avoid clobbering dev artifacts
- On Vercel, automatically uses default `.next` directory

## Configuration

### Year Management

The application syncs the selected year across:
- URL query parameters (`?year=2026`)
- Browser localStorage
- Global YearContext (`useYear()` hook)

Each year has its own settings stored in the `app_years` table:
- Trip dates (start/end)
- Airbnb URL
- Hero image URL
- Trip address

### Hero Image

Place an image at `public/house-hero.jpg` for the Airbnb listing banner.

**Recommended size:** 1600×900 or larger

To use a remote URL, configure allowed domains in `next.config.ts`:

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'your-image-host.com',
    },
  ],
}
```

### Admin Features

- Press **`Ctrl+Alt+S`** to open the year management modal
- Create new years with optional attendee copying from previous years
- Recurring weekend events automatically generate blocks for new years

## Technology Stack

- **Framework**: Next.js 15.4 (App Router)
- **Database**: Neon Postgres (serverless)
- **Styling**: Tailwind CSS with dark gradient theme
- **Data Fetching**: SWR for client-side caching
- **Validation**: Zod schemas for API input validation
- **Type Safety**: TypeScript with strict mode
- **Geocoding**: Address → lat/lng conversion for map markers
- **ID Generation**: nanoid for unique identifiers

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes (REST endpoints)
│   │   ├── attendees/
│   │   ├── expenses/
│   │   ├── pickleball/
│   │   ├── poker/
│   │   ├── schedule/
│   │   ├── stuff/
│   │   └── weekend-blockers/
│   └── page.tsx          # Main application page
├── components/           # React components
│   ├── HomeTabs.tsx      # Tab-based UI navigation
│   ├── Attendees.tsx
│   ├── Expenses.tsx
│   ├── PickleballTracker.tsx
│   └── PokerTracker.tsx
├── lib/
│   ├── db.ts            # Database functions
│   ├── neon.ts          # Database connection & schema
│   ├── budget.ts        # Settlement calculation algorithm
│   ├── weekend-utils.ts # Weekend calculation logic
│   ├── geocode.ts       # Address geocoding
│   ├── api-utils.ts     # API helper functions
│   └── pokemon.ts       # Daily Pokemon selection
├── context/
│   └── YearContext.tsx  # Global year state management
└── types.ts             # TypeScript type definitions
```

## Key Patterns

### Year-Based Filtering
API routes accept an optional `year` query parameter:
```typescript
GET /api/expenses?year=2026
```

### Settlement Calculation
Both poker and expense settlements use the same optimized algorithm from `src/lib/budget.ts`:
- Converts to integer cents to avoid floating point errors
- Greedy initial settlement
- Consolidation pass to minimize number of transfers

### Weekend Blockers
Two-table system for tracking unavailability:
- `weekend_events`: Event definitions (birthdays, weddings, etc.)
- `blocked_weekends`: Derived year-specific weekend blocks (Thursday-Sunday)

Supports recurring events that auto-generate blocks for future years.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
