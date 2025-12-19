import { describe, expect, it } from 'vitest';
import { llmExtractDishes, llmPredictTriggers } from '../../../src/data/llmStubs';

// TODO: this isn't deterministic, I think we'd need to replace the stubs test with 
// more deterministic tests, or perhaps check that we retrieve correct items
describe('llmExtractDishes', () => {
  it('extracts two dishes from "Chocolate Croissant and Matcha Latte"', async () => {
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

  it('extracts single dish from "Cherry turnover"', async () => {
    const result = await llmExtractDishes('Cherry turnover');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      dish_fragment_text: 'Cherry turnover',
      dish_name_suggestion: 'Cherry Turnover',
    });
  });

  it('splits on "and" for multi-dish entries', async () => {
    const result = await llmExtractDishes('Pizza and Salad');

    expect(result).toHaveLength(2);
    expect(result[0].dish_fragment_text.trim()).toBe('Pizza');
    expect(result[1].dish_fragment_text.trim()).toBe('Salad');
  });

  it('handles single dish entry', async () => {
    const result = await llmExtractDishes('Grilled Salmon');

    expect(result).toHaveLength(1);
    expect(result[0].dish_fragment_text).toBe('Grilled Salmon');
  });

  it('handles case-insensitive matching', async () => {
    const result1 = await llmExtractDishes('CHOCOLATE CROISSANT AND MATCHA LATTE');
    expect(result1).toHaveLength(2);

    const result2 = await llmExtractDishes('chocolate croissant and matcha latte');
    expect(result2).toHaveLength(2);
  });
});

describe('llmPredictTriggers', () => {
  it('predicts gluten for "Chocolate Croissant"', async () => {
    const result = await llmPredictTriggers('Chocolate Croissant', 'Chocolate Croissant');
    expect(result).toEqual(['gluten']);
  });

  it('predicts caffeine for "Matcha Latte"', async () => {
    const result = await llmPredictTriggers('Matcha Latte', 'Matcha Latte');
    expect(result).toEqual(['caffeine']);
  });

  it('predicts gluten for "Cherry turnover"', async () => {
    const result = await llmPredictTriggers('Cherry turnover', 'Cherry turnover');
    expect(result).toEqual(['gluten']);
  });

  it('returns empty array for "salmon"', async () => {
    const result = await llmPredictTriggers('Grilled Salmon', 'Grilled Salmon');
    expect(result).toEqual([]);
  });

  it('can predict multiple triggers', async () => {
    const result = await llmPredictTriggers('Cheese Croissant', 'Cheese Croissant');
    expect(result).toContain('gluten');
    expect(result).toContain('dairy');
  });

  it('is case-insensitive', async () => {
    const result1 = await llmPredictTriggers('CROISSANT', 'CROISSANT');
    expect(result1).toEqual(['gluten']);

    const result2 = await llmPredictTriggers('LATTE', 'LATTE');
    expect(result2).toEqual(['caffeine']);
  });

  it('checks both dishName and fragmentText', async () => {
    const result = await llmPredictTriggers('Some Dish', 'Matcha Latte');
    expect(result).toEqual(['caffeine']);
  });

  it('predicts dairy for cheese-related dishes', async () => {
    const result = await llmPredictTriggers('Mac and Cheese', 'Mac and Cheese');
    expect(result).toContain('dairy');
  });

  it('predicts nuts for nut-containing dishes', async () => {
    const result = await llmPredictTriggers('Peanut Butter Sandwich', 'Peanut Butter Sandwich');
    expect(result).toContain('nuts');
  });

  it('predicts red_meat for meat dishes', async () => {
    const result = await llmPredictTriggers('Beef Steak', 'Beef Steak');
    expect(result).toContain('red_meat');
  });
});



