import type { Attendee, Expense } from '@/types';

export function calculateTotals(attendees: Attendee[], expenses: Expense[]) {
  // const attendeeById = new Map(attendees.map(a => [a.id, a] as const));

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

/**
 * Compute an efficient settlement plan given attendee balances.
 * Input balances use the convention: positive = creditor (is owed money), negative = debtor (owes money).
 * Returns a set of transfers (from debtor -> creditor) that settle all balances.
 */
export function computeSettlement(balances: Array<{ attendeeId: string; net: number }>): Array<{ fromAttendeeId: string; toAttendeeId: string; amount: number }> {
  const toCents = (n: number) => Math.round(n * 100);
  const toDollars = (c: number) => Number((c / 100).toFixed(2));

  const creditors = balances
    .filter(b => b.net > 0)
    .map(b => ({ id: b.attendeeId, cents: toCents(b.net) }))
    .filter(c => c.cents > 0)
    .sort((a, b) => b.cents - a.cents);

  const debtors = balances
    .filter(b => b.net < 0)
    .map(b => ({ id: b.attendeeId, cents: toCents(-b.net) }))
    .filter(d => d.cents > 0)
    .sort((a, b) => b.cents - a.cents);

  type Key = string;
  const key = (from: string, to: string): Key => `${from}->${to}`;
  const edgeAmount: Record<Key, number> = {};

  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].cents, creditors[j].cents);
    if (pay > 0) {
      const k = key(debtors[i].id, creditors[j].id);
      edgeAmount[k] = (edgeAmount[k] || 0) + pay;
      debtors[i].cents -= pay;
      creditors[j].cents -= pay;
    }
    if (debtors[i].cents === 0) i++;
    if (creditors[j].cents === 0) j++;
  }

  const rebuildIndexes = () => {
    const creditorToPayers = new Map<string, Array<{ from: string; cents: number }>>();
    const debtorToRecipients = new Map<string, Array<{ to: string; cents: number }>>();
    for (const [k, cents] of Object.entries(edgeAmount)) {
      if (cents <= 0) continue;
      const [from, to] = k.split('->');
      const a = creditorToPayers.get(to) || [];
      a.push({ from, cents });
      creditorToPayers.set(to, a);
      const b = debtorToRecipients.get(from) || [];
      b.push({ to, cents });
      debtorToRecipients.set(from, b);
    }
    return { creditorToPayers, debtorToRecipients };
  };

  let improved = true;
  while (improved) {
    improved = false;
    const { creditorToPayers, debtorToRecipients } = rebuildIndexes();
    for (const [creditor, payers] of creditorToPayers.entries()) {
      if (payers.length <= 1) continue;
      const primary = payers.slice().sort((a, b) => b.cents - a.cents)[0];
      for (const secondary of payers) {
        if (secondary.from === primary.from) continue;
        let remaining = secondary.cents;
        const primRecipients = (debtorToRecipients.get(primary.from) || []).filter(r => r.to !== creditor).sort((a, b) => b.cents - a.cents);
        for (const r of primRecipients) {
          if (remaining <= 0) break;
          const move = Math.min(remaining, r.cents);
          if (move <= 0) continue;
          const k1 = key(primary.from, r.to);
          edgeAmount[k1] -= move;
          if (edgeAmount[k1] <= 0) delete edgeAmount[k1];
          const k2 = key(secondary.from, r.to);
          edgeAmount[k2] = (edgeAmount[k2] || 0) + move;
          const k3 = key(primary.from, creditor);
          edgeAmount[k3] = (edgeAmount[k3] || 0) + move;
          const k4 = key(secondary.from, creditor);
          edgeAmount[k4] -= move;
          if (edgeAmount[k4] <= 0) delete edgeAmount[k4];
          remaining -= move;
          improved = true;
        }
        if (!improved) continue;
      }
    }
  }

  const transfers: Array<{ fromAttendeeId: string; toAttendeeId: string; amount: number }> = [];
  for (const [k, cents] of Object.entries(edgeAmount)) {
    if (cents <= 0) continue;
    const [from, to] = k.split('->');
    transfers.push({ fromAttendeeId: from, toAttendeeId: to, amount: toDollars(cents) });
  }
  return transfers;
}