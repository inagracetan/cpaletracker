/**
 * Time formatting and quiet-hours evaluation utilities
 * Supports 12-hour AM/PM conversion while preserving accurate 24-hour storage
 */

/**
 * Converts a 24-hour time string ("22:00", "08:30", "0:00") into 12-hour format ("10:00 PM", "8:30 AM", "12:00 AM")
 */
export function formatTo12Hour(time24: string | undefined | null): string {
  if (!time24 || typeof time24 !== 'string' || !time24.includes(':')) {
    return '12:00 AM';
  }

  const parts = time24.trim().split(':');
  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) {
    return '12:00 AM';
  }

  hours = Math.max(0, Math.min(23, hours));
  const validMinutes = Math.max(0, Math.min(59, minutes));

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = String(validMinutes).padStart(2, '0');

  return `${displayHours}:${displayMinutes} ${period}`;
}

/**
 * Converts a 12-hour time string ("10:00 PM", "8:30 AM") back into 24-hour format ("22:00", "08:30")
 */
export function parse12HourTo24(time12: string | undefined | null): string {
  if (!time12 || typeof time12 !== 'string') {
    return '22:00';
  }

  const cleaned = time12.trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) {
    // If already in 24h format e.g. "22:00"
    if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
      const [h, m] = cleaned.split(':');
      return `${String(parseInt(h, 10)).padStart(2, '0')}:${m}`;
    }
    return '22:00';
  }

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = (match[3] || 'AM').toUpperCase();

  if (period === 'PM' && hours < 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

/**
 * Determines whether a given time is within quiet hours.
 * Accurately handles overnight spans (e.g. 10:00 PM [22:00] to 7:00 AM [07:00]).
 *
 * @param currentTime24 Current time in "HH:mm" (e.g. "23:15")
 * @param start24 Quiet hours start in "HH:mm" (e.g. "22:00")
 * @param end24 Quiet hours end in "HH:mm" (e.g. "07:00")
 */
export function isQuietHourActive(currentTime24: string, start24: string, end24: string): boolean {
  if (!currentTime24 || !start24 || !end24) return false;

  const toMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(num => parseInt(num, 10));
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  };

  const current = toMinutes(currentTime24);
  const start = toMinutes(start24);
  const end = toMinutes(end24);

  if (start < end) {
    // Same-day span (e.g. 01:00 to 06:00)
    return current >= start && current < end;
  } else if (start > end) {
    // Overnight span (e.g. 22:00 to 07:00)
    return current >= start || current < end;
  } else {
    // start === end means disabled / 0 length
    return false;
  }
}
