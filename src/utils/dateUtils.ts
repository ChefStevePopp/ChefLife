/**
 * Date Utilities - Local Timezone Aware
 * 
 * ChefLife operates on LOCAL business days, not UTC.
 * A sick day on "January 6th" in Ontario should be recorded as January 6th,
 * regardless of what time it is in UTC.
 */

/**
 * Get today's date as a YYYY-MM-DD string in local timezone
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get the current year in local timezone
 */
export const getLocalYear = (): number => {
  return new Date().getFullYear();
};

/**
 * Get the start of the current calendar year as YYYY-MM-DD in local timezone
 */
export const getLocalYearStart = (year?: number): string => {
  const y = year ?? getLocalYear();
  return `${y}-01-01`;
};

/**
 * Get the end of the current calendar year as YYYY-MM-DD in local timezone
 */
export const getLocalYearEnd = (year?: number): string => {
  const y = year ?? getLocalYear();
  return `${y}-12-31`;
};

/**
 * Parse a YYYY-MM-DD string as a local date (not UTC)
 * This avoids the timezone shift that occurs with new Date('2026-01-06')
 */
export const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Compare two date strings (YYYY-MM-DD format)
 * Returns: negative if a < b, positive if a > b, 0 if equal
 */
export const compareDateStrings = (a: string, b: string): number => {
  return a.localeCompare(b);
};

/**
 * Check if a date string is within a range (inclusive)
 */
export const isDateInRange = (
  dateStr: string, 
  startStr: string, 
  endStr?: string
): boolean => {
  if (dateStr < startStr) return false;
  if (endStr && dateStr > endStr) return false;
  return true;
};

/**
 * Get the start of a period based on reset type
 * @param resetPeriod - calendar_year, anniversary, or fiscal_year
 * @param hireDate - Employee's hire date (YYYY-MM-DD format, required for anniversary)
 * @returns YYYY-MM-DD string for period start
 */
export const getPeriodStart = (
  resetPeriod: 'calendar_year' | 'anniversary' | 'fiscal_year',
  hireDate?: string | null
): string => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const today = getLocalDateString(now);
  
  switch (resetPeriod) {
    case 'calendar_year':
      // Start of current calendar year (Jan 1)
      return `${currentYear}-01-01`;
      
    case 'anniversary':
      // Most recent hire anniversary
      if (!hireDate) {
        // Fallback to calendar year if no hire date
        return `${currentYear}-01-01`;
      }
      
      // Extract month and day from hire date
      const [, hireMonth, hireDay] = hireDate.split('-');
      const anniversaryThisYear = `${currentYear}-${hireMonth}-${hireDay}`;
      
      if (anniversaryThisYear > today) {
        // Anniversary hasn't happened yet this year, use last year's
        return `${currentYear - 1}-${hireMonth}-${hireDay}`;
      }
      return anniversaryThisYear;
      
    case 'fiscal_year':
      // Default fiscal year starts Jan 1 (could be configurable later)
      return `${currentYear}-01-01`;
      
    default:
      return `${currentYear}-01-01`;
  }
};

/**
 * Format a date string for display
 * Uses parseLocalDate to avoid timezone shift
 */
export const formatDateForDisplay = (
  dateStr: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string => {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', options);
};

/**
 * Format a date string for display (short format - no year)
 */
export const formatDateShort = (dateStr: string): string => {
  return formatDateForDisplay(dateStr, { month: 'short', day: 'numeric' });
};

/**
 * Format a date string for display (long format with weekday)
 */
export const formatDateLong = (dateStr: string): string => {
  return formatDateForDisplay(dateStr, { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

/**
 * Get relative date description (today, yesterday, etc.)
 */
export const getRelativeDateLabel = (dateStr: string): string | null => {
  const today = getLocalDateString();
  const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
  
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return null;
};

/**
 * Get the start and end of a week containing a date
 */
export const getWeekBounds = (dateStr: string): { start: string; end: string } => {
  const date = parseLocalDate(dateStr);
  const dayOfWeek = date.getDay(); // 0 = Sunday
  
  const startDate = new Date(date);
  startDate.setDate(date.getDate() - dayOfWeek);
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  return {
    start: getLocalDateString(startDate),
    end: getLocalDateString(endDate),
  };
};

/**
 * Check if a date string represents a date in the current year (local timezone)
 */
export const isCurrentYear = (dateStr: string): boolean => {
  const currentYear = getLocalYear();
  return dateStr.startsWith(`${currentYear}-`);
};

/**
 * Get N days ago as YYYY-MM-DD
 */
export const getDaysAgo = (n: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return getLocalDateString(date);
};
