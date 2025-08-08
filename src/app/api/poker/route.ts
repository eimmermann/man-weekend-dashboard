import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { listPokerGames, createPokerGame, updatePokerGameStatus, deletePokerGame, computePokerSettlement } from '@/lib/db';
import { createExpense, deleteExpensesByDescriptionAndDate } from '@/lib/db';

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  players: z.array(z.object({
    attendeeId: z.string().min(1),
    buyIn: z.number().min(0),
    cashOut: z.number().min(0),
  })).min(1),
});

export async function GET() {
  try {
    const games = await listPokerGames();
    return NextResponse.json(games);
  } catch (e) {
    console.error('List poker games error', e);
    return NextResponse.json({ error: 'Failed to list poker games' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    const created = await createPokerGame(parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('Create poker game error', e);
    return NextResponse.json({ error: 'Failed to create poker game' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    if (!id || (status !== 'active' && status !== 'finished')) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    const updated = await updatePokerGameStatus(id, status);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // When marking a game as finished, auto-create settlement expenses efficiently
    if (status === 'finished') {
      const balances = updated.players.map(p => ({ attendeeId: p.attendeeId, net: Number(p.cashOut) - Number(p.buyIn) }));
      const transfers = computePokerSettlement(balances);
      const timePart = typeof (updated as unknown as { time?: string }).time === 'string' && (updated as unknown as { time?: string }).time
        ? ` ${(updated as unknown as { time?: string }).time as string}`
        : '';
      const descBase = `Poker: ${updated.date}${timePart}`;
      // Remove previous settlement expenses for this game/date to avoid duplicates
      await deleteExpensesByDescriptionAndDate(descBase, updated.date);
      // Create new expenses with correct direction: creditor pays debtor (so the payer is the positive net person)
      for (const t of transfers) {
        await createExpense({
          description: descBase,
          amount: Number(t.amount),
          payerId: t.toAttendeeId,
          beneficiaryIds: [t.fromAttendeeId],
          date: updated.date,
        });
      }
    }
    // When reopening a game, delete prior settlement expenses for that game/date
    if (status === 'active') {
      const timePart = typeof (updated as unknown as { time?: string }).time === 'string' && (updated as unknown as { time?: string }).time
        ? ` ${(updated as unknown as { time?: string }).time as string}`
        : '';
      const descBase = `Poker: ${updated.date}${timePart}`;
      await deleteExpensesByDescriptionAndDate(descBase, updated.date);
    }
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Update poker game status error', e);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || '';
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const ok = await deletePokerGame(id);
    return NextResponse.json({ ok });
  } catch (e) {
    console.error('Delete poker game error', e);
    return NextResponse.json({ error: 'Failed to delete poker game' }, { status: 500 });
  }
}


