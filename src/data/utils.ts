import { supabase } from '@/lib/supabase';

/**
 * Handles Supabase errors by converting them to standard Error objects.
 */
export function handleError(error: unknown) {
  if (error instanceof Error) throw error;
  throw new Error('Unexpected Supabase error');
}

/**
 * Gets the authenticated user ID from the current Supabase session.
 * Throws an error if no user is authenticated.
 */
export async function getAuthenticatedUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('User must be authenticated');
  }

  return user.id;
}

