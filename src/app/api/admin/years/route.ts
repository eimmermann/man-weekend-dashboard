import { NextRequest, NextResponse } from 'next/server';
import { listAppYears, createAppYear, updateAppYear, getAppYear } from '@/lib/db';
import { z } from 'zod';

// GET /api/admin/years - List all years and their settings
export async function GET() {
  try {
    const years = await listAppYears();
    return NextResponse.json(years);
  } catch (error) {
    console.error('Error fetching years:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch years' },
      { status: 500 }
    );
  }
}

const CreateYearSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  copyAttendeesFrom: z.number().int().min(2000).max(2100).optional(),
  settings: z.object({
    airbnbUrl: z.string().optional(),
    imageUrl: z.string().optional(),
    address: z.string().optional(),
    tripStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
    tripEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }).optional(),
});

// POST /api/admin/years - Initialize a new year
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = CreateYearSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.issues },
        { status: 400 }
      );
    }
    
    const year = await createAppYear(parsed.data);
    return NextResponse.json(year, { status: 201 });
  } catch (error) {
    console.error('Error creating year:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create year' },
      { status: 500 }
    );
  }
}

const UpdateYearSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  settings: z.object({
    airbnbUrl: z.string().optional(),
    imageUrl: z.string().optional(),
    address: z.string().optional(),
    tripStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    tripEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});

// PATCH /api/admin/years - Update settings for a year
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateYearSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.issues },
        { status: 400 }
      );
    }
    
    // Check if year exists
    const existing = await getAppYear(parsed.data.year);
    if (!existing) {
      return NextResponse.json(
        { error: `Year ${parsed.data.year} not found` },
        { status: 404 }
      );
    }
    
    const updated = await updateAppYear(parsed.data.year, parsed.data.settings);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating year:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update year' },
      { status: 500 }
    );
  }
}

