import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { listAttendees, listExpenses, listSettlementStatuses, toggleSettlementStatus } from '@/lib/db';
import { calculateTotals, computeSettlement } from '@/lib/budget';
import { parseYearParam } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  const yearParam = req.nextUrl.searchParams.get('year');
  const year = parseYearParam(yearParam);
  if (yearParam !== null && year === undefined) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
  }

  const [attendees, expenses, statuses] = await Promise.all([
    listAttendees(year),
    listExpenses(year),
    listSettlementStatuses(),
  ]);

  const totals = calculateTotals(attendees, expenses);
  // totals.perAttendeeNet uses convention: positive => owes (debtor), negative => is owed (creditor)
  // Settlement expects positive => creditor, negative => debtor. Flip sign.
  const balances = attendees.map(a => ({ attendeeId: a.id, net: -((totals.perAttendeeNet.get(a.id) ?? 0)) }));
  const transfers = computeSettlement(balances);

  // Merge paid statuses by from->to
  const paidMap = new Map<string, { paid: boolean; amount: number | null; updatedAt: string }>();
  for (const s of statuses) {
    paidMap.set(`${s.fromAttendeeId}->${s.toAttendeeId}`, { paid: s.paid, amount: s.amount, updatedAt: s.updatedAt });
  }

  const result = transfers.map(t => {
    const k = `${t.fromAttendeeId}->${t.toAttendeeId}`;
    const status = paidMap.get(k);
    return { ...t, paid: status?.paid ?? false, recordedAmount: status?.amount ?? null, updatedAt: status?.updatedAt ?? null };
  });

  return NextResponse.json({ transfers: result });
}

const ToggleSchema = z.object({
  fromAttendeeId: z.string().min(1),
  toAttendeeId: z.string().min(1),
  amount: z.number().positive().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ToggleSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 });
    const updated = await toggleSettlementStatus(parsed.data.fromAttendeeId, parsed.data.toAttendeeId, parsed.data.amount);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error toggling settlement status:', error);
    return NextResponse.json({ error: 'Failed to update settlement status' }, { status: 500 });
  }
}


