import { supabase } from '@/lib/supabase';
import { BowelEntry } from '@/types/bowel';
import { BowelEntryRow } from '@/types/supabase';
import { fromBowelRow, toBowelRow } from '@/data/mappers';
import { getAuthenticatedUserId, handleError } from '@/data/utils';

const TABLE = 'bowel_entries';

/**
 * Lists all bowel entries for the authenticated user.
 * Automatically scoped by RLS policies to the current user.
 * Filters out soft-deleted entries (deleted_at IS NULL).
 */
export async function listBowelEntries(): Promise<BowelEntry[]> {
  // Verify user is authenticated (RLS will enforce, but we check for better error messages)
  await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .is('deleted_at', null)
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

/**
 * Updates a bowel entry's deleted_at timestamp (soft delete).
 * This marks the entry as deleted without actually removing it from the database.
 */
export async function updateBowelEntryDeletedAt(
  bowelEntryId: string,
  deletedAt: Date
): Promise<BowelEntry> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ deleted_at: deletedAt.toISOString() })
    .eq('id', bowelEntryId)
    .select()
    .single();

  if (error) {
    handleError(error);
  }

  if (!data) {
    throw new Error('Failed to update bowel entry deleted_at');
  }

  return fromBowelRow(data as BowelEntryRow);
}
