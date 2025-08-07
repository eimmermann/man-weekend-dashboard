import { NextRequest, NextResponse } from 'next/server';
import { deleteAttendee } from '@/lib/db';

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const result = await deleteAttendee(id);
  if (!result.ok) {
    if (result.reason === 'not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (result.reason === 'referenced') return NextResponse.json({ error: 'Attendee is referenced by expenses' }, { status: 409 });
  }
  return new NextResponse(null, { status: 204 });
}
