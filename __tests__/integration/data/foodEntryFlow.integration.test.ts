import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { createFoodEntry, confirmFoodEntry, getFoodEntriesForUser } from '@/data/foodEntryService';
import { updateDishEventDeletedAt } from '@/data/foodEntryRepo';
import { supabase } from '@/lib/supabase';
import * as openaiModule from '@/lib/openai';

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

  /**
   * Helper function to create OpenAI API response in the expected format.
   */
  function createOpenAIResponse(data: { dishes?: any[]; triggers?: string[] }): any {
    return {
      choices: [
        {
          message: {
            content: JSON.stringify(data),
          },
        },
      ],
    };
  }

  /**
   * Helper function to determine expected triggers based on dish name.
   * Returns triggers matching test expectations.
   */
  function getExpectedTriggers(dishName: string): string[] {
    const lower = dishName.toLowerCase();

    // Specific dishes with known triggers
    if (lower.includes('grilled salmon')) {
      return [];
    }
    if (lower.includes('chocolate croissant')) {
      return ['gluten', 'dairy', 'sugar'];
    }
    if (lower.includes('cherry turnover')) {
      return ['gluten', 'sugar'];
    }
    if (lower.includes('matcha latte')) {
      return ['caffeine'];
    }
    return [];
  }

  /**
   * Simple helper to normalize dish names (capitalize each word).
   * This mirrors the behavior we expect from the real LLM and supports
   * the normalization tests (e.g., casing/spacing variants of "Chocolate Croissant").
   */
  function normalizeDishName(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  // Mock OpenAI API calls for deterministic test outputs
  let openAIMock: any;

  beforeEach(() => {
    // Create a mock OpenAI client
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    };

    // Mock getOpenAIClient to return our mock client
    vi.spyOn(openaiModule, 'getOpenAIClient').mockReturnValue(mockClient as any);

    // Set up the mock implementation to return deterministic responses based on prompt content
    openAIMock = mockClient.chat.completions.create;
    openAIMock.mockImplementation(async (params: any) => {
      const prompt = params.messages[0]?.content || '';
      
      // Determine response based on prompt content
      if (prompt.includes('Extract individual dishes')) {
        // This is llmExtractDishes call
        // Extract the user input from the prompt (between "User input: " and the next quote)
        const userInputMatch = prompt.match(/User input: "([^"]+)"/);
        const userInput = userInputMatch ? userInputMatch[1] : '';
        
        // Check specific user inputs first (before checking examples in the prompt)
        if (userInput === 'Cherry turnover') {
          return createOpenAIResponse({
            dishes: [
              {
                dish_fragment_text: 'Cherry turnover',
                dish_name_suggestion: 'Cherry Turnover',
              },
            ],
          });
        }
        if (userInput === 'Chocolate Croissant and Matcha Latte') {
          return createOpenAIResponse({
            dishes: [
              {
                dish_fragment_text: 'Chocolate Croissant',
                dish_name_suggestion: 'Chocolate Croissant',
              },
              {
                dish_fragment_text: 'Matcha Latte',
                dish_name_suggestion: 'Matcha Latte',
              },
            ],
          });
        }
        if (userInput === 'Grilled Salmon') {
          return createOpenAIResponse({
            dishes: [
              {
                dish_fragment_text: 'Grilled Salmon',
                dish_name_suggestion: 'Grilled Salmon',
              },
            ],
          });
        }
        if (userInput === 'Pasta and Meatballs') {
          return createOpenAIResponse({
            dishes: [
              {
                dish_fragment_text: 'Pasta',
                dish_name_suggestion: 'Pasta',
              },
              {
                dish_fragment_text: 'Meatballs',
                dish_name_suggestion: 'Meatballs',
              },
            ],
          });
        }
        if (userInput === 'Pasta with Meatballs') {
          return createOpenAIResponse({
            dishes: [
              {
                dish_fragment_text: 'Pasta with Meatballs',
                dish_name_suggestion: 'Pasta with Meatballs',
              },
            ],
          });
        }

        // Default behavior: treat the entire user input as a single dish,
        // and normalize the dish name for consistent matching.
        if (userInput) {
          return createOpenAIResponse({
            dishes: [
              {
                dish_fragment_text: userInput,
                dish_name_suggestion: normalizeDishName(userInput),
              },
            ],
          });
        }
      } else if (prompt.includes('Predict potential food triggers')) {
        // This is llmPredictTriggers call - extract dish name from prompt
        const dishNameMatch = prompt.match(/Dish name: "([^"]+)"/);
        const dishName = dishNameMatch ? dishNameMatch[1] : '';
        
        const triggers = getExpectedTriggers(dishName);
        
        return createOpenAIResponse({ triggers });
      }
      
      // Fallback response
      return createOpenAIResponse({ dishes: [], triggers: [] });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

    it(
      'handles API failure gracefully - allows users to choose their own triggers',
      async () => {
        // Mock OpenAI to throw an error for trigger prediction only
        // Keep dish extraction working so we have a dish to work with
        const originalMock = openAIMock;
        
        // First call (extract dishes) - let it work normally
        // Second call (predict triggers) - make it fail
        let callCount = 0;
        openAIMock.mockImplementation(async (params: any) => {
          callCount++;
          const prompt = params.messages[0]?.content || '';
          
          if (prompt.includes('Extract individual dishes')) {
            // Return normal response for dish extraction
            return {
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      dishes: [
                        {
                          dish_fragment_text: 'Grilled Salmon',
                          dish_name_suggestion: 'Grilled Salmon',
                        },
                      ],
                    }),
                  },
                },
              ],
            };
          } else if (prompt.includes('Predict potential food triggers')) {
            // Make trigger prediction fail
            throw new Error('API rate limit exceeded');
          }
          return { choices: [{ message: { content: '{}' } }] };
        });

        // Create entry - dish extraction should work, trigger prediction will fail
        const result = await createFoodEntry({
          raw_entry_text: 'Grilled Salmon',
        });

        // Verify entry was created with dish
        expect(result.entry_id).toBeDefined();
        expect(result.dishes).toHaveLength(1);
        expect(result.dishes[0].dish_name).toBe('Grilled Salmon');
        
        // When trigger prediction fails, we should have no predicted triggers
        // but the dish event should still exist
        expect(result.dishes[0].predicted_triggers).toBeDefined();
        // May be empty or have some triggers depending on fallback behavior

        const dishEvent = result.dishes[0];

        // Get trigger IDs
        const triggerMap = await getTriggerIds(['gluten', 'dairy']);
        const glutenId = triggerMap.get('gluten');
        const dairyId = triggerMap.get('dairy');

        expect(glutenId).toBeDefined();
        expect(dairyId).toBeDefined();

        // User can still confirm with their own triggers even if API failed
        const confirmResult = await confirmFoodEntry(result.entry_id, {
          confirmed_dishes: [
            {
              dish_event_id: dishEvent.dish_event_id,
              dish_id: dishEvent.dish_id,
              final_dish_name: 'Grilled Salmon',
              trigger_ids: [glutenId!, dairyId!], // User manually selects triggers
            },
          ],
        });

        // Verify confirmation worked
        expect(confirmResult.entry_id).toBe(result.entry_id);
        expect(confirmResult.dishes).toHaveLength(1);
        expect(confirmResult.dishes[0].triggers).toBeDefined();
        expect(confirmResult.dishes[0].triggers?.length).toBe(2);

        // Restore original mock
        openAIMock = originalMock;

        // Cleanup
        await cleanup(result.entry_id);
      },
      30000,
    );

    it(
      'correctly handles adding and removing triggers for a new dish',
      async () => {
        // Create a food entry with a new dish
        const createResult = await createFoodEntry({
          raw_entry_text: 'Pasta Carbonara',
        });

        const dishEvent = createResult.dishes[0];
        expect(dishEvent.dish_event_id).toBeDefined();
        expect(dishEvent.dish_id).toBeDefined();

        // Get all available trigger IDs
        const triggerMap = await getTriggerIds([
          'gluten',
          'dairy',
          'processed_meat',
          'fructans'
        ]);
        const glutenId = triggerMap.get('gluten');
        const dairyId = triggerMap.get('dairy');
        const meatId = triggerMap.get('processed_meat');
        const fructansId = triggerMap.get('fructans');

        expect(glutenId).toBeDefined();
        expect(dairyId).toBeDefined();
        expect(meatId).toBeDefined();
        expect(fructansId).toBeDefined();

        // Simulate user adding triggers: start with predicted triggers, then add more
        // Predicted triggers might be: ['gluten', 'dairy', 'processed_meat']
        // User adds: ['fructans']
        // User removes: ['processed_meat']
        // Final confirmed triggers: ['gluten', 'dairy', 'fructans']

        // Confirm with final set of triggers (after user modifications)
        const finalTriggerIds = [glutenId!, dairyId!, fructansId!];
        const confirmResult = await confirmFoodEntry(createResult.entry_id, {
          confirmed_dishes: [
            {
              dish_event_id: dishEvent.dish_event_id,
              dish_id: dishEvent.dish_id,
              final_dish_name: 'Pasta Carbonara',
              trigger_ids: finalTriggerIds,
            },
          ],
        });

        // Verify confirmation response
        expect(confirmResult.entry_id).toBe(createResult.entry_id);
        expect(confirmResult.dishes).toHaveLength(1);
        expect(confirmResult.dishes[0].dish_name).toBe('Pasta Carbonara');
        expect(confirmResult.dishes[0].triggers).toBeDefined();
        expect(confirmResult.dishes[0].triggers?.length).toBe(3);

        const confirmedTriggerNames = confirmResult.dishes[0].triggers?.map((t) => t.trigger_name) || [];
        expect(confirmedTriggerNames).toContain('gluten');
        expect(confirmedTriggerNames).toContain('dairy');
        expect(confirmedTriggerNames).toContain('fructans');
        expect(confirmedTriggerNames).not.toContain('processed_meat'); // Should not be in final set

        // Verify dish_events table state
        const { data: dishEventRow } = await adminClient
          .from('dish_events')
          .select('*')
          .eq('id', dishEvent.dish_event_id)
          .single();

        expect(dishEventRow).toBeDefined();
        expect(dishEventRow?.id).toBe(dishEvent.dish_event_id);
        expect(dishEventRow?.dish_id).toBe(dishEvent.dish_id);
        expect(dishEventRow?.raw_entry_id).toBe(createResult.entry_id);
        expect(dishEventRow?.confirmed_by_user).toBe(true); // Should be confirmed
        expect(dishEventRow?.deleted_at).toBeNull(); // Should not be deleted
        expect(dishEventRow?.user_id).toBe(authenticatedUserId);

        // Verify dish table state
        const { data: dishRow } = await adminClient
          .from('dish')
          .select('*')
          .eq('id', dishEvent.dish_id)
          .single();

        expect(dishRow).toBeDefined();
        expect(dishRow?.id).toBe(dishEvent.dish_id);
        expect(dishRow?.dish_name).toBe('Pasta Carbonara');
        expect(dishRow?.normalized_dish_name).toBe('pasta carbonara');
        expect(dishRow?.user_id).toBe(authenticatedUserId);

        // Verify dish_triggers table - should only have the final confirmed triggers
        const { data: dishTriggers } = await adminClient
          .from('dish_triggers')
          .select('*, triggers(trigger_name)')
          .eq('dish_event_id', dishEvent.dish_event_id);

        expect(dishTriggers).toBeDefined();
        expect(dishTriggers?.length).toBe(3); // Only the 3confirmed triggers

        const actualTriggerNames = dishTriggers?.map((dt: any) => dt.triggers.trigger_name) || [];
        expect(actualTriggerNames).toContain('gluten');
        expect(actualTriggerNames).toContain('dairy');
        expect(actualTriggerNames).toContain('fructans');
        expect(actualTriggerNames).not.toContain('processed_meat'); // Should not be present

        // Verify each trigger has correct dish_id and dish_event_id
        dishTriggers?.forEach((dt: any) => {
          expect(dt.dish_id).toBe(dishEvent.dish_id);
          expect(dt.dish_event_id).toBe(dishEvent.dish_event_id);
          expect(dt.trigger_id).toBeDefined();
        });

        // Verify predicted_dish_triggers still exist (for historical record)
        // but they should not affect the confirmed triggers
        const { data: predictedTriggers } = await adminClient
          .from('predicted_dish_triggers')
          .select('*, triggers(trigger_name)')
          .eq('dish_event_id', dishEvent.dish_event_id);

        // Predicted triggers might exist, but confirmed triggers take precedence
        expect(predictedTriggers).toBeDefined();
        // The important thing is that dish_triggers has the correct final set

        // Cleanup
        await cleanup(createResult.entry_id);
      },
      30000,
    );
  });

  /**
   * Integration tests for deletedAt (soft delete) functionality
   */
  describe('deletedAt (soft delete) functionality', () => {
    it(
      'soft deletes a dish event and filters it from queries',
      async () => {
        // Create a food entry
        const result = await createFoodEntry({
          raw_entry_text: 'Pasta with marinara sauce',
        });

        expect(result.dishes).toHaveLength(1);
        const dishEventId = result.dishes[0].dish_event_id;

        // Verify dish event exists and is not deleted
        const { data: dishEventBefore } = await adminClient
          .from('dish_events')
          .select('*')
          .eq('id', dishEventId)
          .single();

        expect(dishEventBefore).toBeDefined();
        expect(dishEventBefore?.deleted_at).toBeNull();

        // Soft delete the dish event
        await updateDishEventDeletedAt(dishEventId, new Date());

        // Verify deleted_at is set
        const { data: dishEventAfter } = await adminClient
          .from('dish_events')
          .select('*')
          .eq('id', dishEventId)
          .single();

        expect(dishEventAfter).toBeDefined();
        expect(dishEventAfter?.deleted_at).not.toBeNull();

        // Verify it's filtered out from getDishEventsByRawFoodEntryId
        const { data: dishEvents } = await adminClient
          .from('dish_events')
          .select('*')
          .eq('raw_entry_id', result.entry_id)
          .is('deleted_at', null);

        expect(dishEvents).toHaveLength(0);

        // Cleanup
        await cleanup(result.entry_id);
      },
      30000,
    );

    it(
      'filters deleted dishes from getFoodEntriesForUser',
      async () => {
        // Create and confirm a food entry
        const createResult = await createFoodEntry({
          raw_entry_text: 'Chocolate chip cookies',
        });

        await confirmFoodEntry(createResult.entry_id, {
          confirmed_dishes: [
            {
              dish_event_id: createResult.dishes[0].dish_event_id,
              dish_id: createResult.dishes[0].dish_id,
              final_dish_name: createResult.dishes[0].dish_name,
              trigger_ids: [],
            },
          ],
        });

        // Verify it appears in getFoodEntriesForUser
        const entriesBefore = await getFoodEntriesForUser();
        const foundBefore = entriesBefore.find((e) => e.dishEventId === createResult.dishes[0].dish_event_id);
        expect(foundBefore).toBeDefined();

        // Soft delete the dish event
        await updateDishEventDeletedAt(createResult.dishes[0].dish_event_id, new Date());

        // Verify it's filtered out from getFoodEntriesForUser
        const entriesAfter = await getFoodEntriesForUser();
        const foundAfter = entriesAfter.find((e) => e.dishEventId === createResult.dishes[0].dish_event_id);
        expect(foundAfter).toBeUndefined();

        // Cleanup
        await cleanup(createResult.entry_id);
      },
      30000,
    );

    it(
      'does not include deleted dishes when confirming food entry',
      async () => {
        // Create a food entry with multiple dishes
        const result = await createFoodEntry({
          raw_entry_text: 'Pizza and garlic bread',
        });

        expect(result.dishes.length).toBeGreaterThanOrEqual(1);

        // Soft delete one dish
        const dishToDelete = result.dishes[0];
        await updateDishEventDeletedAt(dishToDelete.dish_event_id, new Date());

        // Get dish events - should exclude deleted one
        const { data: activeDishEvents } = await adminClient
          .from('dish_events')
          .select('*')
          .eq('raw_entry_id', result.entry_id)
          .is('deleted_at', null);

        expect(activeDishEvents?.length).toBeLessThan(result.dishes.length);

        // Confirm only active dishes
        const activeDishes = result.dishes.filter(
          (d) => d.dish_event_id !== dishToDelete.dish_event_id,
        );

        if (activeDishes.length > 0) {
          await confirmFoodEntry(result.entry_id, {
            confirmed_dishes: activeDishes.map((d) => ({
              dish_event_id: d.dish_event_id,
              dish_id: d.dish_id,
              final_dish_name: d.dish_name,
              trigger_ids: [],
            })),
          });

          // Verify deleted dish was not confirmed
          const { data: deletedDishEvent } = await adminClient
            .from('dish_events')
            .select('confirmed_by_user, deleted_at')
            .eq('id', dishToDelete.dish_event_id)
            .single();

          expect(deletedDishEvent?.deleted_at).not.toBeNull();
          // Deleted dish should remain unconfirmed
          expect(deletedDishEvent?.confirmed_by_user).toBe(false);
        }

        // Cleanup
        await cleanup(result.entry_id);
      },
      30000,
    );
  });

  /**
   * Integration tests for confirmed_by_user functionality
   */
  describe('confirmed_by_user functionality', () => {
    it(
      'marks dish events as confirmed after confirmation',
      async () => {
        // Create a food entry
        const result = await createFoodEntry({
          raw_entry_text: 'Caesar salad',
        });

        // Verify dish events are not confirmed initially
        const { data: dishEventsBefore } = await adminClient
          .from('dish_events')
          .select('confirmed_by_user')
          .eq('raw_entry_id', result.entry_id);

        expect(dishEventsBefore).toBeDefined();
        dishEventsBefore?.forEach((de) => {
          expect(de.confirmed_by_user).toBe(false);
        });

        // Confirm the food entry
        await confirmFoodEntry(result.entry_id, {
          confirmed_dishes: result.dishes.map((d) => ({
            dish_event_id: d.dish_event_id,
            dish_id: d.dish_id,
            final_dish_name: d.dish_name,
            trigger_ids: [],
          })),
        });

        // Verify all dish events are now confirmed
        const { data: dishEventsAfter } = await adminClient
          .from('dish_events')
          .select('confirmed_by_user')
          .eq('raw_entry_id', result.entry_id);

        expect(dishEventsAfter).toBeDefined();
        dishEventsAfter?.forEach((de) => {
          expect(de.confirmed_by_user).toBe(true);
        });

        // Cleanup
        await cleanup(result.entry_id);
      },
      30000,
    );

    it(
      'only returns confirmed dishes in getFoodEntriesForUser',
      async () => {
        // Create a food entry
        const result = await createFoodEntry({
          raw_entry_text: 'Fish and chips',
        });

        // Verify it doesn't appear before confirmation
        const entriesBefore = await getFoodEntriesForUser();
        const foundBefore = entriesBefore.find((e) => e.dishEventId === result.dishes[0].dish_event_id);
        expect(foundBefore).toBeUndefined();

        // Confirm the food entry
        await confirmFoodEntry(result.entry_id, {
          confirmed_dishes: result.dishes.map((d) => ({
            dish_event_id: d.dish_event_id,
            dish_id: d.dish_id,
            final_dish_name: d.dish_name,
            trigger_ids: [],
          })),
        });

        // Verify it appears after confirmation
        const entriesAfter = await getFoodEntriesForUser();
        const foundAfter = entriesAfter.find((e) => e.dishEventId === result.dishes[0].dish_event_id);
        expect(foundAfter).toBeDefined();
        expect(foundAfter?.dishName).toBe(result.dishes[0].dish_name);

        // Cleanup
        await cleanup(result.entry_id);
      },
      30000,
    );

    it(
      'combines confirmed_by_user and deleted_at filters correctly',
      async () => {
        // Create and confirm multiple food entries
        const result1 = await createFoodEntry({
          raw_entry_text: 'Burger and fries',
        });

        const result2 = await createFoodEntry({
          raw_entry_text: 'Ice cream sundae',
        });

        // Confirm both
        await confirmFoodEntry(result1.entry_id, {
          confirmed_dishes: result1.dishes.map((d) => ({
            dish_event_id: d.dish_event_id,
            dish_id: d.dish_id,
            final_dish_name: d.dish_name,
            trigger_ids: [],
          })),
        });

        await confirmFoodEntry(result2.entry_id, {
          confirmed_dishes: result2.dishes.map((d) => ({
            dish_event_id: d.dish_event_id,
            dish_id: d.dish_id,
            final_dish_name: d.dish_name,
            trigger_ids: [],
          })),
        });

        // Verify both appear
        const entriesBefore = await getFoodEntriesForUser();
        expect(entriesBefore.length).toBeGreaterThanOrEqual(2);

        // Soft delete one
        await updateDishEventDeletedAt(result1.dishes[0].dish_event_id, new Date());

        // Verify only the non-deleted, confirmed one appears
        const entriesAfter = await getFoodEntriesForUser();
        const foundDeleted = entriesAfter.find((e) => e.dishEventId === result1.dishes[0].dish_event_id);
        const foundActive = entriesAfter.find((e) => e.dishEventId === result2.dishes[0].dish_event_id);

        expect(foundDeleted).toBeUndefined();
        expect(foundActive).toBeDefined();

        // Cleanup
        await cleanup(result1.entry_id);
        await cleanup(result2.entry_id);
      },
      30000,
    );
  });
});
