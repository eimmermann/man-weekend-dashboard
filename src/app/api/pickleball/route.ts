import { NextRequest, NextResponse } from 'next/server';
import { listPickleballGames, createPickleballGame } from '@/lib/db';
import { z } from 'zod';

const createGameSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().optional(),
  location: z.string().optional(),
  team1Player1Id: z.string().min(1),
  team1Player2Id: z.string().optional(),
  team2Player1Id: z.string().min(1),
  team2Player2Id: z.string().optional(),
  team1Score: z.number().int().min(0),
  team2Score: z.number().int().min(0),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const games = await listPickleballGames();
    return NextResponse.json(games);
  } catch (error) {
    console.error('Error listing pickleball games:', error);
    return NextResponse.json({ error: 'Failed to list games' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createGameSchema.parse(body);
    
    const game = await createPickleballGame(validatedData);
    return NextResponse.json(game);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error creating pickleball game:', error);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
