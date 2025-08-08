import { nanoid } from 'nanoid';
import type { Attendee, Expense, PickleballGame } from '@/types';
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
  const rows = await sql`
    select distinct category
    from stuff_items
    where category is not null and category != ''
    order by category asc
  `;
  return (rows as unknown as { category: string }[]).map(row => String(row.category));
}

// Pickleball games
type PickleballGameRow = {
  id: string;
  date: string;
  time: string | null;
  location: string | null;
  team1_player1_id: string;
  team1_player2_id: string | null;
  team2_player1_id: string;
  team2_player2_id: string | null;
  team1_score: number;
  team2_score: number;
  winner: string;
  notes: string | null;
  created_at: string;
};

function mapPickleballGameRow(row: PickleballGameRow): PickleballGame {
  return {
    id: String(row.id),
    date: new Date(String(row.date)).toISOString().split('T')[0], // Convert to YYYY-MM-DD format
    time: row.time ? String(row.time) : undefined,
    location: row.location ? String(row.location) : undefined,
    team1Player1Id: String(row.team1_player1_id),
    team1Player2Id: row.team1_player2_id ? String(row.team1_player2_id) : undefined,
    team2Player1Id: String(row.team2_player1_id),
    team2Player2Id: row.team2_player2_id ? String(row.team2_player2_id) : undefined,
    team1Score: Number(row.team1_score),
    team2Score: Number(row.team2_score),
    winner: row.winner as 'team1' | 'team2',
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function listPickleballGames(): Promise<PickleballGame[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    select id, date, time, location, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, team1_score, team2_score, winner, notes, created_at
    from pickleball_games
    order by date desc, time desc, created_at desc
  `;
  return (rows as unknown as PickleballGameRow[]).map(mapPickleballGameRow);
}

export async function createPickleballGame(input: {
  date: string;
  time?: string;
  location?: string;
  team1Player1Id: string;
  team1Player2Id?: string;
  team2Player1Id: string;
  team2Player2Id?: string;
  team1Score: number;
  team2Score: number;
  notes?: string;
}): Promise<PickleballGame> {
  await ensureSchema();
  const id = nanoid();
  const winner = input.team1Score > input.team2Score ? 'team1' : 'team2';
  const sql = getSql();
  const rows = await sql`
    insert into pickleball_games (id, date, time, location, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, team1_score, team2_score, winner, notes)
    values (${id}, ${input.date}, ${input.time || null}, ${input.location || null}, ${input.team1Player1Id}, ${input.team1Player2Id || null}, ${input.team2Player1Id}, ${input.team2Player2Id || null}, ${input.team1Score}, ${input.team2Score}, ${winner}, ${input.notes || null})
    returning id, date, time, location, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, team1_score, team2_score, winner, notes, created_at
  `;
  return mapPickleballGameRow((rows as unknown as PickleballGameRow[])[0]);
}

export async function deletePickleballGame(gameId: string): Promise<boolean> {
  await ensureSchema();
  const sql = getSql();
  const result = await sql`
    delete from pickleball_games
    where id = ${gameId}
    returning id
  `;
  return Array.isArray(result) && result.length > 0;
}

// -----------------------
// Poker tracker
// -----------------------

export type PokerGame = {
  id: string;
  date: string;
  time?: string;
  status: 'active' | 'finished';
  createdAt: string;
  players: PokerGamePlayer[];
};

export type PokerGamePlayer = {
  id: string;
  gameId: string;
  attendeeId: string;
  buyIn: number;
  cashOut: number;
  status: 'active' | 'finished';
};

type PokerGameRow = { id: string; date: string; time: string | null; status: string; created_at: string };
type PokerGamePlayerRow = { id: string; game_id: string; attendee_id: string; buy_in: string | number; cash_out: string | number; status: string };

function mapPokerGameRow(row: PokerGameRow): { id: string; date: string; time?: string; status: 'active' | 'finished'; createdAt: string } {
  return {
    id: String(row.id),
    date: new Date(String(row.date)).toISOString().split('T')[0],
    time: row.time ? String(row.time) : undefined,
    status: (String(row.status).toLowerCase() === 'finished' ? 'finished' : 'active'),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function mapPokerGamePlayerRow(row: PokerGamePlayerRow): PokerGamePlayer {
  return {
    id: String(row.id),
    gameId: String(row.game_id),
    attendeeId: String(row.attendee_id),
    buyIn: Number(row.buy_in),
    cashOut: Number(row.cash_out),
    status: (String(row.status).toLowerCase() === 'finished' ? 'finished' : 'active'),
  };
}

export async function listPokerGames(): Promise<PokerGame[]> {
  await ensureSchema();
  const sql = getSql();
  const games = (await sql`select id, date, time, status, created_at from poker_games order by date desc, time desc nulls last, created_at desc`) as unknown as PokerGameRow[];
  const gameIds = games.map(g => g.id);
  const players = gameIds.length
    ? ((await sql`select id, game_id, attendee_id, buy_in, cash_out, status from poker_game_players where game_id = any(${gameIds})`) as unknown as PokerGamePlayerRow[])
    : [];
  const grouped: Record<string, PokerGamePlayer[]> = {};
  for (const p of players) {
    const k = String((p as any).game_id);
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(mapPokerGamePlayerRow(p));
  }
  return games.map(g => ({ ...mapPokerGameRow(g), players: grouped[g.id] ?? [] }));
}

export async function createPokerGame(input: { date: string; time?: string; players: Array<{ attendeeId: string; buyIn: number; cashOut: number }> }): Promise<PokerGame> {
  await ensureSchema();
  const sql = getSql();
  const id = nanoid();
  await sql`insert into poker_games (id, date, time, status) values (${id}, ${input.date}, ${input.time || null}, 'active')`;
  for (const p of input.players) {
    const pid = nanoid();
    await sql`insert into poker_game_players (id, game_id, attendee_id, buy_in, cash_out) values (${pid}, ${id}, ${p.attendeeId}, ${p.buyIn}, ${p.cashOut})`;
  }
  const rows = (await sql`select id, date, time, status, created_at from poker_games where id = ${id} limit 1`) as unknown as PokerGameRow[];
  const players = (await sql`select id, game_id, attendee_id, buy_in, cash_out from poker_game_players where game_id = ${id}`) as unknown as PokerGamePlayerRow[];
  return { ...mapPokerGameRow(rows[0]), players: players.map(mapPokerGamePlayerRow) };
}

export async function updatePokerGameStatus(gameId: string, status: 'active' | 'finished'): Promise<PokerGame | null> {
  await ensureSchema();
  const sql = getSql();
  await sql`update poker_games set status = ${status} where id = ${gameId}`;
  const rows = (await sql`select id, date, time, status, created_at from poker_games where id = ${gameId} limit 1`) as unknown as PokerGameRow[];
  if (!rows.length) return null;
  const players = (await sql`select id, game_id, attendee_id, buy_in, cash_out from poker_game_players where game_id = ${gameId}`) as unknown as PokerGamePlayerRow[];
  return { ...mapPokerGameRow(rows[0]), players: players.map(mapPokerGamePlayerRow) };
}

export async function deletePokerGame(gameId: string): Promise<boolean> {
  await ensureSchema();
  const sql = getSql();
  const res = await sql`delete from poker_games where id = ${gameId} returning id`;
  return (res as unknown as { id: string }[]).length > 0;
}

export async function upsertPokerPlayer(gameId: string, player: { id?: string; attendeeId: string; buyIn: number; cashOut: number; status?: 'active' | 'finished' }): Promise<PokerGamePlayer> {
  await ensureSchema();
  const sql = getSql();
  if (player.id) {
    const rows = await sql`update poker_game_players set attendee_id = ${player.attendeeId}, buy_in = ${player.buyIn}, cash_out = ${player.cashOut}, status = ${player.status || 'active'} where id = ${player.id} returning id, game_id, attendee_id, buy_in, cash_out, status`;
    return mapPokerGamePlayerRow((rows as unknown as PokerGamePlayerRow[])[0]);
  }
  const id = nanoid();
  const rows = await sql`insert into poker_game_players (id, game_id, attendee_id, buy_in, cash_out, status) values (${id}, ${gameId}, ${player.attendeeId}, ${player.buyIn}, ${player.cashOut}, ${player.status || 'active'}) returning id, game_id, attendee_id, buy_in, cash_out, status`;
  return mapPokerGamePlayerRow((rows as unknown as PokerGamePlayerRow[])[0]);
}

export async function removePokerPlayer(playerId: string): Promise<boolean> {
  await ensureSchema();
  const sql = getSql();
  const res = await sql`delete from poker_game_players where id = ${playerId} returning id`;
  return (res as unknown as { id: string }[]).length > 0;
}

export async function pokerSummaryByAttendee(): Promise<Array<{ attendeeId: string; net: number }>> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    select attendee_id, sum(cash_out - buy_in)::float8 as net
    from poker_game_players
    group by attendee_id
    order by attendee_id
  `;
  return (rows as unknown as Array<{ attendee_id: string; net: number }>).map(r => ({ attendeeId: String(r.attendee_id), net: Number(r.net) }));
}

export function computePokerSettlement(balances: Array<{ attendeeId: string; net: number }>): Array<{ fromAttendeeId: string; toAttendeeId: string; amount: number }> {
  const creditors = balances.filter(b => b.net > 0).map(b => ({ id: b.attendeeId, amt: b.net })).sort((a, b) => b.amt - a.amt);
  const debtors = balances.filter(b => b.net < 0).map(b => ({ id: b.attendeeId, amt: -b.net })).sort((a, b) => b.amt - a.amt);
  const transfers: Array<{ fromAttendeeId: string; toAttendeeId: string; amount: number }> = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    transfers.push({ fromAttendeeId: debtors[i].id, toAttendeeId: creditors[j].id, amount: Number(pay.toFixed(2)) });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt <= 1e-9) i++;
    if (creditors[j].amt <= 1e-9) j++;
  }
  return transfers;
}
