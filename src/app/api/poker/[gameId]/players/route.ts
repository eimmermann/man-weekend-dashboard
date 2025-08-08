import { NextResponse } from 'next/server';
import { z } from 'zod';
import { upsertPokerPlayer, removePokerPlayer } from '@/lib/db';

const upsertSchema = z.object({
  id: z.string().optional(),
  attendeeId: z.string().min(1),
  buyIn: z.number().min(0),
  cashOut: z.number().min(0),
  status: z.enum(['active', 'finished']).optional(),
});

export async function POST(req: Request, context: { params: any }) {
  try {
    const { gameId } = await context.params;
    const body = await req.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    const saved = await upsertPokerPlayer(gameId, parsed.data);
    return NextResponse.json(saved);
  } catch (e) {
    console.error('Upsert poker player error', e);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || '';
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const ok = await removePokerPlayer(id);
    return NextResponse.json({ ok });
  } catch (e) {
    console.error('Delete poker player error', e);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}


