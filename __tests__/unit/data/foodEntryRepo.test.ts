/**
 * Unit tests for foodEntryRepo.ts
 * 
 * These tests mock Supabase database responses to test repository functions in isolation.
 * Each test mocks the Supabase query builder chain (from().select().eq().single(), etc.)
 * to simulate database operations without requiring a real database connection.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDish,
  createDishEvent,
  createDishTrigger,
  createPredictedDish,
  createPredictedDishTrigger,
  createRawFoodEntry,
  deleteDishTriggersForEvent,
  findDishByNormalizedName,
  getConfirmedTriggersByDishEventIds,
  getDishEventsByRawFoodEntryId,
  getPredictedTriggersByDishEventIds,
  getTriggerById,
  getTriggersByNames,
  updateDish,
} from '../../../src/data/foodEntryRepo';
import { supabase } from '../../../src/lib/supabase';
import {
  DishEventRow,
  DishRow,
  DishTriggerRow,
  PredictedDishRow,
  PredictedDishTriggerRow,
  RawFoodEntryRow,
  TriggerRow,
} from '../../../src/types/supabase';

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

describe('foodEntryRepo', () => {
  /**
   * Tests for creating raw food entries
   * Raw entries are the initial text input from users before dish extraction
   */
  describe('createRawFoodEntry', () => {
    it('creates a raw food entry and returns mapped data', async () => {
      // Mock database row that would be returned from Supabase
      const row: RawFoodEntryRow = {
        id: 'raw-entry-1',
        user_id: mockUser.id,
        raw_entry_text: 'Chocolate croissant and matcha latte',
        created_at: new Date().toISOString(),
      };

      // Mock Supabase query chain: from('raw_entry').insert().select().single()
      const single = vi.fn().mockReturnValue(Promise.resolve({ data: row, error: null }));
      const select = vi.fn().mockReturnValue({ single });
      const insert = vi.fn().mockReturnValue({ select });
      (supabase as any).from = vi.fn().mockReturnValue({ insert });

      // Execute the function
      const result = await createRawFoodEntry(mockUser.id, 'Chocolate croissant and matcha latte');

      // Verify database operations were called
      expect(insert).toHaveBeenCalled();
      expect(single).toHaveBeenCalled();
      // Verify the result is correctly mapped from database row to domain object
      expect(result.id).toBe('raw-entry-1');
      expect(result.userId).toBe(mockUser.id);
      expect(result.rawEntryText).toBe('Chocolate croissant and matcha latte');
    });

    it('throws error when insert fails', async () => {
      // Mock database error response
      const single = vi.fn().mockReturnValue(
        Promise.resolve({ data: null, error: { message: 'insert failed' } }),
      );
      const select = vi.fn().mockReturnValue({ single });
      const insert = vi.fn().mockReturnValue({ select });
      (supabase as any).from = vi.fn().mockReturnValue({ insert });

      // Verify error is properly propagated
      await expect(
        createRawFoodEntry(mockUser.id, 'Test entry'),
      ).rejects.toThrow('insert failed');
    });

    it('throws error when no data is returned', async () => {
      // Mock case where insert succeeds but returns no data (edge case)
      const single = vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null }));
      const select = vi.fn().mockReturnValue({ single });
      const insert = vi.fn().mockReturnValue({ select });
      (supabase as any).from = vi.fn().mockReturnValue({ insert });

      // Verify appropriate error is thrown
      await expect(createRawFoodEntry(mockUser.id, 'Test entry')).rejects.toThrow(
        'Failed to create raw food entry',
      );
    });
  });

  /**
   * Tests for creating predicted dishes
   * Predicted dishes are extracted from raw text by LLM and stored before user confirmation
   */
  describe('createPredictedDish', () => {
    it('creates a predicted dish and returns mapped data', async () => {
      const row: PredictedDishRow = {
        id: 'predicted-dish-1',
        raw_entry_id: 'raw-entry-1',
        dish_fragment_text: 'Chocolate Croissant',
        dish_name_suggestion: 'Chocolate Croissant',
        model_version: 'v1-stub',
        prompt_version: 'v1-stub',
        created_at: new Date().toISOString(),
      };

      const single = vi.fn().mockReturnValue(Promise.resolve({ data: row, error: null }));
      const select = vi.fn().mockReturnValue({ single });
      const insert = vi.fn().mockReturnValue({ select });
      (supabase as any).from = vi.fn().mockReturnValue({ insert });

      const result = await createPredictedDish({
        rawEntryId: 'raw-entry-1',
        dishFragmentText: 'Chocolate Croissant',
        dishNameSuggestion: 'Chocolate Croissant',
        modelVersion: 'v1-stub',
        promptVersion: 'v1-stub',
      });

      expect(insert).toHaveBeenCalled();
      expect(result.id).toBe('predicted-dish-1');
      expect(result.rawEntryId).toBe('raw-entry-1');
      expect(result.dishNameSuggestion).toBe('Chocolate Croissant');
    });

    it('throws error when insert fails', async () => {
      const single = vi.fn().mockReturnValue(
        Promise.resolve({ data: null, error: { message: 'insert failed' } }),
      );
      const select = vi.fn().mockReturnValue({ single });
      const insert = vi.fn().mockReturnValue({ select });
      (supabase as any).from = vi.fn().mockReturnValue({ insert });

      await expect(
        createPredictedDish({
          rawEntryId: 'raw-entry-1',
          dishFragmentText: 'Test',
          dishNameSuggestion: 'Test',
          modelVersion: 'v1',
          promptVersion: 'v1',
        }),
      ).rejects.toThrow('insert failed');
    });
  });

  describe('createDish', () => {
    it('creates a dish and returns mapped data', async () => {
      const row: DishRow = {
        id: 'dish-1',
        user_id: mockUser.id,
        dish_name: 'Chocolate Croissant',
        normalized_dish_name: 'chocolate croissant',
        dish_embedding_id: null,
        created_at: new Date().toISOString(),
      };

      const single = vi.fn().mockReturnValue(Promise.resolve({ data: row, error: null }));
      const select = vi.fn().mockReturnValue({ single });
      const insert = vi.fn().mockReturnValue({ select });
      (supabase as any).from = vi.fn().mockReturnValue({ insert });

      const result = await createDish({
        userId: mockUser.id,
        dishName: 'Chocolate Croissant',
        normalizedDishName: 'chocolate croissant',
        dishEmbeddingId: null,
      });

      expect(insert).toHaveBeenCalled();
      expect(result.id).toBe('dish-1');
      expect(result.dishName).toBe('Chocolate Croissant');
      expect(result.normalizedDishName).toBe('chocolate croissant');
    });

    it('throws error when insert fails', async () => {
      const single = vi.fn().mockReturnValue(
        Promise.resolve({ data: null, error: { message: 'insert failed' } }),
      );
      const select = vi.fn().mockReturnValue({ single });
      const insert = vi.fn().mockReturnValue({ select });
      (supabase as any).from = vi.fn().mockReturnValue({ insert });

      await expect(
        createDish({
          userId: mockUser.id,
          dishName: 'Test',
          normalizedDishName: 'test',
          dishEmbeddingId: null,
        }),
      ).rejects.toThrow('insert failed');
    });
  });

  /**
   * Tests for finding dishes by normalized name
   * Normalized names are used for matching dishes regardless of capitalization or formatting
   */
  describe('findDishByNormalizedName', () => {
    it('returns dish when found', async () => {
      const row: DishRow = {
        id: 'dish-1',
        user_id: mockUser.id,
        dish_name: 'Chocolate Croissant',
        normalized_dish_name: 'chocolate croissant',
        dish_embedding_id: null,
        created_at: new Date().toISOString(),
      };

      // Mock query chain: from('dish').select().eq('user_id').eq('normalized_dish_name').single()
      const single = vi.fn().mockReturnValue(Promise.resolve({ data: row, error: null }));
      const eq2 = vi.fn().mockReturnValue({ single });
      const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
      const select = vi.fn().mockReturnValue({ eq: eq1 });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      const result = await findDishByNormalizedName(mockUser.id, 'chocolate croissant');

      // Verify query filters were applied correctly
      expect(eq1).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(eq2).toHaveBeenCalledWith('normalized_dish_name', 'chocolate croissant');
      // Verify result is correctly mapped
      expect(result).not.toBeNull();
      expect(result?.id).toBe('dish-1');
    });

    it('returns null when not found', async () => {
      // PGRST116 is Supabase's "not found" error code - this is expected behavior
      const single = vi.fn().mockReturnValue(
        Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
      );
      const eq2 = vi.fn().mockReturnValue({ single });
      const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
      const select = vi.fn().mockReturnValue({ eq: eq1 });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      const result = await findDishByNormalizedName(mockUser.id, 'nonexistent');

      // Should return null, not throw an error
      expect(result).toBeNull();
    });

    it('throws error for non-PGRST116 errors', async () => {
      // Other error codes (like PGRST500) indicate real database problems
      const single = vi.fn().mockReturnValue(
        Promise.resolve({ data: null, error: { code: 'PGRST500', message: 'database error' } }),
      );
      const eq2 = vi.fn().mockReturnValue({ single });
      const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
      const select = vi.fn().mockReturnValue({ eq: eq1 });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      // Should throw error for non-"not found" errors
      await expect(
        findDishByNormalizedName(mockUser.id, 'test'),
      ).rejects.toThrow('database error');
    });
  });

  describe('updateDish', () => {
    it('updates dish name and returns mapped data', async () => {
      const row: DishRow = {
        id: 'dish-1',
        user_id: mockUser.id,
        dish_name: 'Updated Name',
        normalized_dish_name: 'updated name',
        dish_embedding_id: null,
        created_at: new Date().toISOString(),
      };

      const single = vi.fn().mockReturnValue(Promise.resolve({ data: row, error: null }));
      const select = vi.fn().mockReturnValue({ single });
      const eq = vi.fn().mockReturnValue({ select });
      const update = vi.fn().mockReturnValue({ eq });
      (supabase as any).from = vi.fn().mockReturnValue({ update });

      const result = await updateDish('dish-1', {
        dishName: 'Updated Name',
        normalizedDishName: 'updated name',
      });

      expect(update).toHaveBeenCalled();
      expect(eq).toHaveBeenCalledWith('id', 'dish-1');
      expect(result.dishName).toBe('Updated Name');
      expect(result.normalizedDishName).toBe('updated name');
    });

    it('updates only dishName when provided', async () => {
      const row: DishRow = {
        id: 'dish-1',
        user_id: mockUser.id,
        dish_name: 'Updated Name',
        normalized_dish_name: 'chocolate croissant',
        dish_embedding_id: null,
        created_at: new Date().toISOString(),
      };

      const single = vi.fn().mockReturnValue(Promise.resolve({ data: row, error: null }));
      const select = vi.fn().mockReturnValue({ single });
      const eq = vi.fn().mockReturnValue({ select });
      const update = vi.fn().mockReturnValue({ eq });
      (supabase as any).from = vi.fn().mockReturnValue({ update });

      await updateDish('dish-1', { dishName: 'Updated Name' });

      expect(update).toHaveBeenCalledWith({ dish_name: 'Updated Name' });
    });

    it('throws error when update fails', async () => {
      const single = vi.fn().mockReturnValue(
        Promise.resolve({ data: null, error: { message: 'update failed' } }),
      );
      const select = vi.fn().mockReturnValue({ single });
      const eq = vi.fn().mockReturnValue({ select });
      const update = vi.fn().mockReturnValue({ eq });
      (supabase as any).from = vi.fn().mockReturnValue({ update });

      await expect(updateDish('dish-1', { dishName: 'Test' })).rejects.toThrow('update failed');
    });
  });

  describe('createDishEvent', () => {
    it('creates a dish event and returns mapped data', async () => {
      const row: DishEventRow = {
        id: 'dish-event-1',
        user_id: mockUser.id,
        dish_id: 'dish-1',
        predicted_dish_id: 'predicted-dish-1',
        raw_entry_id: 'raw-entry-1',
        created_at: new Date().toISOString(),
      };

      const single = vi.fn().mockReturnValue(Promise.resolve({ data: row, error: null }));
      const select = vi.fn().mockReturnValue({ single });
      const insert = vi.fn().mockReturnValue({ select });
      (supabase as any).from = vi.fn().mockReturnValue({ insert });

      const result = await createDishEvent({
        userId: mockUser.id,
        dishId: 'dish-1',
        predictedDishId: 'predicted-dish-1',
        rawEntryId: 'raw-entry-1',
      });

      expect(insert).toHaveBeenCalled();
      expect(result.id).toBe('dish-event-1');
      expect(result.dishId).toBe('dish-1');
      expect(result.rawEntryId).toBe('raw-entry-1');
    });

    it('throws error when insert fails', async () => {
      const single = vi.fn().mockReturnValue(
        Promise.resolve({ data: null, error: { message: 'insert failed' } }),
      );
      const select = vi.fn().mockReturnValue({ single });
      const insert = vi.fn().mockReturnValue({ select });
      (supabase as any).from = vi.fn().mockReturnValue({ insert });

      await expect(
        createDishEvent({
          userId: mockUser.id,
          dishId: 'dish-1',
          predictedDishId: null,
          rawEntryId: 'raw-entry-1',
        }),
      ).rejects.toThrow('insert failed');
    });
  });

  /**
   * Tests for retrieving triggers by their names
   * Triggers are food ingredients/allergens that may cause symptoms
   */
  describe('getTriggersByNames', () => {
    it('returns triggers when found', async () => {
      const rows: TriggerRow[] = [
        {
          id: 'trigger-1',
          trigger_name: 'gluten',
          created_at: new Date().toISOString(),
        },
        {
          id: 'trigger-2',
          trigger_name: 'caffeine',
          created_at: new Date().toISOString(),
        },
      ];

      // Mock query chain: from('triggers').select().in('trigger_name', [...])
      const inFn = vi.fn().mockReturnValue(Promise.resolve({ data: rows, error: null }));
      const select = vi.fn().mockReturnValue({ in: inFn });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      const result = await getTriggersByNames(['gluten', 'caffeine']);

      // Verify the IN clause was called with correct values
      expect(inFn).toHaveBeenCalledWith('trigger_name', ['gluten', 'caffeine']);
      // Verify results are correctly mapped
      expect(result).toHaveLength(2);
      expect(result[0].triggerName).toBe('gluten');
      expect(result[1].triggerName).toBe('caffeine');
    });

    it('returns empty array when no triggers found', async () => {
      const inFn = vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null }));
      const select = vi.fn().mockReturnValue({ in: inFn });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      const result = await getTriggersByNames(['nonexistent']);

      expect(result).toEqual([]);
    });

    it('throws error when query fails', async () => {
      const inFn = vi.fn().mockReturnValue(
        Promise.resolve({ data: null, error: { message: 'query failed' } }),
      );
      const select = vi.fn().mockReturnValue({ in: inFn });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      await expect(getTriggersByNames(['gluten'])).rejects.toThrow('query failed');
    });
  });

  describe('getTriggerById', () => {
    it('returns trigger when found', async () => {
      const row: TriggerRow = {
        id: 'trigger-1',
        trigger_name: 'gluten',
        created_at: new Date().toISOString(),
      };

      const single = vi.fn().mockReturnValue(Promise.resolve({ data: row, error: null }));
      const eq = vi.fn().mockReturnValue({ single });
      const select = vi.fn().mockReturnValue({ eq });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      const result = await getTriggerById('trigger-1');

      expect(eq).toHaveBeenCalledWith('id', 'trigger-1');
      expect(result).not.toBeNull();
      expect(result?.triggerName).toBe('gluten');
    });

    it('returns null when not found', async () => {
      const single = vi.fn().mockReturnValue(
        Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
      );
      const eq = vi.fn().mockReturnValue({ single });
      const select = vi.fn().mockReturnValue({ eq });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      const result = await getTriggerById('nonexistent');

      expect(result).toBeNull();
    });

    it('throws error for non-PGRST116 errors', async () => {
      const single = vi.fn().mockReturnValue(
        Promise.resolve({ data: null, error: { code: 'PGRST500', message: 'database error' } }),
      );
      const eq = vi.fn().mockReturnValue({ single });
      const select = vi.fn().mockReturnValue({ eq });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      await expect(getTriggerById('trigger-1')).rejects.toThrow('database error');
    });
  });

  describe('createPredictedDishTrigger', () => {
    it('creates a predicted dish trigger and returns mapped data', async () => {
      const row: PredictedDishTriggerRow = {
        id: 'predicted-trigger-1',
        dish_id: 'dish-1',
        dish_event_id: 'dish-event-1',
        trigger_id: 'trigger-1',
        model_version: 'v1-stub',
        prompt_version: 'v1-stub',
        created_at: new Date().toISOString(),
      };

      const single = vi.fn().mockReturnValue(Promise.resolve({ data: row, error: null }));
      const select = vi.fn().mockReturnValue({ single });
      const insert = vi.fn().mockReturnValue({ select });
      (supabase as any).from = vi.fn().mockReturnValue({ insert });

      const result = await createPredictedDishTrigger({
        dishId: 'dish-1',
        dishEventId: 'dish-event-1',
        triggerId: 'trigger-1',
        modelVersion: 'v1-stub',
        promptVersion: 'v1-stub',
      });

      expect(insert).toHaveBeenCalled();
      expect(result.id).toBe('predicted-trigger-1');
      expect(result.dishId).toBe('dish-1');
      expect(result.triggerId).toBe('trigger-1');
    });

    it('throws error when insert fails', async () => {
      const single = vi.fn().mockReturnValue(
        Promise.resolve({ data: null, error: { message: 'insert failed' } }),
      );
      const select = vi.fn().mockReturnValue({ single });
      const insert = vi.fn().mockReturnValue({ select });
      (supabase as any).from = vi.fn().mockReturnValue({ insert });

      await expect(
        createPredictedDishTrigger({
          dishId: 'dish-1',
          dishEventId: 'dish-event-1',
          triggerId: 'trigger-1',
          modelVersion: 'v1',
          promptVersion: 'v1',
        }),
      ).rejects.toThrow('insert failed');
    });
  });

  describe('createDishTrigger', () => {
    it('creates a dish trigger and returns mapped data', async () => {
      const row: DishTriggerRow = {
        id: 'dish-trigger-1',
        dish_id: 'dish-1',
        dish_event_id: 'dish-event-1',
        trigger_id: 'trigger-1',
        created_at: new Date().toISOString(),
      };

      const single = vi.fn().mockReturnValue(Promise.resolve({ data: row, error: null }));
      const select = vi.fn().mockReturnValue({ single });
      const insert = vi.fn().mockReturnValue({ select });
      (supabase as any).from = vi.fn().mockReturnValue({ insert });

      const result = await createDishTrigger({
        dishId: 'dish-1',
        dishEventId: 'dish-event-1',
        triggerId: 'trigger-1',
      });

      expect(insert).toHaveBeenCalled();
      expect(result.id).toBe('dish-trigger-1');
      expect(result.dishId).toBe('dish-1');
      expect(result.triggerId).toBe('trigger-1');
    });

    it('throws error when insert fails', async () => {
      const single = vi.fn().mockReturnValue(
        Promise.resolve({ data: null, error: { message: 'insert failed' } }),
      );
      const select = vi.fn().mockReturnValue({ single });
      const insert = vi.fn().mockReturnValue({ select });
      (supabase as any).from = vi.fn().mockReturnValue({ insert });

      await expect(
        createDishTrigger({
          dishId: 'dish-1',
          dishEventId: 'dish-event-1',
          triggerId: 'trigger-1',
        }),
      ).rejects.toThrow('insert failed');
    });
  });

  describe('deleteDishTriggersForEvent', () => {
    it('deletes dish triggers for an event', async () => {
      const eq = vi.fn().mockReturnValue(Promise.resolve({ error: null }));
      const deleteFn = vi.fn().mockReturnValue({ eq });
      (supabase as any).from = vi.fn().mockReturnValue({ delete: deleteFn });

      await deleteDishTriggersForEvent('dish-event-1');

      expect(deleteFn).toHaveBeenCalled();
      expect(eq).toHaveBeenCalledWith('dish_event_id', 'dish-event-1');
    });

    it('throws error when delete fails', async () => {
      const eq = vi.fn().mockReturnValue(
        Promise.resolve({ error: { message: 'delete failed' } }),
      );
      const deleteFn = vi.fn().mockReturnValue({ eq });
      (supabase as any).from = vi.fn().mockReturnValue({ delete: deleteFn });

      await expect(deleteDishTriggersForEvent('dish-event-1')).rejects.toThrow('delete failed');
    });
  });

  /**
   * Tests for retrieving dish events by raw food entry ID
   * Dish events link dishes to raw entries and track when dishes were consumed
   */
  describe('getDishEventsByRawFoodEntryId', () => {
    it('returns dish events when found', async () => {
      const rows: DishEventRow[] = [
        {
          id: 'dish-event-1',
          user_id: mockUser.id,
          dish_id: 'dish-1',
          predicted_dish_id: 'predicted-dish-1',
          raw_entry_id: 'raw-entry-1',
          created_at: new Date().toISOString(),
        },
        {
          id: 'dish-event-2',
          user_id: mockUser.id,
          dish_id: 'dish-2',
          predicted_dish_id: 'predicted-dish-2',
          raw_entry_id: 'raw-entry-1',
          created_at: new Date().toISOString(),
        },
      ];

      // Mock query chain: from('dish_events').select().eq('raw_entry_id').order('created_at')
      const order = vi.fn().mockReturnValue(Promise.resolve({ data: rows, error: null }));
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      const result = await getDishEventsByRawFoodEntryId('raw-entry-1');

      // Verify query filters and ordering
      expect(eq).toHaveBeenCalledWith('raw_entry_id', 'raw-entry-1');
      expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
      // Verify results are returned in correct order (most recent first)
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('dish-event-1');
    });

    it('returns empty array when no events found', async () => {
      const order = vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null }));
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      const result = await getDishEventsByRawFoodEntryId('nonexistent');

      expect(result).toEqual([]);
    });

    it('throws error when query fails', async () => {
      const order = vi.fn().mockReturnValue(
        Promise.resolve({ data: null, error: { message: 'query failed' } }),
      );
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      await expect(getDishEventsByRawFoodEntryId('raw-entry-1')).rejects.toThrow('query failed');
    });
  });

  describe('getPredictedTriggersByDishEventIds', () => {
    it('returns predicted triggers when found', async () => {
      const rows: PredictedDishTriggerRow[] = [
        {
          id: 'predicted-trigger-1',
          dish_id: 'dish-1',
          dish_event_id: 'dish-event-1',
          trigger_id: 'trigger-1',
          model_version: 'v1-stub',
          prompt_version: 'v1-stub',
          created_at: new Date().toISOString(),
        },
        {
          id: 'predicted-trigger-2',
          dish_id: 'dish-1',
          dish_event_id: 'dish-event-1',
          trigger_id: 'trigger-2',
          model_version: 'v1-stub',
          prompt_version: 'v1-stub',
          created_at: new Date().toISOString(),
        },
      ];

      const inFn = vi.fn().mockReturnValue(Promise.resolve({ data: rows, error: null }));
      const select = vi.fn().mockReturnValue({ in: inFn });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      const result = await getPredictedTriggersByDishEventIds(['dish-event-1']);

      expect(inFn).toHaveBeenCalledWith('dish_event_id', ['dish-event-1']);
      expect(result).toHaveLength(2);
      expect(result[0].dishEventId).toBe('dish-event-1');
    });

    it('returns empty array when no triggers found', async () => {
      const inFn = vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null }));
      const select = vi.fn().mockReturnValue({ in: inFn });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      const result = await getPredictedTriggersByDishEventIds(['dish-event-1']);

      expect(result).toEqual([]);
    });

    it('throws error when query fails', async () => {
      const inFn = vi.fn().mockReturnValue(
        Promise.resolve({ data: null, error: { message: 'query failed' } }),
      );
      const select = vi.fn().mockReturnValue({ in: inFn });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      await expect(getPredictedTriggersByDishEventIds(['dish-event-1'])).rejects.toThrow(
        'query failed',
      );
    });
  });

  describe('getConfirmedTriggersByDishEventIds', () => {
    it('returns confirmed triggers when found', async () => {
      const rows: DishTriggerRow[] = [
        {
          id: 'dish-trigger-1',
          dish_id: 'dish-1',
          dish_event_id: 'dish-event-1',
          trigger_id: 'trigger-1',
          created_at: new Date().toISOString(),
        },
        {
          id: 'dish-trigger-2',
          dish_id: 'dish-1',
          dish_event_id: 'dish-event-1',
          trigger_id: 'trigger-2',
          created_at: new Date().toISOString(),
        },
      ];

      const inFn = vi.fn().mockReturnValue(Promise.resolve({ data: rows, error: null }));
      const select = vi.fn().mockReturnValue({ in: inFn });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      const result = await getConfirmedTriggersByDishEventIds(['dish-event-1']);

      expect(inFn).toHaveBeenCalledWith('dish_event_id', ['dish-event-1']);
      expect(result).toHaveLength(2);
      expect(result[0].dishEventId).toBe('dish-event-1');
    });

    it('returns empty array when no triggers found', async () => {
      const inFn = vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null }));
      const select = vi.fn().mockReturnValue({ in: inFn });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      const result = await getConfirmedTriggersByDishEventIds(['dish-event-1']);

      expect(result).toEqual([]);
    });

    it('throws error when query fails', async () => {
      const inFn = vi.fn().mockReturnValue(
        Promise.resolve({ data: null, error: { message: 'query failed' } }),
      );
      const select = vi.fn().mockReturnValue({ in: inFn });
      (supabase as any).from = vi.fn().mockReturnValue({ select });

      await expect(getConfirmedTriggersByDishEventIds(['dish-event-1'])).rejects.toThrow(
        'query failed',
      );
    });
  });
});
