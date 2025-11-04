// Year-specific app settings
export type AppYear = {
  year: number;
  airbnbUrl?: string | null;
  imageUrl?: string | null;
  address?: string | null;
  tripStartDate?: string | null; // ISO date (YYYY-MM-DD)
  tripEndDate?: string | null; // ISO date (YYYY-MM-DD)
  createdAt: string;
  updatedAt: string;
};

export type CreateAppYearPayload = {
  year: number;
  copyAttendeesFrom?: number;
  settings?: {
    airbnbUrl?: string;
    imageUrl?: string;
    address?: string;
    tripStartDate?: string;
    tripEndDate?: string;
  };
};

export type UpdateAppYearPayload = {
  airbnbUrl?: string;
  imageUrl?: string;
  address?: string;
  tripStartDate?: string;
  tripEndDate?: string;
};

export type Attendee = {
  id: string;
  name: string;
  startingAddress: string;
  year: number;
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

export type ScheduleActivity = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  end: string;   // HH:mm
  color?: string;
  notes?: string;
  attendeeIds: string[];
  createdAt: string;
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
  year: number;
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

// Poker
export type PokerGame = {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  createdAt: string;
  players: PokerGamePlayer[];
};

export type PokerGamePlayer = {
  id: string; // row id
  gameId: string;
  attendeeId: string;
  buyIn: number; // dollars
  cashOut: number; // dollars won at end (can be 0)
};

export type CreatePokerGamePayload = {
  date: string; // YYYY-MM-DD
  players: Array<{ attendeeId: string; buyIn: number; cashOut: number }>;
};

export type PokerPayment = {
  fromAttendeeId: string;
  toAttendeeId: string;
  paid: boolean;
};

// Weekend events and blockers
export type WeekendEvent = {
  id: string;
  attendeeId: string;
  eventName: string;
  eventDate: string; // YYYY-MM-DD (actual date of the event, can be any year)
  weekendChoice: 'before' | 'after' | 'both';
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BlockedWeekend = {
  id: string;
  eventId: string;
  attendeeId: string;
  weekendStartDate: string; // YYYY-MM-DD (Thursday of the weekend)
  year: number;
  createdAt: string;
  // Joined data from event
  eventName?: string;
  eventDate?: string;
};

export type CreateWeekendEventPayload = {
  attendeeId: string;
  eventName: string;
  eventDate: string; // YYYY-MM-DD (actual date of the event)
  weekendChoice: 'before' | 'after' | 'both';
  isRecurring: boolean;
};

export type UpdateWeekendEventPayload = Partial<Omit<CreateWeekendEventPayload, 'attendeeId'>>;

// Legacy type for backwards compatibility in UI
export type WeekendBlocker = {
  id: string;
  attendeeId: string;
  eventName: string;
  eventDate: string;
  weekendStartDate: string;
  isRecurring: boolean;
  createdAt: string;
};

export type WeekendAvailability = {
  startDate: string;
  endDate: string;
  dateRange: string;
  blockers: WeekendBlocker[];
  blockerCount: number;
};
