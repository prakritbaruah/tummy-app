import { supabase } from '../lib/supabase';
import { env } from '../lib/env';
import { FoodEntry } from '../types/food';
import { FoodEntryRow } from '../types/supabase';
import { fromFoodRow, toFoodRow } from './mappers';

const TABLE = 'food_entries';

const handleError = (error: unknown) => {
  if (error instanceof Error) throw error;
  throw new Error('Unexpected Supabase error');
};

export const listFoodEntries = async (userId: string = env.supabaseDevUserId) => {
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

  return (data).map(fromFoodRow);
};

export const createFoodEntry = async (
  entry: FoodEntry,
  userId: string = env.supabaseDevUserId,
): Promise<FoodEntry> => {
  const row = toFoodRow(entry, userId);
  const { data, error } = await supabase.from(TABLE).insert(row).select().single();

  if (error) {
    handleError(error);
  }

  if (!data) {
    throw new Error('Failed to create food entry');
  }

  return fromFoodRow(data as FoodEntryRow);
};
