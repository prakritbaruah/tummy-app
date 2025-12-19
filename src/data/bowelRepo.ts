import { supabase } from '../lib/supabase';
import { BowelEntry } from '../types/bowel';
import { BowelEntryRow } from '../types/supabase';
import { fromBowelRow, toBowelRow } from './mappers';
import { getAuthenticatedUserId, handleError } from './utils';

const TABLE = 'bowel_entries';

/**
 * Lists all bowel entries for the authenticated user.
 * Automatically scoped by RLS policies to the current user.
 */
export async function listBowelEntries(): Promise<BowelEntry[]> {
  // Verify user is authenticated (RLS will enforce, but we check for better error messages)
  await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('occurred_at', { ascending: false });

  if (error) {
    handleError(error);
  }

  if (!data) {
    return [];
  }

  return (data).map(fromBowelRow);
}

/**
 * Creates a new bowel entry for the authenticated user.
 * The user_id is automatically set from the authenticated session.
 */
export async function createBowelEntry(entry: BowelEntry): Promise<BowelEntry> {
  const userId = await getAuthenticatedUserId();
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
}
