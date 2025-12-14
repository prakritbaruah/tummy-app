import { supabase } from '../lib/supabase';
import { env } from '../lib/env';
import { BowelEntry } from '../types/bowel';
import { BowelEntryRow } from '../types/supabase';
import { fromBowelRow, toBowelRow } from './mappers';

const TABLE = 'bowel_entries';

const handleError = (error: unknown) => {
  if (error instanceof Error) throw error;
  throw new Error('Unexpected Supabase error');
};

export const listBowelEntries = async (userId: string = env.supabaseDevUserId) => {
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

  return (data).map(fromBowelRow);
};

export const createBowelEntry = async (
  entry: BowelEntry,
  userId: string = env.supabaseDevUserId,
): Promise<BowelEntry> => {
  const row = toBowelRow(entry, userId);
  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select()
    .single();

  if (error) {
    handleError(error);
  }

  if (!data) {
    throw new Error('Failed to create bowel entry');
  }

  return fromBowelRow(data as BowelEntryRow);
};
