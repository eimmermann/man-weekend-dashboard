import { nanoid } from 'nanoid';
import type { Attendee, Expense } from '@/types';
import { ensureSchema, getSql } from '@/lib/neon';

type AttendeeRow = {
  id: string;
  name: string;
  starting_address: string;
  arrival_date: string | null;
  departure_date: string | null;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
};

function mapAttendeeRow(row: AttendeeRow): Attendee {
  return {
    id: String(row.id),
    name: String(row.name),
    startingAddress: String(row.starting_address),
    arrivalDate: row.arrival_date ? String(row.arrival_date) : null,
    departureDate: row.departure_date ? String(row.departure_date) : null,
    location: row.location_lat != null && row.location_lng != null ? { lat: Number(row.location_lat), lng: Number(row.location_lng) } : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

type ExpenseRow = {
  id: string;
  description: string;
  amount: number;
  payer_id: string;
  date: string | null;
  created_at: string;
  beneficiary_ids: unknown[]; // aggregated array
  paid_by: Record<string, boolean> | null; // aggregated jsonb
};

function mapExpenseRow(row: ExpenseRow): Expense {
  const beneficiaryIds: string[] = Array.isArray(row.beneficiary_ids)
    ? row.beneficiary_ids.map((v: unknown) => String(v))
    : [];
  const paidBy = (row.paid_by ?? {}) as Record<string, boolean>;
  // Ensure boolean values
  const paidByBeneficiary: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(paidBy)) {
    paidByBeneficiary[String(k)] = Boolean(v);
  }
  return {
    id: String(row.id),
    description: String(row.description),
    amount: Number(row.amount),
    payerId: String(row.payer_id),
    beneficiaryIds,
    paidByBeneficiary,
    date: row.date ? String(row.date) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function listAttendees(): Promise<Attendee[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    select id, name, starting_address, arrival_date, departure_date, location_lat, location_lng, created_at
    from attendees
    order by created_at asc
  `;
  return (rows as unknown as AttendeeRow[]).map(mapAttendeeRow);
}

export async function createAttendee(input: { name: string; startingAddress: string; arrivalDate?: string | null; departureDate?: string | null; location?: { lat: number; lng: number } | null }): Promise<Attendee> {
  await ensureSchema();
  const id = nanoid();
  const name = input.name.trim();
  const startingAddress = input.startingAddress.trim();
  const arrivalDate = input.arrivalDate ?? null;
  const departureDate = input.departureDate ?? null;
  const lat = input.location?.lat ?? null;
  const lng = input.location?.lng ?? null;
  const sql = getSql();
  const rows = await sql`
    insert into attendees (id, name, starting_address, arrival_date, departure_date, location_lat, location_lng)
    values (${id}, ${name}, ${startingAddress}, ${arrivalDate}, ${departureDate}, ${lat}, ${lng})
    returning id, name, starting_address, arrival_date, departure_date, location_lat, location_lng, created_at
  `;
  return mapAttendeeRow((rows as unknown as AttendeeRow[])[0]);
}

async function getExpenseById(expenseId: string): Promise<Expense | null> {
  const sql = getSql();
  const rows = await sql`
    select
      e.id,
      e.description,
      (e.amount)::float8 as amount,
      e.payer_id,
      e.date,
      e.created_at,
      coalesce(array_agg(distinct eb.beneficiary_id) filter (where eb.beneficiary_id is not null), '{}'::text[]) as beneficiary_ids,
      coalesce(jsonb_object_agg(ep.beneficiary_id, ep.paid) filter (where ep.beneficiary_id is not null), '{}'::jsonb) as paid_by
    from expenses e
    left join expense_beneficiaries eb on eb.expense_id = e.id
    left join expense_paid ep on ep.expense_id = e.id
    where e.id = ${expenseId}
    group by e.id
  `;
  const typed = rows as unknown as ExpenseRow[];
  if (typed.length === 0) return null;
  return mapExpenseRow(typed[0]);
}

export async function listExpenses(): Promise<Expense[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    select
      e.id,
      e.description,
      (e.amount)::float8 as amount,
      e.payer_id,
      e.date,
      e.created_at,
      coalesce(array_agg(distinct eb.beneficiary_id) filter (where eb.beneficiary_id is not null), '{}'::text[]) as beneficiary_ids,
      coalesce(jsonb_object_agg(ep.beneficiary_id, ep.paid) filter (where ep.beneficiary_id is not null), '{}'::jsonb) as paid_by
    from expenses e
    left join expense_beneficiaries eb on eb.expense_id = e.id
    left join expense_paid ep on ep.expense_id = e.id
    group by e.id
    order by e.created_at asc
  `;
  return (rows as unknown as ExpenseRow[]).map(mapExpenseRow);
}

export async function createExpense(input: { description: string; amount: number; payerId: string; beneficiaryIds: string[]; date?: string }): Promise<Expense> {
  await ensureSchema();
  const id = nanoid();
  const description = input.description.trim();
  const amount = Math.max(0, Number(input.amount));
  const payerId = input.payerId;
  const date = input.date || null;
  const uniqueBeneficiaries = Array.from(new Set(input.beneficiaryIds));

  const sql = getSql();
  await sql`
    insert into expenses (id, description, amount, payer_id, date)
    values (${id}, ${description}, ${amount}, ${payerId}, ${date})
  `;

  // Insert beneficiaries (if any)
  for (const b of uniqueBeneficiaries) {
    await sql`insert into expense_beneficiaries (expense_id, beneficiary_id) values (${id}, ${b}) on conflict do nothing`;
  }

  const exp = await getExpenseById(id);
  // getExpenseById should always return here
  if (!exp) throw new Error('Failed to create expense');
  return exp;
}

export async function toggleBeneficiaryPaid(expenseId: string, beneficiaryId: string): Promise<Expense | null> {
  await ensureSchema();
  const sql = getSql();
  await sql`
    insert into expense_paid (expense_id, beneficiary_id, paid)
    values (${expenseId}, ${beneficiaryId}, true)
    on conflict (expense_id, beneficiary_id) do update set paid = not expense_paid.paid
  `;
  return getExpenseById(expenseId);
}

export async function deleteExpense(expenseId: string): Promise<boolean> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`delete from expenses where id = ${expenseId} returning id`;
  return (rows as unknown as { id: string }[]).length > 0;
}

export async function setExpenseBeneficiaries(expenseId: string, beneficiaryIds: string[]): Promise<Expense | null> {
  await ensureSchema();
  // Replace beneficiaries with provided unique set
  const unique = Array.from(new Set(beneficiaryIds));
  // Clear existing
  const sql = getSql();
  await sql`delete from expense_beneficiaries where expense_id = ${expenseId}`;
  // Re-insert
  for (const b of unique) {
    await sql`insert into expense_beneficiaries (expense_id, beneficiary_id) values (${expenseId}, ${b}) on conflict do nothing`;
  }
  // Drop paid flags for removed beneficiaries
  await sql`
    delete from expense_paid
    where expense_id = ${expenseId}
      and beneficiary_id not in (select beneficiary_id from expense_beneficiaries where expense_id = ${expenseId})
  `;

  return getExpenseById(expenseId);
}

export async function isAttendeeReferenced(attendeeId: string): Promise<boolean> {
  await ensureSchema();
  const sql = getSql();
  const res = await sql`
    select
      exists(select 1 from expenses where payer_id = ${attendeeId}) as is_payer,
      exists(select 1 from expense_beneficiaries where beneficiary_id = ${attendeeId}) as is_beneficiary
  `;
  const row = (res as unknown as { is_payer: boolean; is_beneficiary: boolean }[])[0];
  return Boolean(row?.is_payer) || Boolean(row?.is_beneficiary);
}

export async function deleteAttendee(attendeeId: string): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'referenced' }> {
  await ensureSchema();
  // Ensure not referenced by expenses
  const referenced = await isAttendeeReferenced(attendeeId);
  if (referenced) return { ok: false, reason: 'referenced' };

  const sql = getSql();
  const res = await sql`delete from attendees where id = ${attendeeId} returning id`;
  if ((res as unknown as { id: string }[]).length === 0) return { ok: false, reason: 'not_found' };
  return { ok: true };
}

async function getAttendeeById(attendeeId: string): Promise<Attendee | null> {
  const sql = getSql();
  const rows = await sql`
    select id, name, starting_address, arrival_date, departure_date, location_lat, location_lng, created_at
    from attendees where id = ${attendeeId} limit 1
  `;
  const row = (rows as unknown as AttendeeRow[])[0];
  return row ? mapAttendeeRow(row) : null;
}

export async function updateAttendee(attendeeId: string, input: { name?: string; startingAddress?: string | null; arrivalDate?: string | null; departureDate?: string | null; location?: { lat: number; lng: number } | null }): Promise<Attendee | null> {
  await ensureSchema();
  const sql = getSql();
  // Read existing; if not found, return null
  const existing = await getAttendeeById(attendeeId);
  if (!existing) return null;
  const next = {
    name: input.name != null ? input.name.trim() : existing.name,
    startingAddress: input.startingAddress != null ? input.startingAddress.trim() : existing.startingAddress,
    arrivalDate: input.arrivalDate !== undefined ? input.arrivalDate : existing.arrivalDate,
    departureDate: input.departureDate !== undefined ? input.departureDate : existing.departureDate,
    lat: input.location ? input.location.lat : existing.location?.lat ?? null,
    lng: input.location ? input.location.lng : existing.location?.lng ?? null,
  };
  await sql`
    update attendees
    set name = ${next.name},
        starting_address = ${next.startingAddress},
        arrival_date = ${next.arrivalDate},
        departure_date = ${next.departureDate},
        location_lat = ${next.lat},
        location_lng = ${next.lng}
    where id = ${attendeeId}
  `;
  return getAttendeeById(attendeeId);
}

// -----------------------
// Stuff tracker
// -----------------------

export type StuffItem = { id: string; name: string; category: string | null };
export type StuffEntry = { id: string; itemId: string; itemName: string; itemCategory: string | null; attendeeId: string; attendeeName: string; quantity: number; createdAt: string };

export async function listStuffItems(): Promise<StuffItem[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`select id, name, category from stuff_items order by name asc`;
  return (rows as unknown as { id: string; name: string; category: string | null }[]).map(r => ({ id: String(r.id), name: String(r.name), category: r.category ?? null }));
}

export async function listStuffEntries(): Promise<StuffEntry[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    select se.id,
           se.quantity,
           se.created_at,
           si.id as item_id,
           si.name as item_name,
           si.category as item_category,
           a.id as attendee_id,
           a.name as attendee_name
    from stuff_entries se
    join stuff_items si on si.id = se.item_id
    join attendees a on a.id = se.attendee_id
    order by se.created_at desc
  `;
  return (rows as unknown as Array<{ id: string; quantity: number; created_at: string; item_id: string; item_name: string; item_category: string | null; attendee_id: string; attendee_name: string }>).map(r => ({
    id: String(r.id),
    itemId: String(r.item_id),
    itemName: String(r.item_name),
    itemCategory: r.item_category ?? null,
    attendeeId: String(r.attendee_id),
    attendeeName: String(r.attendee_name),
    quantity: Number(r.quantity),
    createdAt: new Date(String(r.created_at)).toISOString(),
  }));
}

async function getOrCreateStuffItemByName(nameRaw: string, categoryRaw?: string | null): Promise<StuffItem> {
  const sql = getSql();
  const name = nameRaw.trim().toLowerCase();
  const category = (categoryRaw || '').trim().toLowerCase() || null;
  // try get existing
  const existing = await sql`select id, name, category from stuff_items where name = ${name} limit 1`;
  const ex = (existing as unknown as { id: string; name: string; category: string | null }[])[0];
  if (ex) {
    // If a category is provided and differs from stored value, update it
    if (category && (ex.category ?? null) !== category) {
      const updated = await sql`update stuff_items set category = ${category} where id = ${ex.id} returning id, name, category`;
      const row = (updated as unknown as { id: string; name: string; category: string | null }[])[0];
      return { id: String(row.id), name: String(row.name), category: row.category ?? null };
    }
    return { id: String(ex.id), name: String(ex.name), category: ex.category ?? null };
  }
  // create
  const id = nanoid();
  const rows = await sql`insert into stuff_items (id, name, category) values (${id}, ${name}, ${category}) returning id, name, category`;
  const row = (rows as unknown as { id: string; name: string; category: string | null }[])[0];
  return { id: String(row.id), name: String(row.name), category: row.category ?? null };
}

export async function createStuffEntry(input: { thingName: string; quantity: number; attendeeId: string; category?: string | null }): Promise<StuffEntry> {
  await ensureSchema();
  const sql = getSql();
  const item = await getOrCreateStuffItemByName(input.thingName, input.category ?? null);
  const id = nanoid();
  const qty = Math.max(1, Math.floor(Number(input.quantity)) || 1);
  const rows = await sql`
    insert into stuff_entries (id, item_id, attendee_id, quantity)
    values (${id}, ${item.id}, ${input.attendeeId}, ${qty})
    returning id, quantity, created_at
  `;
  const row = (rows as unknown as { id: string; quantity: number; created_at: string }[])[0];
  // Fetch attendee name
  const a = await sql`select name from attendees where id = ${input.attendeeId} limit 1`;
  const attendeeName = String((a as unknown as { name: string }[])[0]?.name || '');
  return {
    id: String(row.id),
    itemId: item.id,
    itemName: item.name,
    itemCategory: item.category ?? null,
    attendeeId: input.attendeeId,
    attendeeName,
    quantity: Number(row.quantity),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function deleteStuffEntry(entryId: string): Promise<boolean> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`delete from stuff_entries where id = ${entryId} returning id`;
  return (rows as unknown as { id: string }[]).length > 0;
}

export async function listStuffCategories(): Promise<string[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`select distinct category from stuff_items where category is not null order by category asc`;
  return (rows as unknown as { category: string }[]).map(r => String(r.category));
}
