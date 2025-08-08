import { NextRequest, NextResponse } from 'next/server';
import { deletePickleballGame } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const success = await deletePickleballGame(id);
    if (!success) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pickleball game:', error);
    return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 });
  }
}
