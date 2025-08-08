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
    })();
  }
  return schemaInitialized;
}


