import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { listPokerGames, createPokerGame, updatePokerGameStatus, deletePokerGame } from '@/lib/db';

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


