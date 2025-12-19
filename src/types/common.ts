// Common types used across the application

/**
 * Timestamp in milliseconds since Unix epoch (January 1, 1970 UTC).
 * Use this type for all timestamp fields to make the intent clear.
 */
export type Timestamp = number;

// Base interface for all entries
export interface BaseEntry {
  id: string;
  occurredAt: Timestamp;
}
