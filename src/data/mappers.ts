import { BowelEntry, Urgency } from '../types/bowel';
import { FoodEntry } from '../types/food';
import { Severity, SymptomEntry } from '../types/symptoms';
import { BowelEntryRow, FoodEntryRow, SymptomEntryRow } from '../types/supabase';

const toISOString = (timestamp: number) => new Date(timestamp).toISOString();

export const toBowelRow = (
  entry: BowelEntry,
  userId: string,
): Omit<BowelEntryRow, 'created_at' | 'id'> => ({
  user_id: userId,
  occurred_at: toISOString(entry.timestamp),
  urgency: entry.urgency,
  consistency: entry.consistency,
  mucus_present: entry.mucusPresent,
  blood_present: entry.bloodPresent,
  notes: null,
});

export const fromBowelRow = (row: BowelEntryRow): BowelEntry => ({
  id: row.id,
  timestamp: new Date(row.occurred_at).getTime(),
  urgency: row.urgency as Urgency,
  consistency: row.consistency,
  mucusPresent: row.mucus_present,
  bloodPresent: row.blood_present,
});

export const toFoodRow = (
  entry: FoodEntry,
  userId: string,
): Omit<FoodEntryRow, 'created_at' | 'id'> => ({
  user_id: userId,
  occurred_at: toISOString(entry.timestamp),
  name: entry.name,
  quantity: entry.quantity ?? null,
  meal_type: null,
  notes: entry.notes ?? null,
  tags: null,
});

export const fromFoodRow = (row: FoodEntryRow): FoodEntry => ({
  id: row.id,
  timestamp: new Date(row.occurred_at).getTime(),
  name: row.name,
  quantity: row.quantity ?? '',
  notes: row.notes ?? undefined,
});

export const toSymptomRow = (
  entry: SymptomEntry,
  userId: string,
): Omit<SymptomEntryRow, 'created_at' | 'id'> => ({
  user_id: userId,
  occurred_at: toISOString(entry.timestamp),
  symptom: entry.name,
  intensity: entry.severity,
  notes: null,
});

export const fromSymptomRow = (row: SymptomEntryRow): SymptomEntry => ({
  id: row.id,
  timestamp: new Date(row.occurred_at).getTime(),
  name: row.symptom as SymptomEntry['name'],
  severity: row.intensity as Severity,
});
