import { supabase } from '../lib/supabase';
import { SymptomEntry } from '../types/symptoms';
import { SymptomEntryRow } from '../types/supabase';
import { fromSymptomRow, toSymptomRow } from './mappers';

const TABLE = 'symptom_entries';

const handleError = (error: unknown) => {
  if (error instanceof Error) throw error;
  throw new Error('Unexpected Supabase error');
};

/**
 * Gets the authenticated user ID from the current Supabase session.
 * Throws an error if no user is authenticated.
 */
const getAuthenticatedUserId = async (): Promise<string> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('User must be authenticated to access symptom entries');
  }
  
  return user.id;
};

/**
 * Lists all symptom entries for the authenticated user.
 * Automatically scoped by RLS policies to the current user.
 */
export const listSymptomEntries = async (): Promise<SymptomEntry[]> => {
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

  return (data).map(fromSymptomRow);
};

/**
 * Creates a new symptom entry for the authenticated user.
 * The user_id is automatically set from the authenticated session.
 */
export const createSymptomEntry = async (entry: SymptomEntry): Promise<SymptomEntry> => {
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
};
