// Common types used across the application

// Base interface for all entries
// TODO: should this be a uuid and a timestamp?
export interface BaseEntry {
  id: string;
  timestamp: number;
}
