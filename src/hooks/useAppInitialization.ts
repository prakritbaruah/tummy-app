 import { useEffect, useState } from 'react';
import { useAppDispatch } from '@/store';
import { fetchSymptomEntries } from '@/store/symptomsSlice';
import { fetchBowelEntries } from '@/store/bowelSlice';
import { getAllTriggers } from '@/data/foodEntryRepo';
import { useAuth } from '@/contexts';

/**
 * Hook to preload essential app data on startup.
 * Returns loading state and any errors encountered.
 */
export function useAppInitialization() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const loadAppData = async () => {
      // Wait for auth to finish loading first
      if (authLoading) {
        setIsLoading(true);
        return;
      }

      // If user is not logged in, we're done loading (no data to preload)
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Preload essential data in parallel
        await Promise.all([
          // Load Redux store data
          dispatch(fetchSymptomEntries()),
          dispatch(fetchBowelEntries()),
          // Preload triggers (used in ConfirmFoodEntryScreen)
          // We don't store this in Redux, but preloading helps with performance
          getAllTriggers().catch((err) => {
            console.warn('Failed to preload triggers:', err);
            // Don't fail the whole initialization if triggers fail
          }),
        ]);

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading app data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load app data');
        setIsLoading(false);
      }
    };

    void loadAppData();
  }, [dispatch, user, authLoading]);

  return { isLoading, error };
}

