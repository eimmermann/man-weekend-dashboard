import { neon } from '@neondatabase/serverless';

let _sql: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set. Please add it to your environment (e.g. .env.local)');
    }
    _sql = neon(url);
  }
  return _sql;
}

let schemaInitialized: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaInitialized) {
    schemaInitialized = (async () => {
      const sql = getSql();
      // Create tables if they don't exist
      // Note: using simple DDL without transactions for compatibility with serverless connections
      
      // App years table - stores per-year settings
      await sql`
        create table if not exists app_years (
          year integer primary key,
          airbnb_url text,
          image_url text,
          address text,
          trip_start_date date,
          trip_end_date date,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
      `;
      
      await sql`
        create table if not exists attendees (
          id text primary key,
          name text not null,
          starting_address text not null,
          arrival_date date,
          departure_date date,
          location_lat double precision,
          location_lng double precision,
          created_at timestamptz not null default now()
        );
      `;
      
      // Add year column to attendees if it doesn't exist
      await sql`alter table attendees add column if not exists year integer not null default 2025`;

      await sql`
        create table if not exists expenses (
          id text primary key,
          description text not null,
          amount numeric(12,2) not null check (amount >= 0),
          payer_id text not null references attendees(id) on delete restrict,
          date date,
          created_at timestamptz not null default now()
        );
      `;

      await sql`
        create table if not exists expense_beneficiaries (
          expense_id text not null references expenses(id) on delete cascade,
          beneficiary_id text not null references attendees(id) on delete restrict,
          primary key (expense_id, beneficiary_id)
        );
      `;

      await sql`
        create table if not exists expense_paid (
          expense_id text not null references expenses(id) on delete cascade,
          beneficiary_id text not null references attendees(id) on delete restrict,
          paid boolean not null default false,
          primary key (expense_id, beneficiary_id)
        );
      `;

      // Final bill settlement tracking
      await sql`
        create table if not exists settlement_paid (
          from_attendee_id text not null references attendees(id) on delete cascade,
          to_attendee_id text not null references attendees(id) on delete cascade,
          paid boolean not null default false,
          amount numeric(12,2),
          updated_at timestamptz not null default now(),
          primary key (from_attendee_id, to_attendee_id)
        );
      `;

      // Stuff tracker tables
      await sql`
        create table if not exists stuff_items (
          id text primary key,
          name text not null unique,
          category text
        );
      `;

      await sql`alter table stuff_items add column if not exists category text`;

      await sql`
        create table if not exists stuff_entries (
          id text primary key,
          item_id text not null references stuff_items(id) on delete cascade,
          attendee_id text not null references attendees(id) on delete restrict,
          quantity integer not null check (quantity >= 1),
          created_at timestamptz not null default now()
        );
      `;
      
      // Add year column to stuff_entries if it doesn't exist
      await sql`alter table stuff_entries add column if not exists year integer not null default 2025`;

      // Pickleball games table
      await sql`
        create table if not exists pickleball_games (
          id text primary key,
          date date not null,
          time text,
          location text,
          team1_player1_id text not null references attendees(id) on delete restrict,
          team1_player2_id text references attendees(id) on delete restrict,
          team2_player1_id text not null references attendees(id) on delete restrict,
          team2_player2_id text references attendees(id) on delete restrict,
          team1_score integer not null check (team1_score >= 0),
          team2_score integer not null check (team2_score >= 0),
          winner text not null check (winner in ('team1', 'team2')),
          notes text,
          created_at timestamptz not null default now()
        );
      `;

      // Poker tables
      await sql`
        create table if not exists poker_games (
          id text primary key,
          date date not null,
          time text,
          status text not null default 'active',
          created_at timestamptz not null default now()
        );
      `;

      // Ensure time column exists for poker games
      await sql`alter table poker_games add column if not exists time text`;
      // Ensure status column exists for poker games
      await sql`alter table poker_games add column if not exists status text not null default 'active'`;

      await sql`
        create table if not exists poker_game_players (
          id text primary key,
          game_id text not null references poker_games(id) on delete cascade,
          attendee_id text not null references attendees(id) on delete restrict,
          buy_in numeric(12,2) not null check (buy_in >= 0),
          cash_out numeric(12,2) not null check (cash_out >= 0),
          status text not null default 'active'
        );
      `;

      // Ensure status column exists for poker_game_players
      await sql`alter table poker_game_players add column if not exists status text not null default 'active'`;

      // Schedule activities table
      await sql`
        create table if not exists schedule_activities (
          id text primary key,
          title text not null,
          date date not null,
          start_time text not null,
          end_time text not null,
          color text,
          notes text,
          created_at timestamptz not null default now()
        );
      `;

      // Ensure notes column exists for schedule_activities
      await sql`alter table schedule_activities add column if not exists notes text`;

      // Join table for activity attendees
      await sql`
        create table if not exists schedule_activity_attendees (
          activity_id text not null references schedule_activities(id) on delete cascade,
          attendee_id text not null references attendees(id) on delete restrict,
          primary key (activity_id, attendee_id)
        );
      `;

      // Weekend events table - stores events that block weekends
      await sql`
        create table if not exists weekend_events (
          id text primary key,
          attendee_id text not null references attendees(id) on delete cascade,
          event_name text not null,
          event_date date not null,
          weekend_choice text not null check (weekend_choice in ('before', 'after', 'both')),
          is_recurring boolean not null default false,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
      `;
      
      // Blocked weekends table - derived from events, year-specific
      await sql`
        create table if not exists blocked_weekends (
          id text primary key,
          event_id text not null references weekend_events(id) on delete cascade,
          attendee_id text not null references attendees(id) on delete cascade,
          weekend_start_date date not null,
          year integer not null,
          created_at timestamptz not null default now(),
          unique(event_id, weekend_start_date)
        );
      `;
      
      // Create index for efficient year-based queries
      await sql`
        create index if not exists idx_blocked_weekends_year on blocked_weekends(year, weekend_start_date);
      `;
      
      // Migrate existing weekend_blockers to new schema if they exist
      // Check if weekend_blockers table exists first
      try {
        const tableCheck = await sql`
          select exists (
            select from information_schema.tables 
            where table_schema = 'public' 
            and table_name = 'weekend_blockers'
          ) as table_exists;
        `;
        const hasTable = (tableCheck as unknown as Array<{ table_exists: boolean }>)[0]?.table_exists;
        
        if (hasTable) {
          await sql`
            insert into weekend_events (id, attendee_id, event_name, event_date, weekend_choice, is_recurring, created_at)
            select 
              id,
              attendee_id,
              event_name,
              coalesce(event_date, weekend_start_date) as event_date,
              case 
                when weekend_start_date <= coalesce(event_date, weekend_start_date) then 'after'
                else 'before'
              end as weekend_choice,
              is_recurring,
              created_at
            from weekend_blockers
            where not exists (select 1 from weekend_events where weekend_events.id = weekend_blockers.id)
            on conflict do nothing;
          `;
          
          await sql`
            insert into blocked_weekends (id, event_id, attendee_id, weekend_start_date, year, created_at)
            select 
              (id || '-' || weekend_start_date) as id,
              id as event_id,
              attendee_id,
              weekend_start_date,
              extract(year from weekend_start_date)::integer as year,
              created_at
            from weekend_blockers
            where not exists (
              select 1 from blocked_weekends 
              where blocked_weekends.event_id = weekend_blockers.id 
              and blocked_weekends.weekend_start_date = weekend_blockers.weekend_start_date
            )
            on conflict do nothing;
          `;
        }
      } catch (migrationError) {
        // Migration failed, but continue - tables will be created on first use
        console.warn('Migration from weekend_blockers failed:', migrationError);
      }
      
      // Seed app_years with 2025 data from constants if not already present
      try {
        await sql`
          insert into app_years (year, airbnb_url, image_url, address, trip_start_date, trip_end_date)
          values (
            2025,
            'https://www.airbnb.com/rooms/880325538027550159?viralityEntryPoint=1&s=76',
            'https://a0.muscache.com/im/pictures/72066d46-fa14-4982-9fb9-f75ad96ac6e2.jpg?im_w=1200',
            '15 Goldring Drive, Highland Lake, NY 12743',
            '2025-09-10',
            '2025-09-14'
          )
          on conflict (year) do nothing;
        `;
      } catch (seedError) {
        console.warn('Failed to seed app_years for 2025:', seedError);
      }
    })();
  }
  return schemaInitialized;
}


