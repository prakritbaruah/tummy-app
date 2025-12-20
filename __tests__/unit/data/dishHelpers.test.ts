import { afterEach, describe, expect, it, vi } from 'vitest';
import { findOrCreateDishForUser, normalizeDishName } from '@/data/dishHelpers';
import { supabase } from '@/lib/supabase';
import { DishRow } from '@/types/supabase';

const originalFrom = supabase.from;

const mockUser = { id: 'test-user-123' };

// Mock for find query: .from('dish').select('*').eq('user_id', ...).eq('normalized_dish_name', ...).single()
const mockFindChain = (
  row: DishRow | null,
  error: { code?: string; message: string } | null = null,
) => {
  const single = vi.fn().mockReturnValue(Promise.resolve({ data: row, error }));
  const eq2 = vi.fn().mockReturnValue({ single });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const select = vi.fn().mockReturnValue({ eq: eq1 });
  (supabase as any).from = vi.fn().mockReturnValue({ select });
  return { select, eq1, eq2, single };
};

// Mock for insert query: .from('dish').insert(...).select().single()
const mockInsertChain = (row: DishRow | null, error: { message: string } | null = null) => {
  const single = vi.fn().mockReturnValue(Promise.resolve({ data: row, error }));
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  (supabase as any).from = vi.fn().mockReturnValue({ insert });
  return { insert, select, single };
};

// Mock for both find and insert calls in sequence (for create scenarios)
const mockFindThenInsert = (
  findRow: DishRow | null,
  findError: { code?: string; message: string } | null,
  insertRow: DishRow | null,
  insertError: { message: string } | null = null,
) => {
  const findSingle = vi.fn().mockReturnValue(Promise.resolve({ data: findRow, error: findError }));
  const findEq2 = vi.fn().mockReturnValue({ single: findSingle });
  const findEq1 = vi.fn().mockReturnValue({ eq: findEq2 });
  const findSelect = vi.fn().mockReturnValue({ eq: findEq1 });

  const insertSingle = vi.fn().mockReturnValue(Promise.resolve({ data: insertRow, error: insertError }));
  const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
  const insert = vi.fn().mockReturnValue({ select: insertSelect });

  let callCount = 0;
  (supabase as any).from = vi.fn().mockImplementation((table: string) => {
    callCount++;
    if (callCount === 1) {
      // First call: find
      return { select: findSelect };
    } else {
      // Second call: insert
      return { insert };
    }
  });

  return { findSelect, findEq1, findEq2, findSingle, insert, insertSelect, insertSingle };
};

afterEach(() => {
  (supabase as any).from = originalFrom;
  vi.restoreAllMocks();
});

describe('dishHelpers', () => {
  describe('normalizeDishName', () => {
    it('normalizes "Chocolate Croissant" to lowercase', () => {
      expect(normalizeDishName('Chocolate Croissant')).toBe('chocolate croissant');
    });
  
    it('trims and collapses multiple spaces', () => {
      expect(normalizeDishName('  Matcha   Latte  ')).toBe('matcha latte');
    });
  
    it('removes filler words like "and", "with", "or"', () => {
      expect(
        normalizeDishName('SPINACH & LETTUCE SALAD with walnuts, beets, and apple thyme dressing'),
      ).toBe('spinach & lettuce salad walnuts, beets, apple thyme dressing');
    });
  
    it('handles case-insensitive filler word removal', () => {
      expect(normalizeDishName('Pasta AND Meatballs')).toBe('pasta meatballs');
      expect(normalizeDishName('Soup WITH Bread')).toBe('soup bread');
      expect(normalizeDishName('Coffee OR Tea')).toBe('coffee tea');
    });
  
    it('handles multiple filler words', () => {
      expect(normalizeDishName('Rice and Beans with Chicken')).toBe('rice beans chicken');
    });
  
    it('handles empty string', () => {
      expect(normalizeDishName('')).toBe('');
    });
  
    it('handles string with only filler words', () => {
      expect(normalizeDishName('and with or')).toBe('');
    });
  
    it('preserves special characters', () => {
      expect(normalizeDishName('Café & Restaurant')).toBe('café & restaurant');
    });
  });
  
  describe('findOrCreateDishForUser', () => {
    it('returns existing dish when found', async () => {
      const existingDish: DishRow = {
        id: 'dish-123',
        user_id: mockUser.id,
        dish_name: 'Chocolate Croissant',
        normalized_dish_name: 'chocolate croissant',
        dish_embedding_id: null,
        created_at: new Date().toISOString(),
      };

      const { eq1, eq2, single } = mockFindChain(existingDish);

      const result = await findOrCreateDishForUser({
        userId: mockUser.id,
        dishNameSuggestion: 'Chocolate Croissant',
      });

      expect(single).toHaveBeenCalled();
      expect(eq1).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(eq2).toHaveBeenCalledWith('normalized_dish_name', 'chocolate croissant');
      expect(result.id).toBe('dish-123');
      expect(result.dishName).toBe('Chocolate Croissant');
      expect(result.normalizedDishName).toBe('chocolate croissant');
      expect(result.userId).toBe(mockUser.id);
    });

    it('creates new dish when not found', async () => {
      // First call: find returns null (not found)
      const notFoundError = { code: 'PGRST116', message: 'not found' };
      
      // Second call: insert creates new dish
      const newDish: DishRow = {
        id: 'dish-456',
        user_id: mockUser.id,
        dish_name: 'Matcha Latte',
        normalized_dish_name: 'matcha latte',
        dish_embedding_id: null,
        created_at: new Date().toISOString(),
      };
      const { insert, insertSingle } = mockFindThenInsert(null, notFoundError, newDish);

      const result = await findOrCreateDishForUser({
        userId: mockUser.id,
        dishNameSuggestion: 'Matcha Latte',
      });

      expect(insert).toHaveBeenCalledWith({
        user_id: mockUser.id,
        dish_name: 'Matcha Latte',
        normalized_dish_name: 'matcha latte',
        dish_embedding_id: null,
      });
      expect(insertSingle).toHaveBeenCalled();
      expect(result.id).toBe('dish-456');
      expect(result.dishName).toBe('Matcha Latte');
      expect(result.normalizedDishName).toBe('matcha latte');
      expect(result.userId).toBe(mockUser.id);
    });

    it('normalizes dish name before searching', async () => {
      const existingDish: DishRow = {
        id: 'dish-789',
        user_id: mockUser.id,
        dish_name: 'Chocolate Croissant',
        normalized_dish_name: 'chocolate croissant',
        dish_embedding_id: null,
        created_at: new Date().toISOString(),
      };

      const { eq2 } = mockFindChain(existingDish);

      await findOrCreateDishForUser({
        userId: mockUser.id,
        dishNameSuggestion: '  CHOCOLATE   CROISSANT  ',
      });

      // Should normalize the name before searching
      expect(eq2).toHaveBeenCalledWith('normalized_dish_name', 'chocolate croissant');
    });

    it('handles filler words in normalization', async () => {
      const existingDish: DishRow = {
        id: 'dish-999',
        user_id: mockUser.id,
        dish_name: 'Pasta and Meatballs',
        normalized_dish_name: 'pasta meatballs',
        dish_embedding_id: null,
        created_at: new Date().toISOString(),
      };

      const { eq2 } = mockFindChain(existingDish);

      await findOrCreateDishForUser({
        userId: mockUser.id,
        dishNameSuggestion: 'Pasta with Meatballs',
      });

      // Should normalize by removing filler words
      expect(eq2).toHaveBeenCalledWith('normalized_dish_name', 'pasta meatballs');
    });

    it('throws error when find fails with non-PGRST116 error', async () => {
      const findError = { code: 'PGRST500', message: 'database error' };
      mockFindChain(null, findError);

      await expect(
        findOrCreateDishForUser({
          userId: mockUser.id,
          dishNameSuggestion: 'Test Dish',
        }),
      ).rejects.toThrow('Failed to find dish: database error');
    });

    it('throws error when insert fails', async () => {
      // First call: find returns null (not found)
      const notFoundError = { code: 'PGRST116', message: 'not found' };
      
      // Second call: insert fails
      const insertError = { message: 'insert failed' };
      mockFindThenInsert(null, notFoundError, null, insertError);

      await expect(
        findOrCreateDishForUser({
          userId: mockUser.id,
          dishNameSuggestion: 'Test Dish',
        }),
      ).rejects.toThrow('Failed to create dish: insert failed');
    });

    it('throws error when insert returns no data', async () => {
      // First call: find returns null (not found)
      const notFoundError = { code: 'PGRST116', message: 'not found' };
      
      // Second call: insert returns null data
      mockFindThenInsert(null, notFoundError, null, null);

      await expect(
        findOrCreateDishForUser({
          userId: mockUser.id,
          dishNameSuggestion: 'Test Dish',
        }),
      ).rejects.toThrow('Failed to create dish: no data returned');
    });

    it('handles dish with embedding ID', async () => {
      const existingDish: DishRow = {
        id: 'dish-embed',
        user_id: mockUser.id,
        dish_name: 'Test Dish',
        normalized_dish_name: 'test dish',
        dish_embedding_id: 'embed-123',
        created_at: new Date().toISOString(),
      };

      mockFindChain(existingDish);

      const result = await findOrCreateDishForUser({
        userId: mockUser.id,
        dishNameSuggestion: 'Test Dish',
      });

      expect(result.dishEmbeddingId).toBe('embed-123');
    });
  });
});
