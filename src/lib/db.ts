import { JSONFilePreset } from 'lowdb/node';
import path from 'path';
import { nanoid } from 'nanoid';
import type { Attendee, DatabaseSchema, Expense } from '@/types';

let dbPromise: ReturnType<typeof JSONFilePreset<DatabaseSchema>> | null = null;

async function getDb() {
  if (!dbPromise) {
    const file = path.join(process.cwd(), 'data.json');
    dbPromise = JSONFilePreset<DatabaseSchema>(file, { attendees: [], expenses: [] });
  }
  return dbPromise;
}

export async function listAttendees(): Promise<Attendee[]> {
  const db = await getDb();
  return db.data.attendees;
}

export async function createAttendee(input: { name: string; startingAddress: string; arrivalDate?: string | null; departureDate?: string | null; location?: { lat: number; lng: number } | null }): Promise<Attendee> {
  const db = await getDb();
  const attendee: Attendee = {
    id: nanoid(),
    name: input.name.trim(),
    startingAddress: input.startingAddress.trim(),
    arrivalDate: input.arrivalDate ?? null,
    departureDate: input.departureDate ?? null,
    location: input.location ?? null,
    createdAt: new Date().toISOString(),
  };
  db.data.attendees.push(attendee);
  await db.write();
  return attendee;
}

export async function listExpenses(): Promise<Expense[]> {
  const db = await getDb();
  return db.data.expenses;
}

export async function createExpense(input: { description: string; amount: number; payerId: string; beneficiaryIds: string[]; date?: string }): Promise<Expense> {
  const db = await getDb();
  const expense: Expense = {
    id: nanoid(),
    description: input.description.trim(),
    amount: Math.max(0, Number(input.amount)),
    payerId: input.payerId,
    beneficiaryIds: Array.from(new Set(input.beneficiaryIds)),
    paidByBeneficiary: {},
    date: input.date || new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  };
  db.data.expenses.push(expense);
  await db.write();
  return expense;
}

export async function toggleBeneficiaryPaid(expenseId: string, beneficiaryId: string): Promise<Expense | null> {
  const db = await getDb();
  const exp = db.data.expenses.find(e => e.id === expenseId);
  if (!exp) return null;
  exp.paidByBeneficiary[beneficiaryId] = !exp.paidByBeneficiary[beneficiaryId];
  await db.write();
  return exp;
}

export async function deleteExpense(expenseId: string): Promise<boolean> {
  const db = await getDb();
  const idx = db.data.expenses.findIndex(e => e.id === expenseId);
  if (idx === -1) return false;
  db.data.expenses.splice(idx, 1);
  await db.write();
  return true;
}

export async function setExpenseBeneficiaries(expenseId: string, beneficiaryIds: string[]): Promise<Expense | null> {
  const db = await getDb();
  const exp = db.data.expenses.find(e => e.id === expenseId);
  if (!exp) return null;
  const unique = Array.from(new Set(beneficiaryIds));
  exp.beneficiaryIds = unique;
  // Drop paid flags for beneficiaries that were removed
  Object.keys(exp.paidByBeneficiary).forEach(id => {
    if (!unique.includes(id)) delete exp.paidByBeneficiary[id];
  });
  await db.write();
  return exp;
}

export async function isAttendeeReferenced(attendeeId: string): Promise<boolean> {
  const db = await getDb();
  return db.data.expenses.some(e => e.payerId === attendeeId || e.beneficiaryIds.includes(attendeeId));
}

export async function deleteAttendee(attendeeId: string): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'referenced' }> {
  const db = await getDb();
  const idx = db.data.attendees.findIndex(a => a.id === attendeeId);
  if (idx === -1) return { ok: false, reason: 'not_found' };
  const referenced = await isAttendeeReferenced(attendeeId);
  if (referenced) return { ok: false, reason: 'referenced' };
  db.data.attendees.splice(idx, 1);
  await db.write();
  return { ok: true };
}
