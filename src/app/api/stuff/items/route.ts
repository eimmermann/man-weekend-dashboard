import { NextRequest, NextResponse } from 'next/server';
import { listStuffCategories, listStuffItems } from '@/lib/db';

export async function GET(_req: NextRequest) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const items = await listStuffItems();
  const categories = await listStuffCategories();
  return NextResponse.json({ items, categories });
}


