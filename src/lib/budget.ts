import type { Attendee, Expense } from '@/types';

export function calculateTotals(attendees: Attendee[], expenses: Expense[]) {
  const attendeeById = new Map(attendees.map(a => [a.id, a] as const));

  const totals = {
    totalSpend: 0,
    perAttendeeOwes: new Map<string, number>(),
    perAttendeePaid: new Map<string, number>(),
  };

  for (const a of attendees) {
    totals.perAttendeeOwes.set(a.id, 0);
    totals.perAttendeePaid.set(a.id, 0);
  }

  for (const e of expenses) {
    totals.totalSpend += e.amount;
    const beneficiaries = e.beneficiaryIds.length > 0 ? e.beneficiaryIds : attendees.map(a => a.id);
    const share = beneficiaries.length > 0 ? e.amount / beneficiaries.length : 0;

    // Track who paid the expense
    totals.perAttendeePaid.set(e.payerId, (totals.perAttendeePaid.get(e.payerId) ?? 0) + e.amount);

    // Each beneficiary owes their share
    for (const b of beneficiaries) {
      totals.perAttendeeOwes.set(b, (totals.perAttendeeOwes.get(b) ?? 0) + share);
    }
  }

  // Net owed = owes - paid
  const perAttendeeNet = new Map<string, number>();
  for (const a of attendees) {
    const owes = totals.perAttendeeOwes.get(a.id) ?? 0;
    const paid = totals.perAttendeePaid.get(a.id) ?? 0;
    perAttendeeNet.set(a.id, +(owes - paid).toFixed(2));
  }

  return { ...totals, perAttendeeNet };
}
