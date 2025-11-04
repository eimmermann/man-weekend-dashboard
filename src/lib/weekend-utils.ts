import type { WeekendBlocker, WeekendAvailability } from '@/types';

// Helper function to generate all Thursday-Sunday weekends in a given year
export function getAllWeekendsInYear(year: number): Array<{ startDate: string; endDate: string; dateRange: string }> {
  const weekends: Array<{ startDate: string; endDate: string; dateRange: string }> = [];
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  
  // Find first Thursday of the year
  const current = new Date(start);
  while (current.getDay() !== 4) {
    current.setDate(current.getDate() + 1);
  }
  
  // Generate all Thursdays through the end of the year
  while (current <= end) {
    const thursday = new Date(current);
    const sunday = new Date(current);
    sunday.setDate(sunday.getDate() + 3);
    
    // Check if Sunday is still in the target year
    if (sunday.getFullYear() === year || (sunday.getFullYear() === year + 1 && sunday.getMonth() === 0 && sunday.getDate() <= 3)) {
      const startDate = thursday.toISOString().split('T')[0];
      const endDate = sunday.toISOString().split('T')[0];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Format date range, showing both months if weekend spans months
      let dateRange: string;
      if (thursday.getMonth() === sunday.getMonth()) {
        // Same month: "Jan 5-8, 2026"
        dateRange = `${monthNames[thursday.getMonth()]} ${thursday.getDate()}-${sunday.getDate()}, ${year}`;
      } else {
        // Different months: "Jan 31 - Feb 3, 2026"
        dateRange = `${monthNames[thursday.getMonth()]} ${thursday.getDate()} - ${monthNames[sunday.getMonth()]} ${sunday.getDate()}, ${year}`;
      }
      
      weekends.push({ startDate, endDate, dateRange });
    }
    
    // Move to next Thursday
    current.setDate(current.getDate() + 7);
  }
  
  return weekends;
}

// Helper function to get weekends grouped by availability
export function getWeekendAvailability(blockers: WeekendBlocker[], year: number = 2026): WeekendAvailability[] {
  const weekends = getAllWeekendsInYear(year);
  const blockersByDate = new Map<string, WeekendBlocker[]>();
  
  // Group blockers by weekend start date
  for (const blocker of blockers) {
    const key = blocker.weekendStartDate;
    if (!blockersByDate.has(key)) {
      blockersByDate.set(key, []);
    }
    blockersByDate.get(key)!.push(blocker);
  }
  
  // Create availability info for each weekend
  const availability: WeekendAvailability[] = weekends.map(weekend => {
    const weekendBlockers = blockersByDate.get(weekend.startDate) || [];
    return {
      ...weekend,
      blockers: weekendBlockers,
      blockerCount: weekendBlockers.length,
    };
  });
  
  // Sort strictly by date so weekends remain chronological regardless of blocker status
  availability.sort((a, b) => a.startDate.localeCompare(b.startDate));
  
  return availability;
}

// Helper function to find the Thursday of the weekend containing a date (or before/after)
export function findWeekendStart(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const d = new Date(year, month, day);
  const dayOfWeek = d.getDay();
  // Thursday is day 4
  let daysToAdjust = 0;
  if (dayOfWeek === 0) daysToAdjust = -3; // Sunday -> previous Thursday
  else if (dayOfWeek === 5) daysToAdjust = -1; // Friday -> previous Thursday
  else if (dayOfWeek === 6) daysToAdjust = -2; // Saturday -> previous Thursday
  else if (dayOfWeek === 1) daysToAdjust = -4; // Monday -> previous Thursday
  else if (dayOfWeek === 2) daysToAdjust = -5; // Tuesday -> previous Thursday
  else if (dayOfWeek === 3) daysToAdjust = -6; // Wednesday -> previous Thursday
  // Thursday (4) stays as is
  
  if (daysToAdjust !== 0) {
    d.setDate(d.getDate() + daysToAdjust);
  }
  const yearStr = d.getFullYear();
  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}`;
}

// Helper function to find the next Thursday after a date
export function findNextThursday(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const d = new Date(year, month, day);
  const dayOfWeek = d.getDay();
  let daysUntilThursday = (4 - dayOfWeek + 7) % 7;
  if (daysUntilThursday === 0) daysUntilThursday = 7; // If it's Thursday, get next Thursday
  d.setDate(d.getDate() + daysUntilThursday);
  const yearStr = d.getFullYear();
  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}`;
}

// Calculate which weekend Thursdays should be blocked based on event date and choice
export function calculateWeekendBlocks(eventDate: string, weekendChoice: 'before' | 'after' | 'both', targetYear: number): string[] {
  const [yearStr, monthStr, dayStr] = eventDate.split('-');
  const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10));
  const previousWeekend = findWeekendStart(date);
  const nextWeekend = findNextThursday(date);
  
  const blocks: string[] = [];
  
  if (weekendChoice === 'before' || weekendChoice === 'both') {
    const [prevYearStr] = previousWeekend.split('-');
    const prevYear = parseInt(prevYearStr, 10);
    if (prevYear === targetYear) {
      blocks.push(previousWeekend);
    }
  }
  
  if (weekendChoice === 'after' || weekendChoice === 'both') {
    const [nextYearStr] = nextWeekend.split('-');
    const nextYear = parseInt(nextYearStr, 10);
    if (nextYear === targetYear) {
      blocks.push(nextWeekend);
    }
  }
  
  return blocks;
}

// Calculate weekend blocks for recurring events across multiple years
export function calculateRecurringWeekendBlocks(eventDate: string, weekendChoice: 'before' | 'after' | 'both', years: number[]): Array<{ weekendStartDate: string; year: number }> {
  const [, monthStr, dayStr] = eventDate.split('-');
  
  const blocks: Array<{ weekendStartDate: string; year: number }> = [];
  
  for (const year of years) {
    // Adjust event date to target year
    const adjustedDateStr = `${year}-${monthStr}-${dayStr}`;
    const calculated = calculateWeekendBlocks(adjustedDateStr, weekendChoice, year);
    
    for (const weekendStart of calculated) {
      blocks.push({ weekendStartDate: weekendStart, year });
    }
  }
  
  return blocks;
}

