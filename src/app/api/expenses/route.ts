import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createExpense, listExpenses, toggleBeneficiaryPaid, deleteExpense, setExpenseBeneficiaries, updateExpense } from '@/lib/db';
import { parseYearParam } from '@/lib/api-utils';

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

const UpdateFieldsSchema = z.object({
  expenseId: z.string().min(1),
  description: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  payerId: z.string().min(1).optional(),
  date: z.string().date().optional(),
});

export async function GET(req: NextRequest) {
  const yearParam = req.nextUrl.searchParams.get('year');
  const year = parseYearParam(yearParam);
  if (yearParam !== null && year === undefined) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
  }

  const expenses = await listExpenses(year);
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 });
    }
    const expense = await createExpense(parsed.data);
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
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
    // Update expense fields
    const updateFields = UpdateFieldsSchema.safeParse(body);
    if (updateFields.success) {
      const { expenseId, ...fields } = updateFields.data;
      const updated = await updateExpense(expenseId, fields);
      if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(updated);
    }
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const ok = await deleteExpense(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
