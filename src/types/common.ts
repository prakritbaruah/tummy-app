// Common types used across the application
// Use lowercase strings to match UI values and filters
export type Timing = 'morning' | 'afternoon' | 'evening';

// Base interface for all entries
export interface BaseEntry {
  id: string;
  timestamp: number;
} 