import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createExpense, listExpenses, toggleBeneficiaryPaid, deleteExpense, setExpenseBeneficiaries } from '@/lib/db';

const CreateSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  payerId: z.string().min(1),
  beneficiaryIds: z.array(z.string().min(1)).default([]),
  date: z.string().date().optional(),
});

const ToggleSchema = z.object({
  expenseId: z.string().min(1),
  beneficiaryId: z.string().min(1),
});

const UpdateBeneficiariesSchema = z.object({
  expenseId: z.string().min(1),
  beneficiaryIds: z.array(z.string().min(1)),
});

export async function GET() {
  const expenses = await listExpenses();
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const expense = await createExpense(parsed.data);
  return NextResponse.json(expense, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  // Toggle paid status
  const toggle = ToggleSchema.safeParse(body);
  if (toggle.success) {
    const updated = await toggleBeneficiaryPaid(toggle.data.expenseId, toggle.data.beneficiaryId);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  }
  // Replace beneficiaries list
  const update = UpdateBeneficiariesSchema.safeParse(body);
  if (update.success) {
    const updated = await setExpenseBeneficiaries(update.data.expenseId, update.data.beneficiaryIds);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  }
  return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const ok = await deleteExpense(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
