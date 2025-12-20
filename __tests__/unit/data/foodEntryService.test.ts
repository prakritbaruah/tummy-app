/**
 * Unit tests for foodEntryService.ts
 * 
 * These tests mock all dependencies (database, LLM stubs, helper functions) to test
 * the service layer logic in isolation. The service layer orchestrates multiple
 * repository calls and business logic to create and confirm food entries.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirmFoodEntry, createFoodEntry } from '@/data/foodEntryService';
import * as dishHelpers from '@/data/dishHelpers';
import * as foodEntryRepo from '@/data/foodEntryRepo';
import * as llmStubs from '@/data/llmStubs';
import * as utils from '@/data/utils';
import { supabase } from '@/lib/supabase';
import { DishRow, DishEventRow } from '@/types/supabase';

// Store original Supabase methods to restore after each test
const originalFrom = supabase.from;
const originalAuth = supabase.auth;

// Mock user for authentication
const mockUser = { id: 'test-user-123' };

// Helper to mock Supabase auth
const mockAuth = () => {
  (supabase as any).auth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    }),
  };
};

// Clean up mocks after each test to ensure test isolation
afterEach(() => {
  (supabase as any).from = originalFrom;
  (supabase as any).auth = originalAuth;
  vi.restoreAllMocks();
});

describe('foodEntryService', () => {
  /**
   * Tests for createFoodEntry - the main flow for creating a new food entry
   * 
   * Flow:
   * 1. Create raw entry from user text
   * 2. Extract dishes using LLM
   * 3. For each dish: create predicted dish, find/create actual dish, create dish event
   * 4. Predict triggers (LLM for new dishes, copy from recent for existing dishes)
   * 5. Create predicted dish triggers
   * 6. Return entry with dishes and predicted triggers
   */
  describe('createFoodEntry', () => {
    it('creates a food entry with new dishes and predicts triggers', async () => {
      // Setup: Mock authentication
      mockAuth();
      vi.spyOn(utils, 'getAuthenticatedUserId').mockResolvedValue(mockUser.id);
      
      // Step 1: Mock raw entry creation
      vi.spyOn(foodEntryRepo, 'createRawFoodEntry').mockResolvedValue({
        id: 'raw-entry-1',
        userId: mockUser.id,
        rawEntryText: 'Chocolate croissant',
        createdAt: Date.now(),
      });

      vi.spyOn(llmStubs, 'llmExtractDishes').mockResolvedValue([
        {
          dish_fragment_text: 'Chocolate croissant',
          dish_name_suggestion: 'Chocolate Croissant',
        },
      ]);

      vi.spyOn(foodEntryRepo, 'createPredictedDish').mockResolvedValue({
        id: 'predicted-dish-1',
        rawEntryId: 'raw-entry-1',
        dishFragmentText: 'Chocolate croissant',
        dishNameSuggestion: 'Chocolate Croissant',
        modelVersion: 'v1-stub',
        promptVersion: 'v1-stub',
        createdAt: Date.now(),
      });

      // Step 3b: Mock dish find/create (returns new dish in this test)
      vi.spyOn(dishHelpers, 'findOrCreateDishForUser').mockResolvedValue({
        id: 'dish-1',
        userId: mockUser.id,
        dishName: 'Chocolate Croissant',
        normalizedDishName: 'chocolate croissant',
        dishEmbeddingId: null,
        createdAt: Date.now(),
      });

      // Step 3c: Mock check for existing triggers (empty = new dish)
      vi.spyOn(dishHelpers, 'getMostRecentDishTriggers').mockResolvedValue([]);

      // Step 3d: Mock dish event creation
      vi.spyOn(foodEntryRepo, 'createDishEvent').mockResolvedValue({
        id: 'dish-event-1',
        userId: mockUser.id,
        dishId: 'dish-1',
        predictedDishId: 'predicted-dish-1',
        rawEntryId: 'raw-entry-1',
        createdAt: Date.now(),
      });

      // Step 4a: Mock LLM trigger prediction (for new dishes)
      vi.spyOn(llmStubs, 'llmPredictTriggers').mockResolvedValue(['gluten']);

      // Step 4b: Mock trigger lookup by name
      vi.spyOn(foodEntryRepo, 'getTriggersByNames').mockResolvedValue([
        {
          id: 'trigger-1',
          triggerName: 'gluten',
          createdAt: Date.now(),
        },
      ]);

      // Step 4c: Mock predicted trigger creation
      vi.spyOn(foodEntryRepo, 'createPredictedDishTrigger').mockResolvedValue({
        id: 'predicted-trigger-1',
        dishId: 'dish-1',
        dishEventId: 'dish-event-1',
        triggerId: 'trigger-1',
        modelVersion: 'v1-stub',
        promptVersion: 'v1-stub',
        createdAt: Date.now(),
      });

      // Step 5: Mock retrieval of predicted triggers for response building
      vi.spyOn(foodEntryRepo, 'getPredictedTriggersByDishEventIds').mockResolvedValue([
        {
          id: 'predicted-trigger-1',
          dishId: 'dish-1',
          dishEventId: 'dish-event-1',
          triggerId: 'trigger-1',
          modelVersion: 'v1-stub',
          promptVersion: 'v1-stub',
          createdAt: Date.now(),
        },
      ]);

      // Execute the service function
      const result = await createFoodEntry({
        raw_entry_text: 'Chocolate croissant',
      });

      // Verify the response structure and data
      expect(result.entry_id).toBe('raw-entry-1');
      expect(result.dishes).toHaveLength(1);
      expect(result.dishes[0].dish_name).toBe('Chocolate Croissant');
      expect(result.dishes[0].predicted_triggers).toHaveLength(1);
      expect(result.dishes[0].predicted_triggers?.[0].trigger_name).toBe('gluten');
    });

    /**
     * Tests the optimization: when a dish already exists and has confirmed triggers,
     * we copy those triggers instead of using LLM prediction (faster and more accurate)
     */
    /**
     * Tests the optimization: when a dish already exists and has confirmed triggers,
     * we copy those triggers instead of using LLM prediction (faster and more accurate)
     */
    it('creates a food entry with existing dish and copies triggers', async () => {
      mockAuth();
      vi.spyOn(utils, 'getAuthenticatedUserId').mockResolvedValue(mockUser.id);
      vi.spyOn(foodEntryRepo, 'createRawFoodEntry').mockResolvedValue({
        id: 'raw-entry-1',
        userId: mockUser.id,
        rawEntryText: 'Chocolate croissant',
        createdAt: Date.now(),
      });

      // Step 2: Mock LLM dish extraction
      vi.spyOn(llmStubs, 'llmExtractDishes').mockResolvedValue([
        {
          dish_fragment_text: 'Chocolate croissant',
          dish_name_suggestion: 'Chocolate Croissant',
        },
      ]);

      vi.spyOn(foodEntryRepo, 'createPredictedDish').mockResolvedValue({
        id: 'predicted-dish-1',
        rawEntryId: 'raw-entry-1',
        dishFragmentText: 'Chocolate croissant',
        dishNameSuggestion: 'Chocolate Croissant',
        modelVersion: 'v1-stub',
        promptVersion: 'v1-stub',
        createdAt: Date.now(),
      });

      vi.spyOn(dishHelpers, 'findOrCreateDishForUser').mockResolvedValue({
        id: 'dish-1',
        userId: mockUser.id,
        dishName: 'Chocolate Croissant',
        normalizedDishName: 'chocolate croissant',
        dishEmbeddingId: null,
        createdAt: Date.now(),
      });

      // Key difference: existing dish has confirmed triggers from previous entries
      // This means we should copy triggers instead of using LLM
      vi.spyOn(dishHelpers, 'getMostRecentDishTriggers').mockResolvedValue([
        {
          id: 'trigger-1',
          triggerName: 'gluten',
          createdAt: Date.now(),
        },
        {
          id: 'trigger-2',
          triggerName: 'dairy',
          createdAt: Date.now(),
        },
      ]);

      vi.spyOn(foodEntryRepo, 'createDishEvent').mockResolvedValue({
        id: 'dish-event-1',
        userId: mockUser.id,
        dishId: 'dish-1',
        predictedDishId: 'predicted-dish-1',
        rawEntryId: 'raw-entry-1',
        createdAt: Date.now(),
      });

      vi.spyOn(foodEntryRepo, 'getTriggersByNames').mockResolvedValue([
        {
          id: 'trigger-1',
          triggerName: 'gluten',
          createdAt: Date.now(),
        },
        {
          id: 'trigger-2',
          triggerName: 'dairy',
          createdAt: Date.now(),
        },
      ]);

      vi.spyOn(foodEntryRepo, 'createPredictedDishTrigger').mockResolvedValue({
        id: 'predicted-trigger-1',
        dishId: 'dish-1',
        dishEventId: 'dish-event-1',
        triggerId: 'trigger-1',
        modelVersion: 'v1-stub',
        promptVersion: 'v1-stub',
        createdAt: Date.now(),
      });

      vi.spyOn(foodEntryRepo, 'getPredictedTriggersByDishEventIds').mockResolvedValue([
        {
          id: 'predicted-trigger-1',
          dishId: 'dish-1',
          dishEventId: 'dish-event-1',
          triggerId: 'trigger-1',
          modelVersion: 'v1-stub',
          promptVersion: 'v1-stub',
          createdAt: Date.now(),
        },
        {
          id: 'predicted-trigger-2',
          dishId: 'dish-1',
          dishEventId: 'dish-event-1',
          triggerId: 'trigger-2',
          modelVersion: 'v1-stub',
          promptVersion: 'v1-stub',
          createdAt: Date.now(),
        },
      ]);

      // Spy on LLM to verify it's NOT called for existing dishes
      const llmPredictSpy = vi.spyOn(llmStubs, 'llmPredictTriggers');

      const result = await createFoodEntry({
        raw_entry_text: 'Chocolate croissant',
      });

      // Verify triggers were copied (not predicted)
      expect(result.dishes[0].predicted_triggers).toHaveLength(2);
      // Critical assertion: LLM should NOT be called for existing dishes
      expect(llmPredictSpy).not.toHaveBeenCalled();
    });

    it('handles multiple dishes in one entry', async () => {
      mockAuth();
      vi.spyOn(utils, 'getAuthenticatedUserId').mockResolvedValue(mockUser.id);
      vi.spyOn(foodEntryRepo, 'createRawFoodEntry').mockResolvedValue({
        id: 'raw-entry-1',
        userId: mockUser.id,
        rawEntryText: 'Chocolate croissant and matcha latte',
        createdAt: Date.now(),
      });

      vi.spyOn(llmStubs, 'llmExtractDishes').mockResolvedValue([
        {
          dish_fragment_text: 'Chocolate Croissant',
          dish_name_suggestion: 'Chocolate Croissant',
        },
        {
          dish_fragment_text: 'Matcha Latte',
          dish_name_suggestion: 'Matcha Latte',
        },
      ]);

      vi.spyOn(foodEntryRepo, 'createPredictedDish')
        .mockResolvedValueOnce({
          id: 'predicted-dish-1',
          rawEntryId: 'raw-entry-1',
          dishFragmentText: 'Chocolate Croissant',
          dishNameSuggestion: 'Chocolate Croissant',
          modelVersion: 'v1-stub',
          promptVersion: 'v1-stub',
          createdAt: Date.now(),
        })
        .mockResolvedValueOnce({
          id: 'predicted-dish-2',
          rawEntryId: 'raw-entry-1',
          dishFragmentText: 'Matcha Latte',
          dishNameSuggestion: 'Matcha Latte',
          modelVersion: 'v1-stub',
          promptVersion: 'v1-stub',
          createdAt: Date.now(),
        });

      vi.spyOn(dishHelpers, 'findOrCreateDishForUser')
        .mockResolvedValueOnce({
          id: 'dish-1',
          userId: mockUser.id,
          dishName: 'Chocolate Croissant',
          normalizedDishName: 'chocolate croissant',
          dishEmbeddingId: null,
          createdAt: Date.now(),
        })
        .mockResolvedValueOnce({
          id: 'dish-2',
          userId: mockUser.id,
          dishName: 'Matcha Latte',
          normalizedDishName: 'matcha latte',
          dishEmbeddingId: null,
          createdAt: Date.now(),
        });

      vi.spyOn(dishHelpers, 'getMostRecentDishTriggers').mockResolvedValue([]);

      vi.spyOn(foodEntryRepo, 'createDishEvent')
        .mockResolvedValueOnce({
          id: 'dish-event-1',
          userId: mockUser.id,
          dishId: 'dish-1',
          predictedDishId: 'predicted-dish-1',
          rawEntryId: 'raw-entry-1',
          createdAt: Date.now(),
        })
        .mockResolvedValueOnce({
          id: 'dish-event-2',
          userId: mockUser.id,
          dishId: 'dish-2',
          predictedDishId: 'predicted-dish-2',
          rawEntryId: 'raw-entry-1',
          createdAt: Date.now(),
        });

      vi.spyOn(llmStubs, 'llmPredictTriggers')
        .mockResolvedValueOnce(['gluten'])
        .mockResolvedValueOnce(['caffeine']);

      vi.spyOn(foodEntryRepo, 'getTriggersByNames').mockResolvedValue([
        {
          id: 'trigger-1',
          triggerName: 'gluten',
          createdAt: Date.now(),
        },
        {
          id: 'trigger-2',
          triggerName: 'caffeine',
          createdAt: Date.now(),
        },
      ]);

      vi.spyOn(foodEntryRepo, 'createPredictedDishTrigger').mockResolvedValue({
        id: 'predicted-trigger-1',
        dishId: 'dish-1',
        dishEventId: 'dish-event-1',
        triggerId: 'trigger-1',
        modelVersion: 'v1-stub',
        promptVersion: 'v1-stub',
        createdAt: Date.now(),
      });

      vi.spyOn(foodEntryRepo, 'getPredictedTriggersByDishEventIds').mockResolvedValue([
        {
          id: 'predicted-trigger-1',
          dishId: 'dish-1',
          dishEventId: 'dish-event-1',
          triggerId: 'trigger-1',
          modelVersion: 'v1-stub',
          promptVersion: 'v1-stub',
          createdAt: Date.now(),
        },
        {
          id: 'predicted-trigger-2',
          dishId: 'dish-2',
          dishEventId: 'dish-event-2',
          triggerId: 'trigger-2',
          modelVersion: 'v1-stub',
          promptVersion: 'v1-stub',
          createdAt: Date.now(),
        },
      ]);

      const result = await createFoodEntry({
        raw_entry_text: 'Chocolate croissant and matcha latte',
      });

      expect(result.dishes).toHaveLength(2);
      expect(result.dishes[0].dish_name).toBe('Chocolate Croissant');
      expect(result.dishes[1].dish_name).toBe('Matcha Latte');
    });
  });

  /**
   * Tests for confirmFoodEntry - the flow for confirming/updating a food entry
   * 
   * Flow:
   * 1. Get dish events for the raw entry
   * 2. For each confirmed dish:
   *    - Verify dish exists and belongs to user
   *    - Update dish name if changed (with conflict checking)
   *    - Upsert confirmed triggers
   * 3. Build response with final dish names and confirmed triggers
   */
  describe('confirmFoodEntry', () => {
    it('confirms a food entry with dish name updates and triggers', async () => {
      mockAuth();
      vi.spyOn(utils, 'getAuthenticatedUserId').mockResolvedValue(mockUser.id);

      // Mock dish event lookup
      const dishEvent: DishEventRow = {
        id: 'dish-event-1',
        user_id: mockUser.id,
        dish_id: 'dish-1',
        predicted_dish_id: 'predicted-dish-1',
        raw_entry_id: 'raw-entry-1',
        created_at: new Date().toISOString(),
      };

      vi.spyOn(foodEntryRepo, 'getDishEventsByRawFoodEntryId').mockResolvedValue([
        {
          id: 'dish-event-1',
          userId: mockUser.id,
          dishId: 'dish-1',
          predictedDishId: 'predicted-dish-1',
          rawEntryId: 'raw-entry-1',
          createdAt: Date.now(),
        },
      ]);

      // Mock Supabase direct query for dish lookup (used in confirmFoodEntry)
      // This simulates: supabase.from('dish').select('*').eq('id', ...).single()
      const dishRow: DishRow = {
        id: 'dish-1',
        user_id: mockUser.id,
        dish_name: 'Chocolate Croissant',
        normalized_dish_name: 'chocolate croissant',
        dish_embedding_id: null,
        created_at: new Date().toISOString(),
      };

      // Track call count to return different responses for different queries
      let callCount = 0;
      const single = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: get the dish by ID to verify it exists
          return Promise.resolve({ data: dishRow, error: null });
        }
        // Second call: check if another dish with the new normalized name exists
        // (to prevent name conflicts)
        return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'not found' } });
      });

      const eq2 = vi.fn().mockReturnValue({ single });
      const eq1 = vi.fn().mockReturnValue({ eq: eq2, single });
      const select = vi.fn().mockReturnValue({ eq: eq1, single });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      // Mock dish name update (will be called since name changed)
      vi.spyOn(foodEntryRepo, 'updateDish').mockResolvedValue({
        id: 'dish-1',
        userId: mockUser.id,
        dishName: 'Updated Chocolate Croissant',
        normalizedDishName: 'updated chocolate croissant',
        dishEmbeddingId: null,
        createdAt: Date.now(),
      });

      // Mock trigger upsert (deletes old triggers, inserts new ones)
      vi.spyOn(dishHelpers, 'upsertDishTriggersForEvent').mockResolvedValue(undefined);

      vi.spyOn(foodEntryRepo, 'getConfirmedTriggersByDishEventIds').mockResolvedValue([
        {
          id: 'dish-trigger-1',
          dishId: 'dish-1',
          dishEventId: 'dish-event-1',
          triggerId: 'trigger-1',
          createdAt: Date.now(),
        },
      ]);

      vi.spyOn(foodEntryRepo, 'getTriggerById').mockResolvedValue({
        id: 'trigger-1',
        triggerName: 'gluten',
        createdAt: Date.now(),
      });

      const result = await confirmFoodEntry('raw-entry-1', {
        confirmed_dishes: [
          {
            dish_event_id: 'dish-event-1',
            dish_id: 'dish-1',
            final_dish_name: 'Updated Chocolate Croissant',
            trigger_ids: ['trigger-1'],
          },
        ],
      });

      expect(result.entry_id).toBe('raw-entry-1');
      expect(result.dishes).toHaveLength(1);
      expect(result.dishes[0].dish_name).toBe('Updated Chocolate Croissant');
      expect(result.dishes[0].triggers).toHaveLength(1);
      expect(result.dishes[0].triggers?.[0].trigger_name).toBe('gluten');
    });

    /**
     * Tests optimization: skip database update when dish name hasn't changed
     * This avoids unnecessary database writes
     */
    it('does not update dish name when unchanged', async () => {
      mockAuth();
      vi.spyOn(utils, 'getAuthenticatedUserId').mockResolvedValue(mockUser.id);

      vi.spyOn(foodEntryRepo, 'getDishEventsByRawFoodEntryId').mockResolvedValue([
        {
          id: 'dish-event-1',
          userId: mockUser.id,
          dishId: 'dish-1',
          predictedDishId: 'predicted-dish-1',
          rawEntryId: 'raw-entry-1',
          createdAt: Date.now(),
        },
      ]);

      const dishRow: DishRow = {
        id: 'dish-1',
        user_id: mockUser.id,
        dish_name: 'Chocolate Croissant',
        normalized_dish_name: 'chocolate croissant',
        dish_embedding_id: null,
        created_at: new Date().toISOString(),
      };

      const single = vi.fn().mockReturnValue(Promise.resolve({ data: dishRow, error: null }));
      const eq2 = vi.fn().mockReturnValue({ single });
      const eq1 = vi.fn().mockReturnValue({ eq: eq2, single });
      const select = vi.fn().mockReturnValue({ eq: eq1, single });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      vi.spyOn(dishHelpers, 'upsertDishTriggersForEvent').mockResolvedValue(undefined);

      vi.spyOn(foodEntryRepo, 'getConfirmedTriggersByDishEventIds').mockResolvedValue([
        {
          id: 'dish-trigger-1',
          dishId: 'dish-1',
          dishEventId: 'dish-event-1',
          triggerId: 'trigger-1',
          createdAt: Date.now(),
        },
      ]);

      vi.spyOn(foodEntryRepo, 'getTriggerById').mockResolvedValue({
        id: 'trigger-1',
        triggerName: 'gluten',
        createdAt: Date.now(),
      });

      // Spy on updateDish to verify it's NOT called when name is unchanged
      const updateDishSpy = vi.spyOn(foodEntryRepo, 'updateDish');

      const result = await confirmFoodEntry('raw-entry-1', {
        confirmed_dishes: [
          {
            dish_event_id: 'dish-event-1',
            dish_id: 'dish-1',
            final_dish_name: 'Chocolate Croissant', // Same as existing name
            trigger_ids: ['trigger-1'],
          },
        ],
      });

      // Critical assertion: updateDish should NOT be called when name is unchanged
      expect(updateDishSpy).not.toHaveBeenCalled();
      expect(result.dishes[0].dish_name).toBe('Chocolate Croissant');
    });

    it('throws error when dish event not found', async () => {
      mockAuth();
      vi.spyOn(utils, 'getAuthenticatedUserId').mockResolvedValue(mockUser.id);

      vi.spyOn(foodEntryRepo, 'getDishEventsByRawFoodEntryId').mockResolvedValue([]);

      await expect(
        confirmFoodEntry('raw-entry-1', {
          confirmed_dishes: [
            {
              dish_event_id: 'nonexistent',
              dish_id: 'dish-1',
              final_dish_name: 'Test',
              trigger_ids: [],
            },
          ],
        }),
      ).rejects.toThrow('Dish event not found: nonexistent');
    });

    it('throws error when dish not found', async () => {
      mockAuth();
      vi.spyOn(utils, 'getAuthenticatedUserId').mockResolvedValue(mockUser.id);

      vi.spyOn(foodEntryRepo, 'getDishEventsByRawFoodEntryId').mockResolvedValue([
        {
          id: 'dish-event-1',
          userId: mockUser.id,
          dishId: 'dish-1',
          predictedDishId: 'predicted-dish-1',
          rawEntryId: 'raw-entry-1',
          createdAt: Date.now(),
        },
      ]);

      const single = vi.fn().mockReturnValue(
        Promise.resolve({ data: null, error: { message: 'not found' } }),
      );
      const eq2 = vi.fn().mockReturnValue({ single });
      const eq1 = vi.fn().mockReturnValue({ eq: eq2, single });
      const select = vi.fn().mockReturnValue({ eq: eq1, single });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      await expect(
        confirmFoodEntry('raw-entry-1', {
          confirmed_dishes: [
            {
              dish_event_id: 'dish-event-1',
              dish_id: 'dish-1',
              final_dish_name: 'Test',
              trigger_ids: [],
            },
          ],
        }),
      ).rejects.toThrow('Dish not found: not found');
    });

    it('throws error when dish does not belong to user', async () => {
      mockAuth();
      vi.spyOn(utils, 'getAuthenticatedUserId').mockResolvedValue(mockUser.id);

      vi.spyOn(foodEntryRepo, 'getDishEventsByRawFoodEntryId').mockResolvedValue([
        {
          id: 'dish-event-1',
          userId: mockUser.id,
          dishId: 'dish-1',
          predictedDishId: 'predicted-dish-1',
          rawEntryId: 'raw-entry-1',
          createdAt: Date.now(),
        },
      ]);

      const dishRow: DishRow = {
        id: 'dish-1',
        user_id: 'other-user', // Different user
        dish_name: 'Chocolate Croissant',
        normalized_dish_name: 'chocolate croissant',
        dish_embedding_id: null,
        created_at: new Date().toISOString(),
      };

      const single = vi.fn().mockReturnValue(Promise.resolve({ data: dishRow, error: null }));
      const eq2 = vi.fn().mockReturnValue({ single });
      const eq1 = vi.fn().mockReturnValue({ eq: eq2, single });
      const select = vi.fn().mockReturnValue({ eq: eq1, single });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      await expect(
        confirmFoodEntry('raw-entry-1', {
          confirmed_dishes: [
            {
              dish_event_id: 'dish-event-1',
              dish_id: 'dish-1',
              final_dish_name: 'Test',
              trigger_ids: [],
            },
          ],
        }),
      ).rejects.toThrow('Dish does not belong to the user');
    });

    /**
     * Tests validation: prevent updating dish name to one that already exists
     * This prevents duplicate dishes with the same normalized name
     */
    it('throws error when dish name update would conflict with existing dish', async () => {
      mockAuth();
      vi.spyOn(utils, 'getAuthenticatedUserId').mockResolvedValue(mockUser.id);

      vi.spyOn(foodEntryRepo, 'getDishEventsByRawFoodEntryId').mockResolvedValue([
        {
          id: 'dish-event-1',
          userId: mockUser.id,
          dishId: 'dish-1',
          predictedDishId: 'predicted-dish-1',
          rawEntryId: 'raw-entry-1',
          createdAt: Date.now(),
        },
      ]);

      const dishRow: DishRow = {
        id: 'dish-1',
        user_id: mockUser.id,
        dish_name: 'Chocolate Croissant',
        normalized_dish_name: 'chocolate croissant',
        dish_embedding_id: null,
        created_at: new Date().toISOString(),
      };

      let callCount = 0;
      const single = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: get the dish we're trying to update
          return Promise.resolve({ data: dishRow, error: null });
        }
        // Second call: check if another dish with the new normalized name exists
        // Returns a different dish ID, indicating a conflict
        return Promise.resolve({
          data: { id: 'dish-2' }, // Different dish ID = conflict!
          error: null,
        });
      });

      const eq2 = vi.fn().mockReturnValue({ single });
      const eq1 = vi.fn().mockReturnValue({ eq: eq2, single });
      const select = vi.fn().mockReturnValue({ eq: eq1, single });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      await expect(
        confirmFoodEntry('raw-entry-1', {
          confirmed_dishes: [
            {
              dish_event_id: 'dish-event-1',
              dish_id: 'dish-1',
              final_dish_name: 'Existing Dish Name',
              trigger_ids: [],
            },
          ],
        }),
      ).rejects.toThrow('Cannot update dish name: a dish with normalized name');
    });

    /**
     * Tests handling of multiple dishes in a single entry
     * Verifies that each dish is processed independently
     */
    it('handles multiple confirmed dishes', async () => {
      mockAuth();
      vi.spyOn(utils, 'getAuthenticatedUserId').mockResolvedValue(mockUser.id);

      // Mock two dish events for the same raw entry
      vi.spyOn(foodEntryRepo, 'getDishEventsByRawFoodEntryId').mockResolvedValue([
        {
          id: 'dish-event-1',
          userId: mockUser.id,
          dishId: 'dish-1',
          predictedDishId: 'predicted-dish-1',
          rawEntryId: 'raw-entry-1',
          createdAt: Date.now(),
        },
        {
          id: 'dish-event-2',
          userId: mockUser.id,
          dishId: 'dish-2',
          predictedDishId: 'predicted-dish-2',
          rawEntryId: 'raw-entry-1',
          createdAt: Date.now(),
        },
      ]);

      const dishRow1: DishRow = {
        id: 'dish-1',
        user_id: mockUser.id,
        dish_name: 'Chocolate Croissant',
        normalized_dish_name: 'chocolate croissant',
        dish_embedding_id: null,
        created_at: new Date().toISOString(),
      };

      const dishRow2: DishRow = {
        id: 'dish-2',
        user_id: mockUser.id,
        dish_name: 'Matcha Latte',
        normalized_dish_name: 'matcha latte',
        dish_embedding_id: null,
        created_at: new Date().toISOString(),
      };

      // Track call count to return correct dish for each query
      let callCount = 0;
      const single = vi.fn().mockImplementation(() => {
        callCount++;
        // First dish lookup (callCount 1)
        if (callCount === 1) {
          return Promise.resolve({
            data: dishRow1,
            error: null,
          });
        }
        // Second dish lookup (callCount 2)
        if (callCount === 2) {
          return Promise.resolve({
            data: dishRow2,
            error: null,
          });
        }
        // If names were changed, we'd check for conflicts (callCount 3, 4, etc.)
        // In this test, names don't change, so these calls won't happen
        return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'not found' } });
      });

      const eq2 = vi.fn().mockReturnValue({ single });
      const eq1 = vi.fn().mockReturnValue({ eq: eq2, single });
      const select = vi.fn().mockReturnValue({ eq: eq1, single });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      vi.spyOn(dishHelpers, 'upsertDishTriggersForEvent').mockResolvedValue(undefined);

      vi.spyOn(foodEntryRepo, 'getConfirmedTriggersByDishEventIds').mockResolvedValue([
        {
          id: 'dish-trigger-1',
          dishId: 'dish-1',
          dishEventId: 'dish-event-1',
          triggerId: 'trigger-1',
          createdAt: Date.now(),
        },
        {
          id: 'dish-trigger-2',
          dishId: 'dish-2',
          dishEventId: 'dish-event-2',
          triggerId: 'trigger-2',
          createdAt: Date.now(),
        },
      ]);

      vi.spyOn(foodEntryRepo, 'getTriggerById')
        .mockResolvedValueOnce({
          id: 'trigger-1',
          triggerName: 'gluten',
          createdAt: Date.now(),
        })
        .mockResolvedValueOnce({
          id: 'trigger-2',
          triggerName: 'caffeine',
          createdAt: Date.now(),
        });

      const result = await confirmFoodEntry('raw-entry-1', {
        confirmed_dishes: [
          {
            dish_event_id: 'dish-event-1',
            dish_id: 'dish-1',
            final_dish_name: 'Chocolate Croissant',
            trigger_ids: ['trigger-1'],
          },
          {
            dish_event_id: 'dish-event-2',
            dish_id: 'dish-2',
            final_dish_name: 'Matcha Latte',
            trigger_ids: ['trigger-2'],
          },
        ],
      });

      expect(result.dishes).toHaveLength(2);
      expect(result.dishes[0].dish_name).toBe('Chocolate Croissant');
      expect(result.dishes[1].dish_name).toBe('Matcha Latte');
    });
  });
});
