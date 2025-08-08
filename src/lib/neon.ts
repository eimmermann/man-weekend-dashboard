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
    })();
  }
  return schemaInitialized;
}


