import { supabase } from '@/lib/supabase';

/**
 * Handles Supabase errors by converting them to standard Error objects.
 */
export function handleError(error: unknown) {
  if (error instanceof Error) throw error;
  
  // Supabase errors are objects with code and message properties
  if (error && typeof error === 'object') {
    const supabaseError = error as { message?: string; code?: string; [key: string]: any };
    if ('message' in supabaseError && typeof supabaseError.message === 'string') {
      throw new Error(supabaseError.message);
    }
    // If it's an error-like object but no message, try to stringify it
    if ('code' in supabaseError) {
      throw new Error(`Supabase error: ${supabaseError.code || 'unknown'}`);
    }
  }
  
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

