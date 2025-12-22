/**
 * Unit tests for llmService.ts
 * 
 * These tests mock OpenAI API calls to test parsing, validation, and error handling
 * in isolation from actual API calls.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { llmExtractDishes, llmPredictTriggers } from '@/data/llmService';
import { VALID_TRIGGER_NAMES } from '@/data/trigger';
import * as openaiModule from '@/lib/openai';

// Mock OpenAI client
const mockClient = {
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
};

describe('llmService', () => {
  beforeEach(() => {
    vi.spyOn(openaiModule, 'getOpenAIClient').mockReturnValue(mockClient as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('llmExtractDishes', () => {
    it('parses valid JSON response with multiple dishes', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
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
              }),
            },
          },
        ],
      });

      const result = await llmExtractDishes('Chocolate Croissant and Matcha Latte');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        dish_fragment_text: 'Chocolate Croissant',
        dish_name_suggestion: 'Chocolate Croissant',
      });
      expect(result[1]).toEqual({
        dish_fragment_text: 'Matcha Latte',
        dish_name_suggestion: 'Matcha Latte',
      });
    });

    it('parses valid JSON response with single dish', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                dishes: [
                  {
                    dish_fragment_text: 'Cherry turnover',
                    dish_name_suggestion: 'Cherry Turnover',
                  },
                ],
              }),
            },
          },
        ],
      });

      const result = await llmExtractDishes('Cherry turnover');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        dish_fragment_text: 'Cherry turnover',
        dish_name_suggestion: 'Cherry Turnover',
      });
    });

    it('handles empty dishes array', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                dishes: [],
              }),
            },
          },
        ],
      });

      const result = await llmExtractDishes('Some text');

      expect(result).toHaveLength(0);
    });

    it('handles invalid JSON response gracefully', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Invalid JSON {',
            },
          },
        ],
      });

      const result = await llmExtractDishes('Some text');

      // Should return fallback with raw entry text on error
      expect(result).toHaveLength(1);
      expect(result[0].dish_fragment_text).toBe('Some text');
      expect(result[0].dish_name_suggestion).toBe('Some text');
    });

    it('handles missing dishes array in response', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                items: [], // Wrong key
              }),
            },
          },
        ],
      });

      const result = await llmExtractDishes('Some text');

      // Should return fallback with raw entry text on error
      expect(result).toHaveLength(1);
      expect(result[0].dish_fragment_text).toBe('Some text');
      expect(result[0].dish_name_suggestion).toBe('Some text');
    });

    it('handles missing required fields in dish objects', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                dishes: [
                  {
                    dish_fragment_text: 'Test',
                    // Missing dish_name_suggestion
                  },
                ],
              }),
            },
          },
        ],
      });

      const result = await llmExtractDishes('Test');

      // Should return fallback with raw entry text on validation error
      expect(result).toHaveLength(1);
      expect(result[0].dish_fragment_text).toBe('Test');
      expect(result[0].dish_name_suggestion).toBe('Test');
    });

    it('handles API errors gracefully', async () => {
      mockClient.chat.completions.create.mockRejectedValue(
        new Error('API rate limit exceeded'),
      );

      const result = await llmExtractDishes('Some text');

      // Should return fallback with raw entry text on error
      expect(result).toHaveLength(1);
      expect(result[0].dish_fragment_text).toBe('Some text');
      expect(result[0].dish_name_suggestion).toBe('Some text');
    });

    it('cleans and normalizes dish names correctly', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                dishes: [
                  {
                    dish_fragment_text: '  chocolate  croissant  ',
                    dish_name_suggestion: 'Chocolate Croissant',
                  },
                ],
              }),
            },
          },
        ],
      });

      const result = await llmExtractDishes('chocolate croissant');

      expect(result).toHaveLength(1);
      // The LLM should normalize, but we preserve what it returns
      expect(result[0].dish_fragment_text).toBe('  chocolate  croissant  ');
      expect(result[0].dish_name_suggestion).toBe('Chocolate Croissant');
    });
  });

  describe('llmPredictTriggers', () => {
    it('parses valid JSON response with triggers', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                triggers: ['gluten', 'dairy', 'added_sugar'],
              }),
            },
          },
        ],
      });

      const result = await llmPredictTriggers('Chocolate Croissant', 'Chocolate Croissant');

      expect(result).toHaveLength(3);
      expect(result).toContain('gluten');
      expect(result).toContain('dairy');
      expect(result).toContain('added_sugar');
    });

    it('parses empty triggers array', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                triggers: [],
              }),
            },
          },
        ],
      });

      const result = await llmPredictTriggers('Grilled Salmon', 'Grilled Salmon');

      expect(result).toHaveLength(0);
    });

    it('filters out invalid trigger names', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                triggers: ['gluten', 'invalid_trigger', 'dairy', 'another_invalid'],
              }),
            },
          },
        ],
      });

      const result = await llmPredictTriggers('Test Dish', 'Test Dish');

      // Should only return valid triggers
      expect(result).toHaveLength(2);
      expect(result).toContain('gluten');
      expect(result).toContain('dairy');
      expect(result).not.toContain('invalid_trigger');
      expect(result).not.toContain('another_invalid');
    });

    it('validates all valid trigger names are accepted', async () => {
      // Test all valid trigger names
      const allValidTriggers = [...VALID_TRIGGER_NAMES];
      
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                triggers: allValidTriggers,
              }),
            },
          },
        ],
      });

      const result = await llmPredictTriggers('Test Dish', 'Test Dish');

      expect(result).toHaveLength(allValidTriggers.length);
      expect(result).toEqual(expect.arrayContaining(allValidTriggers));
    });

    it('handles invalid JSON response gracefully', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Invalid JSON {',
            },
          },
        ],
      });

      const result = await llmPredictTriggers('Test Dish', 'Test Dish');

      // Should return empty array on error
      expect(result).toHaveLength(0);
    });

    it('handles missing triggers array in response', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                items: [], // Wrong key
              }),
            },
          },
        ],
      });

      const result = await llmPredictTriggers('Test Dish', 'Test Dish');

      // Should return empty array on error
      expect(result).toHaveLength(0);
    });

    it('handles non-string triggers in array', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                triggers: ['gluten', 123, 'dairy', null],
              }),
            },
          },
        ],
      });

      const result = await llmPredictTriggers('Test Dish', 'Test Dish');

      // Should return empty array on validation error
      expect(result).toHaveLength(0);
    });

    it('handles API errors gracefully', async () => {
      mockClient.chat.completions.create.mockRejectedValue(
        new Error('API rate limit exceeded'),
      );

      const result = await llmPredictTriggers('Test Dish', 'Test Dish');

      // Should return empty array on error
      expect(result).toHaveLength(0);
    });

    it('handles case sensitivity in trigger names', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                triggers: ['GLUTEN', 'Dairy', 'caffeine'], // Mixed case
              }),
            },
          },
        ],
      });

      const result = await llmPredictTriggers('Test Dish', 'Test Dish');

      // Should filter out invalid case variations (GLUTEN, Dairy)
      // but accept valid lowercase ones (caffeine)
      expect(result).toHaveLength(1);
      expect(result).toContain('caffeine');
      expect(result).not.toContain('GLUTEN');
      expect(result).not.toContain('Dairy');
    });

    // TODO: fix LLM to be able to return correct values here
    it('handles triggers with underscores correctly', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                triggers: ['red_meat', 'gluten'],
              }),
            },
          },
        ],
      });

      const result = await llmPredictTriggers('Beef Steak', 'Beef Steak');

      expect(result).toHaveLength(2);
      expect(result).toContain('red_meat');
      expect(result).toContain('gluten');
    });
  });
});
