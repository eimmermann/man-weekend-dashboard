import { NextResponse } from 'next/server';
import { updateActivity, deleteActivity } from '@/lib/db';

export async function PATCH(_req: Request, context: any) {
  const id = String(context?.params?.id || '');
  const body = await _req.json().catch(() => ({}));
  const updated = await updateActivity(id, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, context: any) {
  const id = String(context?.params?.id || '');
  const ok = await deleteActivity(id);
  return NextResponse.json({ ok });
}


