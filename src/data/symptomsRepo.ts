import { supabase } from '../lib/supabase';
import { env } from '../lib/env';
import { SymptomEntry } from '../types/symptoms';
import { SymptomEntryRow } from '../types/supabase';
import { fromSymptomRow, toSymptomRow } from './mappers';

const TABLE = 'symptom_entries';

const handleError = (error: unknown) => {
  if (error instanceof Error) throw error;
  throw new Error('Unexpected Supabase error');
};

export const listSymptomEntries = async (userId: string = env.supabaseDevUserId) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false });

  if (error) {
    handleError(error);
  }

  if (!data) {
    return [];
  }

  return (data).map(fromSymptomRow);
};

export const createSymptomEntry = async (
  entry: SymptomEntry,
  userId: string = env.supabaseDevUserId,
): Promise<SymptomEntry> => {
  const row = toSymptomRow(entry, userId);
  const { data, error } = await supabase.from(TABLE).insert(row).select().single();

  if (error) {
    handleError(error);
  }

  if (!data) {
    throw new Error('Failed to create symptom entry');
  }

  return fromSymptomRow(data as SymptomEntryRow);
};
