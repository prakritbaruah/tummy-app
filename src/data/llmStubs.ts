import { ExtractedDish } from '../types/foodEntry';

/**
 * Stub function that simulates LLM extraction of dishes from raw entry text.
 * Returns deterministic results based on simple pattern matching.
 * 
 * In production, this will be replaced with actual OpenAI API calls.
 */
export async function llmExtractDishes(rawEntryText: string): Promise<ExtractedDish[]> {
  // Deterministic stub implementation
  const normalized = rawEntryText.toLowerCase().trim();

  // Hardcoded cases for testing
  if (normalized.includes('chocolate croissant') && normalized.includes('matcha latte')) {
    return [
      {
        dish_fragment_text: 'Chocolate Croissant',
        dish_name_suggestion: 'Chocolate Croissant',
      },
      {
        dish_fragment_text: 'Matcha Latte',
        dish_name_suggestion: 'Matcha Latte',
      },
    ];
  }

  if (normalized.includes('cherry turnover')) {
    return [
      {
        dish_fragment_text: 'Cherry turnover',
        dish_name_suggestion: 'Cherry Turnover',
      },
    ];
  }

  // Fallback: simple split on "and" for multi-dish entries
  if (normalized.includes(' and ')) {
    const parts = rawEntryText.split(/\s+and\s+/i);
    return parts.map((part) => ({
      dish_fragment_text: part.trim(),
      dish_name_suggestion: part.trim(),
    }));
  }

  // Single dish entry
  return [
    {
      dish_fragment_text: rawEntryText.trim(),
      dish_name_suggestion: rawEntryText.trim(),
    },
  ];
}

/**
 * Stub function that simulates LLM prediction of triggers for a dish.
 * Returns deterministic results based on simple keyword matching.
 * 
 * In production, this will be replaced with actual OpenAI API calls.
 */
export async function llmPredictTriggers(
  dishName: string,
  fragmentText: string,
): Promise<string[]> {
  // Deterministic stub implementation
  const combined = `${dishName} ${fragmentText}`.toLowerCase();
  const triggers: string[] = [];

  // Simple keyword-based rules
  if (combined.includes('croissant') || combined.includes('turnover')) {
    triggers.push('gluten');
  }

  if (combined.includes('latte') || combined.includes('matcha')) {
    triggers.push('caffeine');
  }

  if (combined.includes('salmon')) {
    // Salmon has no triggers in our stub
  }

  // Additional rules for other common triggers
  if (combined.includes('cheese') || combined.includes('milk') || combined.includes('butter')) {
    triggers.push('dairy');
  }

  if (combined.includes('peanut') || combined.includes('walnut') || combined.includes('almond')) {
    triggers.push('nuts');
  }

  if (combined.includes('sugar') || combined.includes('sweet')) {
    triggers.push('sugar');
  }

  if (combined.includes('beef') || combined.includes('steak') || combined.includes('burger')) {
    triggers.push('red_meat');
  }

  return triggers;
}



