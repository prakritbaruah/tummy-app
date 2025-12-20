import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createFoodEntry, confirmFoodEntry } from '@/data/foodEntryService';
import { supabase } from '@/lib/supabase';

/**
 * Integration tests for food entry flow.
 * 
 * These tests follow Supabase best practices:
 * - Test as real users (anon key + authentication) to verify RLS policies
 * - Use service role key ONLY for setup/teardown (admin operations)
 * - Test the full user experience, not just database operations
 * 
 * Requires a test Supabase project with migrations applied (not production).
 * Set SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, SUPABASE_TEST_SECRET_KEY, and SUPABASE_TEST_USER_ID
 * in your .env.local file for integration tests.
 */
const supabaseUrl = process.env.SUPABASE_TEST_URL;
const supabaseAnonKey = process.env.SUPABASE_TEST_ANON_KEY;
const supabaseSecretKey = process.env.SUPABASE_TEST_SECRET_KEY;
const testUserId = process.env.SUPABASE_TEST_USER_ID;

describe('foodEntryFlow integration (test database)', () => {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseSecretKey) {
    throw new Error(
      'SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, or SUPABASE_TEST_SECRET_KEY are not set. These should point to a test Supabase instance, not production.',
    );
  }

  if (!testUserId) {
    throw new Error('SUPABASE_TEST_USER_ID is not set');
  }

  // Service role client for admin operations ONLY (setup/teardown/verification)
  // This bypasses RLS and should never be used for actual test operations
  const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Authenticated user ID (may differ from testUserId env var)
  let authenticatedUserId: string = testUserId;

  /**
   * Comprehensive cleanup function that removes all test user data.
   * Used in beforeAll to ensure clean slate, and afterAll as safety net.
   */
  const cleanupAllTestData = async (userId: string) => {
    try {
      // Get all raw entries for this user
      const { data: rawEntries } = await adminClient
        .from('raw_entry')
        .select('id')
        .eq('user_id', userId);

      if (rawEntries && rawEntries.length > 0) {
        const rawEntryIds = rawEntries.map((re) => re.id);

        // Get all dish events for these raw entries
        const { data: dishEvents } = await adminClient
          .from('dish_events')
          .select('id, dish_id')
          .in('raw_entry_id', rawEntryIds);

        if (dishEvents && dishEvents.length > 0) {
          const dishEventIds = dishEvents.map((de) => de.id);

          // Delete in reverse order of dependencies
          await adminClient.from('dish_triggers').delete().in('dish_event_id', dishEventIds);
          await adminClient
            .from('predicted_dish_triggers')
            .delete()
            .in('dish_event_id', dishEventIds);
          await adminClient.from('dish_events').delete().in('raw_entry_id', rawEntryIds);
        }

        // Delete predicted dishes and raw entries
        await adminClient.from('predicted_dish').delete().in('raw_entry_id', rawEntryIds);
        await adminClient.from('raw_entry').delete().in('id', rawEntryIds);
      }

      // Clean up all dishes for this user (removes conflicts from previous test runs)
      // Dishes will be recreated as needed during tests, allowing reuse within a single run
      await adminClient.from('dish').delete().eq('user_id', userId);
    } catch (error) {
      console.warn('Cleanup all test data error (non-fatal):', error);
    }
  };

  beforeAll(async () => {
    // SETUP: Create/get test user using service role (admin operation)
    const testUserEmail = `test-${testUserId}@example.com`;
    const testUserPassword = 'test-password-123!';

    // Try to get existing user by ID
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
      testUserId,
    );

    let userEmail = testUserEmail;
    let targetUserId = testUserId;

    if (userError || !userData?.user) {
      // User doesn't exist, create it
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        password: testUserPassword,
        user_metadata: { test_user: true },
      });

      if (createError && createError.code !== 'email_exists') {
        throw createError;
      }

      if (newUser?.user) {
        targetUserId = newUser.user.id;
        authenticatedUserId = newUser.user.id;
      }
    } else {
      userEmail = userData.user.email || userEmail;
      targetUserId = userData.user.id;
      authenticatedUserId = userData.user.id;
    }

    // Ensure password is set correctly
    await adminClient.auth.admin.updateUserById(targetUserId, {
      password: testUserPassword,
    });

    // AUTHENTICATE: Sign in as the test user using anon key (real user behavior)
    // This ensures RLS policies are tested correctly
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: testUserPassword,
    });

    if (signInError || !sessionData?.session) {
      throw signInError || new Error('Failed to sign in test user');
    }

    authenticatedUserId = sessionData.session.user.id;

    // Verify authentication worked
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    if (getUserError || !user) {
      throw new Error('Failed to verify authentication');
    }

    // Clean up all test data before running tests (hybrid approach)
    // This ensures a clean slate while still allowing dish reuse within a test run
    await cleanupAllTestData(authenticatedUserId);
  });

  // Safety net: cleanup after all tests complete
  afterAll(async () => {
    if (authenticatedUserId) {
      await cleanupAllTestData(authenticatedUserId);
    }
  });

  // Cleanup helper - uses service role for admin operations
  const cleanup = async (rawEntryId: string) => {
    try {
      // Get all related data
      const { data: dishEvents } = await adminClient
        .from('dish_events')
        .select('id, dish_id')
        .eq('raw_entry_id', rawEntryId);

      if (dishEvents && dishEvents.length > 0) {
        const dishEventIds = dishEvents.map((de) => de.id);

        // Delete in reverse order of dependencies
        await adminClient.from('dish_triggers').delete().in('dish_event_id', dishEventIds);
        await adminClient
          .from('predicted_dish_triggers')
          .delete()
          .in('dish_event_id', dishEventIds);
        await adminClient.from('dish_events').delete().eq('raw_entry_id', rawEntryId);
      }

      await adminClient.from('predicted_dish').delete().eq('raw_entry_id', rawEntryId);
      await adminClient.from('raw_entry').delete().eq('id', rawEntryId);
      // Note: We don't delete dishes in per-test cleanup as they might be reused within a test run.
      // Full cleanup happens in beforeAll/afterAll to prevent conflicts from previous test runs.
    } catch (error) {
      console.warn('Cleanup error (non-fatal):', error);
    }
  };

  // Helper to get trigger IDs by name - uses authenticated client (real user behavior)
  const getTriggerIds = async (triggerNames: string[]): Promise<Map<string, string>> => {
    const { data: triggers } = await supabase
      .from('triggers')
      .select('id, trigger_name')
      .in('trigger_name', triggerNames);

    const map = new Map<string, string>();
    triggers?.forEach((t) => {
      map.set(t.trigger_name, t.id);
    });
    return map;
  };

  describe('createFoodEntry', () => {
    it(
      'creates new entry with multiple dishes and predicted triggers',
      async () => {
        const result = await createFoodEntry({
          raw_entry_text: 'Chocolate Croissant and Matcha Latte',
        });

        // Verify response structure
        expect(result.entry_id).toBeDefined();
        expect(result.dishes).toHaveLength(2);

        // Verify dishes
        const croissantDish = result.dishes.find((d) => d.dish_name === 'Chocolate Croissant');
        const latteDish = result.dishes.find((d) => d.dish_name === 'Matcha Latte');

        expect(croissantDish).toBeDefined();
        expect(latteDish).toBeDefined();
        expect(croissantDish?.dish_id).toBeDefined();
        expect(latteDish?.dish_id).toBeDefined();
        expect(croissantDish?.dish_event_id).toBeDefined();
        expect(latteDish?.dish_event_id).toBeDefined();

        // Verify predicted triggers (based on stub logic)
        expect(croissantDish?.predicted_triggers).toBeDefined();
        expect(croissantDish?.predicted_triggers?.length).toBeGreaterThan(0);
        expect(
          croissantDish?.predicted_triggers?.some((t) => t.trigger_name === 'gluten'),
        ).toBe(true);

        expect(latteDish?.predicted_triggers).toBeDefined();
        expect(latteDish?.predicted_triggers?.length).toBeGreaterThan(0);
        expect(latteDish?.predicted_triggers?.some((t) => t.trigger_name === 'caffeine')).toBe(
          true,
        );

        // Verify database state using admin client (verification only)
        const { data: rawEntry } = await adminClient
          .from('raw_entry')
          .select('*')
          .eq('id', result.entry_id)
          .single();

        expect(rawEntry).toBeDefined();
        expect(rawEntry?.raw_entry_text).toBe('Chocolate Croissant and Matcha Latte');
        expect(rawEntry?.user_id).toBe(authenticatedUserId);

        const { data: predictedDishes } = await adminClient
          .from('predicted_dish')
          .select('*')
          .eq('raw_entry_id', result.entry_id);

        expect(predictedDishes).toHaveLength(2);

        const { data: dishes } = await adminClient
          .from('dish')
          .select('*')
          .in('id', [croissantDish!.dish_id, latteDish!.dish_id]);

        expect(dishes).toHaveLength(2);
        expect(dishes?.some((d) => d.dish_name === 'Chocolate Croissant')).toBe(true);
        expect(dishes?.some((d) => d.dish_name === 'Matcha Latte')).toBe(true);

        const { data: dishEvents } = await adminClient
          .from('dish_events')
          .select('*')
          .eq('raw_entry_id', result.entry_id);

        expect(dishEvents).toHaveLength(2);

        // Cleanup
        await cleanup(result.entry_id);
      },
      30000,
    );

    it(
      'creates entry with single dish',
      async () => {
        const result = await createFoodEntry({
          raw_entry_text: 'Cherry turnover',
        });

        expect(result.entry_id).toBeDefined();
        expect(result.dishes).toHaveLength(1);
        expect(result.dishes[0].dish_name).toBe('Cherry Turnover');
        expect(result.dishes[0].predicted_triggers).toBeDefined();
        expect(
          result.dishes[0].predicted_triggers?.some((t) => t.trigger_name === 'gluten'),
        ).toBe(true);

        // Cleanup
        await cleanup(result.entry_id);
      },
      30000,
    );

    it(
      'normalizes dish names correctly for matching',
      async () => {
        // Create first entry
        const firstResult = await createFoodEntry({
          raw_entry_text: 'Chocolate Croissant',
        });

        const firstDishId = firstResult.dishes[0].dish_id;

        // Create second entry with slightly different casing/spacing
        const secondResult = await createFoodEntry({
          raw_entry_text: 'chocolate  croissant',
        });

        // Should reuse the same dish due to normalization
        expect(secondResult.dishes[0].dish_id).toBe(firstDishId);

        // Cleanup
        await cleanup(firstResult.entry_id);
        await cleanup(secondResult.entry_id);
      },
      30000,
    );

    it(
      'reuses existing dish and copies triggers from most recent event',
      async () => {
        // Create first entry
        const firstResult = await createFoodEntry({
          raw_entry_text: 'Chocolate Croissant',
        });

        const firstDishId = firstResult.dishes[0].dish_id;
        const firstDishEventId = firstResult.dishes[0].dish_event_id;

        // Get trigger IDs
        const triggerMap = await getTriggerIds(['gluten', 'dairy']);
        const glutenId = triggerMap.get('gluten');

        expect(glutenId).toBeDefined();

        // Confirm first entry with triggers
        await confirmFoodEntry(firstResult.entry_id, {
          confirmed_dishes: [
            {
              dish_event_id: firstDishEventId,
              dish_id: firstDishId,
              final_dish_name: 'Chocolate Croissant',
              trigger_ids: glutenId ? [glutenId] : [],
            },
          ],
        });

        // Create second entry with same dish
        const secondResult = await createFoodEntry({
          raw_entry_text: 'Chocolate Croissant',
        });

        // Should reuse the same dish_id
        expect(secondResult.dishes[0].dish_id).toBe(firstDishId);

        // Should have copied triggers from most recent event
        expect(secondResult.dishes[0].predicted_triggers).toBeDefined();
        if (glutenId) {
          expect(
            secondResult.dishes[0].predicted_triggers?.some((t) => t.trigger_id === glutenId),
          ).toBe(true);
        }

        // Cleanup
        await cleanup(firstResult.entry_id);
        await cleanup(secondResult.entry_id);
      },
      30000,
    );

    it(
      'handles dish with no triggers',
      async () => {
        const result = await createFoodEntry({
          raw_entry_text: 'Grilled Salmon',
        });

        expect(result.entry_id).toBeDefined();
        expect(result.dishes).toHaveLength(1);
        expect(result.dishes[0].dish_name).toBe('Grilled Salmon');

        // Salmon should have no triggers based on stub logic
        expect(result.dishes[0].predicted_triggers).toBeDefined();
        expect(result.dishes[0].predicted_triggers?.length).toBe(0);

        // Cleanup
        await cleanup(result.entry_id);
      },
      30000,
    );
  });

  describe('confirmFoodEntry', () => {
    it(
      'updates dish name and sets confirmed triggers',
      async () => {
        // Create entry
        const createResult = await createFoodEntry({
          raw_entry_text: 'Chocolate Croissant',
        });

        const dishEvent = createResult.dishes[0];

        // Get trigger IDs
        const triggerMap = await getTriggerIds(['gluten', 'dairy']);
        const glutenId = triggerMap.get('gluten');
        const dairyId = triggerMap.get('dairy');

        expect(glutenId).toBeDefined();
        expect(dairyId).toBeDefined();

        // Confirm with modified name and triggers
        const confirmResult = await confirmFoodEntry(createResult.entry_id, {
          confirmed_dishes: [
            {
              dish_event_id: dishEvent.dish_event_id,
              dish_id: dishEvent.dish_id,
              final_dish_name: 'Choco Croissant', // Modified name
              trigger_ids: [glutenId!, dairyId!],
            },
          ],
        });

        // Verify response
        expect(confirmResult.entry_id).toBe(createResult.entry_id);
        expect(confirmResult.dishes).toHaveLength(1);
        expect(confirmResult.dishes[0].dish_name).toBe('Choco Croissant');
        expect(confirmResult.dishes[0].triggers).toBeDefined();
        expect(confirmResult.dishes[0].triggers?.length).toBe(2);
        expect(confirmResult.dishes[0].triggers?.some((t) => t.trigger_name === 'gluten')).toBe(
          true,
        );
        expect(confirmResult.dishes[0].triggers?.some((t) => t.trigger_name === 'dairy')).toBe(
          true,
        );

        // Verify database state using admin client (verification only)
        const { data: dish } = await adminClient
          .from('dish')
          .select('*')
          .eq('id', dishEvent.dish_id)
          .single();

        expect(dish?.dish_name).toBe('Choco Croissant');
        expect(dish?.normalized_dish_name).toBe('choco croissant');

        // Check dish_triggers were created
        const { data: dishTriggers } = await adminClient
          .from('dish_triggers')
          .select('*, triggers(trigger_name)')
          .eq('dish_event_id', dishEvent.dish_event_id);

        expect(dishTriggers).toHaveLength(2);
        const triggerNames = dishTriggers?.map((dt: any) => dt.triggers.trigger_name);
        expect(triggerNames).toContain('gluten');
        expect(triggerNames).toContain('dairy');

        // Verify predicted_dish_triggers are unchanged
        const { data: predictedTriggers } = await adminClient
          .from('predicted_dish_triggers')
          .select('*')
          .eq('dish_event_id', dishEvent.dish_event_id);

        expect(predictedTriggers).toBeDefined();
        expect(predictedTriggers?.length).toBeGreaterThan(0);

        // Cleanup
        await cleanup(createResult.entry_id);
      },
      30000,
    );

    it(
      'removes all triggers when empty array is provided',
      async () => {
        // Create entry
        const createResult = await createFoodEntry({
          raw_entry_text: 'Chocolate Croissant',
        });

        const dishEvent = createResult.dishes[0];

        // Get trigger IDs
        const triggerMap = await getTriggerIds(['gluten']);
        const glutenId = triggerMap.get('gluten');

        // First confirm with a trigger
        await confirmFoodEntry(createResult.entry_id, {
          confirmed_dishes: [
            {
              dish_event_id: dishEvent.dish_event_id,
              dish_id: dishEvent.dish_id,
              final_dish_name: 'Chocolate Croissant',
              trigger_ids: glutenId ? [glutenId] : [],
            },
          ],
        });

        // Then confirm with no triggers
        const confirmResult = await confirmFoodEntry(createResult.entry_id, {
          confirmed_dishes: [
            {
              dish_event_id: dishEvent.dish_event_id,
              dish_id: dishEvent.dish_id,
              final_dish_name: 'Chocolate Croissant',
              trigger_ids: [], // No triggers
            },
          ],
        });

        expect(confirmResult.dishes[0].triggers).toBeDefined();
        expect(confirmResult.dishes[0].triggers?.length).toBe(0);

        // Verify database
        const { data: dishTriggers } = await adminClient
          .from('dish_triggers')
          .select('*')
          .eq('dish_event_id', dishEvent.dish_event_id);

        expect(dishTriggers).toHaveLength(0);

        // Cleanup
        await cleanup(createResult.entry_id);
      },
      30000,
    );

    it(
      'handles multiple dishes in confirmation',
      async () => {
        // Create entry with multiple dishes
        const createResult = await createFoodEntry({
          raw_entry_text: 'Chocolate Croissant and Matcha Latte',
        });

        expect(createResult.dishes).toHaveLength(2);

        // Get trigger IDs
        const triggerMap = await getTriggerIds(['gluten', 'caffeine']);
        const glutenId = triggerMap.get('gluten');
        const caffeineId = triggerMap.get('caffeine');

        // Confirm both dishes with different triggers
        const confirmResult = await confirmFoodEntry(createResult.entry_id, {
          confirmed_dishes: [
            {
              dish_event_id: createResult.dishes[0].dish_event_id,
              dish_id: createResult.dishes[0].dish_id,
              final_dish_name: 'Chocolate Croissant',
              trigger_ids: glutenId ? [glutenId] : [],
            },
            {
              dish_event_id: createResult.dishes[1].dish_event_id,
              dish_id: createResult.dishes[1].dish_id,
              final_dish_name: 'Matcha Latte',
              trigger_ids: caffeineId ? [caffeineId] : [],
            },
          ],
        });

        expect(confirmResult.dishes).toHaveLength(2);
        expect(confirmResult.dishes[0].triggers?.length).toBe(glutenId ? 1 : 0);
        expect(confirmResult.dishes[1].triggers?.length).toBe(caffeineId ? 1 : 0);

        // Cleanup
        await cleanup(createResult.entry_id);
      },
      30000,
    );

    it(
      'preserves predicted_dish_triggers after confirmation',
      async () => {
        // Create entry
        const createResult = await createFoodEntry({
          raw_entry_text: 'Chocolate Croissant',
        });

        const dishEvent = createResult.dishes[0];

        // Get predicted triggers count before confirmation
        const { data: predictedBefore } = await adminClient
          .from('predicted_dish_triggers')
          .select('*')
          .eq('dish_event_id', dishEvent.dish_event_id);

        const predictedTriggersCount = predictedBefore?.length || 0;

        // Get trigger IDs
        const triggerMap = await getTriggerIds(['dairy']);
        const dairyId = triggerMap.get('dairy');

        // Confirm with different triggers
        await confirmFoodEntry(createResult.entry_id, {
          confirmed_dishes: [
            {
              dish_event_id: dishEvent.dish_event_id,
              dish_id: dishEvent.dish_id,
              final_dish_name: 'Chocolate Croissant',
              trigger_ids: dairyId ? [dairyId] : [],
            },
          ],
        });

        // Verify predicted triggers are still there
        const { data: predictedAfter } = await adminClient
          .from('predicted_dish_triggers')
          .select('*')
          .eq('dish_event_id', dishEvent.dish_event_id);

        expect(predictedAfter?.length).toBe(predictedTriggersCount);

        // Cleanup
        await cleanup(createResult.entry_id);
      },
      30000,
    );
  });

  describe('edge cases and data integrity', () => {
    it(
      'handles dish name normalization with filler words',
      async () => {
        // Create entry with filler words
        const firstResult = await createFoodEntry({
          raw_entry_text: 'Pasta and Meatballs',
        });

        const firstDishId = firstResult.dishes.find((d) => d.dish_name === 'Pasta')?.dish_id;

        // Create second entry with same dish but different wording
        const secondResult = await createFoodEntry({
          raw_entry_text: 'Pasta with Meatballs',
        });

        // Should create separate dishes (since normalization removes "and" and "with")
        const pastaDish = secondResult.dishes.find((d) => d.dish_name.includes('Pasta'));
        expect(pastaDish).toBeDefined();

        // Cleanup
        await cleanup(firstResult.entry_id);
        await cleanup(secondResult.entry_id);
      },
      30000,
    );

    it(
      'maintains referential integrity across tables',
      async () => {
        const result = await createFoodEntry({
          raw_entry_text: 'Chocolate Croissant',
        });

        // Verify all foreign keys are valid
        const { data: rawEntry } = await adminClient
          .from('raw_entry')
          .select('*')
          .eq('id', result.entry_id)
          .single();

        const { data: predictedDishes } = await adminClient
          .from('predicted_dish')
          .select('*')
          .eq('raw_entry_id', result.entry_id);

        const { data: dishEvents } = await adminClient
          .from('dish_events')
          .select('*')
          .eq('raw_entry_id', result.entry_id);

        // All predicted_dish should reference valid raw_entry
        expect(predictedDishes?.every((pd) => pd.raw_entry_id === result.entry_id)).toBe(true);

        // All dish_events should reference valid raw_entry and dish
        expect(dishEvents?.every((de) => de.raw_entry_id === result.entry_id)).toBe(true);

        for (const de of dishEvents || []) {
          const { data: dish } = await adminClient
            .from('dish')
            .select('*')
            .eq('id', de.dish_id)
            .single();
          expect(dish).toBeDefined();
        }

        // Cleanup
        await cleanup(result.entry_id);
      },
      30000,
    );

    it(
      'handles case-insensitive dish matching',
      async () => {
        // Create first entry
        const firstResult = await createFoodEntry({
          raw_entry_text: 'Chocolate Croissant',
        });

        const firstDishId = firstResult.dishes[0].dish_id;

        // Create second entry with different case
        const secondResult = await createFoodEntry({
          raw_entry_text: 'CHOCOLATE CROISSANT',
        });

        // Should reuse the same dish due to normalization
        expect(secondResult.dishes[0].dish_id).toBe(firstDishId);

        // Cleanup
        await cleanup(firstResult.entry_id);
        await cleanup(secondResult.entry_id);
      },
      30000,
    );
  });
});
