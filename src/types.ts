export type Attendee = {
  id: string;
  name: string;
  startingAddress: string;
  arrivalDate?: string | null; // ISO date (YYYY-MM-DD)
  departureDate?: string | null; // ISO date (YYYY-MM-DD)
  location?: {
    lat: number;
    lng: number;
  } | null;
  createdAt: string;
};

export type Expense = {
  id: string;
  description: string;
  amount: number; // in dollars
  payerId: string;
  beneficiaryIds: string[]; // attendees who benefit
  paidByBeneficiary: Record<string, boolean>; // beneficiaryId -> has marked paid
  date?: string; // ISO date (YYYY-MM-DD)
  createdAt: string;
};

export type DatabaseSchema = {
  attendees: Attendee[];
  expenses: Expense[];
};

export type CreateAttendeePayload = {
  name: string;
  startingAddress: string;
  arrivalDate?: string | null;
  departureDate?: string | null;
};

export type UpdateAttendeePayload = Partial<CreateAttendeePayload>;

export type CreateExpensePayload = {
  description: string;
  amount: number;
  payerId: string;
  beneficiaryIds: string[];
  date?: string;
};

export type UpdateExpensePayload = Partial<CreateExpensePayload> & {
  paidToggle?: {
    expenseId: string;
    beneficiaryId: string;
  };
};

export type StuffItem = {
  id: string;
  name: string;
  category: string | null;
};

export type StuffEntry = {
  id: string;
  itemId: string;
  itemName: string;
  itemCategory: string | null;
  attendeeId: string;
  attendeeName: string;
  quantity: number;
  createdAt: string;
};
