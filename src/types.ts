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

export type PickleballGame = {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  time?: string; // HH:MM format
  location?: string;
  team1Player1Id: string;
  team1Player2Id?: string; // Optional for singles
  team2Player1Id: string;
  team2Player2Id?: string; // Optional for singles
  team1Score: number;
  team2Score: number;
  winner: 'team1' | 'team2';
  notes?: string;
  createdAt: string;
};

export type CreatePickleballGamePayload = {
  date: string;
  time?: string;
  location?: string;
  team1Player1Id: string;
  team1Player2Id?: string;
  team2Player1Id: string;
  team2Player2Id?: string;
  team1Score: number;
  team2Score: number;
  notes?: string;
};
