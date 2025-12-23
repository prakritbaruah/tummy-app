/**
 * Formats a timestamp or Date to a time string (HH:MM format)
 * @param input - Timestamp (number) or Date object
 * @returns Formatted time string (e.g., "02:30 PM")
 */
export function formatTime(input: number | Date): string {
  const date = typeof input === 'number' ? new Date(input) : input;
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats a timestamp, date string, or Date to a relative date string
 * Returns "Today", "Yesterday", or a formatted date string
 * @param input - Timestamp (number), date string, or Date object
 * @returns Formatted date string
 */
export function formatDate(
    input: number | string | Date, 
    format: 'long' | 'short' = 'long'
): string {
  const date = typeof input === 'string' || typeof input === 'number'
    ? new Date(input)
    : input;
  
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString([], {
    weekday: format,
    month: 'short',
    day: 'numeric',
  });
}
