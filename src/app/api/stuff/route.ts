import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createStuffEntry, deleteStuffEntry, listStuffEntries } from '@/lib/db';

export async function GET() {
  const entries = await listStuffEntries();
  return NextResponse.json(entries);
}

const CreateSchema = z.object({
  thingName: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(999),
  attendeeId: z.string().min(1),
  category: z.string().max(80).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  const created = await createStuffEntry(parsed.data);
  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const ok = await deleteStuffEntry(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}


