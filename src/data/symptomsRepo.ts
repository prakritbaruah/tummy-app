import { supabase } from '@/lib/supabase';
import { SymptomEntry } from '@/types/symptoms';
import { SymptomEntryRow } from '@/types/supabase';
import { fromSymptomRow, toSymptomRow } from '@/data/mappers';
import { getAuthenticatedUserId, handleError } from '@/data/utils';

const TABLE = 'symptom_entries';

/**
 * Lists all symptom entries for the authenticated user.
 * Automatically scoped by RLS policies to the current user.
 * Filters out soft-deleted entries (deleted_at IS NULL).
 */
export async function listSymptomEntries(): Promise<SymptomEntry[]> {
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

  return (data).map(fromSymptomRow);
}

/**
 * Creates a new symptom entry for the authenticated user.
 * The user_id is automatically set from the authenticated session.
 */
export async function createSymptomEntry(entry: SymptomEntry): Promise<SymptomEntry> {
  const userId = await getAuthenticatedUserId();
  const row = toSymptomRow(entry, userId);
  
  const { data, error } = await supabase.from(TABLE).insert(row).select().single();

  if (error) {
    handleError(error);
  }

  if (!data) {
    throw new Error('Failed to create symptom entry');
  }

  return fromSymptomRow(data as SymptomEntryRow);
}

/**
 * Updates a symptom entry's deleted_at timestamp (soft delete).
 * This marks the entry as deleted without actually removing it from the database.
 */
export async function updateSymptomEntryDeletedAt(
  symptomEntryId: string,
  deletedAt: Date
): Promise<SymptomEntry> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ deleted_at: deletedAt.toISOString() })
    .eq('id', symptomEntryId)
    .select()
    .single();

  if (error) {
    handleError(error);
  }

  if (!data) {
    throw new Error('Failed to update symptom entry deleted_at');
  }

  return fromSymptomRow(data as SymptomEntryRow);
}
