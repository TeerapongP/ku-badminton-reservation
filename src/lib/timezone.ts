/**
 * Timezone utility for Thailand (UTC+7)
 * Ensures consistent timezone handling across the application
 */

export const THAILAND_TIMEZONE = 'Asia/Bangkok';
export const THAILAND_UTC_OFFSET = 7; // hours

/**
 * Get current date/time in Thailand timezone
 */
export function getThailandDate(date?: Date | string | number): Date {
  const inputDate = date ? new Date(date) : new Date();
  
  // Convert to Thailand time by adding UTC offset
  const utcTime = inputDate.getTime();
  const thailandTime = new Date(utcTime + (THAILAND_UTC_OFFSET * 60 * 60 * 1000));
  
  return thailandTime;
}

/**
 * Get current timestamp in Thailand timezone
 */
export function getThailandTimestamp(): number {
  return getThailandDate().getTime();
}

/**
 * Format date to Thailand timezone string
 */
export function formatThailandDate(date?: Date | string | number, format: 'date' | 'datetime' | 'time' = 'datetime'): string {
  const thailandDate = getThailandDate(date);
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: THAILAND_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  
  if (format === 'datetime' || format === 'time') {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
    options.hour12 = false;
  }
  
  if (format === 'time') {
    delete options.year;
    delete options.month;
    delete options.day;
  }
  
  return thailandDate.toLocaleString('th-TH', options);
}

/**
 * Get Thailand date at start of day (00:00:00)
 */
export function getThailandStartOfDay(date?: Date | string | number): Date {
  const thailandDate = getThailandDate(date);
  thailandDate.setHours(0, 0, 0, 0);
  return thailandDate;
}

/**
 * Get Thailand date at end of day (23:59:59)
 */
export function getThailandEndOfDay(date?: Date | string | number): Date {
  const thailandDate = getThailandDate(date);
  thailandDate.setHours(23, 59, 59, 999);
  return thailandDate;
}

/**
 * Check if current time is within Thailand business hours
 */
export function isThailandBusinessHours(startHour = 8, endHour = 20): boolean {
  const now = getThailandDate();
  const hour = now.getHours();
  return hour >= startHour && hour < endHour;
}

/**
 * Get Thailand date for Prisma queries (ISO string)
 */
export function getThailandDateForDB(date?: Date | string | number): Date {
  return getThailandDate(date);
}

/**
 * Convert UTC date from DB to Thailand date
 */
export function convertUTCToThailand(utcDate: Date | string): Date {
  const date = new Date(utcDate);
  return getThailandDate(date);
}
