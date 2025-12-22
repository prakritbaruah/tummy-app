import { VALID_TRIGGER_NAMES } from '@/data/trigger'

/**
 * LLM prompt versions and prompts for food entry processing.
 * 
 * This file centralizes all LLM prompts and versioning to allow for easy
 * prompt iteration and A/B testing.
 */

export const MODEL_VERSION = 'gpt-4o-mini';
export const PROMPT_VERSION = 'v1';

/**
 * Prompt templates indexed by version.
 */
export const PROMPTS = {
  v1: {
    extractDishes: (rawEntryText: string): string => {
      return `You are a food logging assistant. Extract individual dishes from the user's food entry text.

User input: "${rawEntryText}"

Return a JSON object with a "dishes" array where each dish has:
- dish_fragment_text: The exact text fragment that refers to this dish
- dish_name_suggestion: A normalized, properly capitalized dish name

Example: For "Chocolate Croissant and Matcha Latte", return:
{
  "dishes": [
    {"dish_fragment_text": "Chocolate Croissant", "dish_name_suggestion": "Chocolate Croissant"},
    {"dish_fragment_text": "Matcha Latte", "dish_name_suggestion": "Matcha Latte"}
  ]
}

Return ONLY valid JSON with a "dishes" array, no other text.`;
    },
    predictTriggers: (dishName: string, fragmentText: string): string => {
      return `You are a food trigger prediction assistant. Predict potential food triggers (allergens, intolerances) for a dish.

Dish name: "${dishName}"
Context: "${fragmentText}"

Common triggers include: ${VALID_TRIGGER_NAMES.join(', ')}

Return a JSON object with a "triggers" array of trigger names (lowercase, use underscores for multi-word triggers like "red_meat").
If no triggers are likely, return an empty array.

# Examples of dishes that may contain each trigger
alcohol: red wine, beer
caffeine: coffee, tea, energy drink
dairy: butter, cream, milk, cheese
spicy: spicy food, curry, chili
fried_food: fried food, fried chicken, fries
gluten: gluten, wheat, barley, rye
added_sugar: added sugar, sugar, sweets
insoluble_fiber: insoluble fiber, oats
fructans: any foods with onions OR garlic
legumes_beans: foods with beans
high_fructose_fruits: apple, pear, mango, watermelon
red_meat: red meat, beef, pork
processed_meat: processed meat, ham, bacon, hotdog
sesame: sesame, sesame seed, tahini
shellfish: shellfish, shrimp, crab
fish: fish, salmon, tuna
soy: soy, soybean, soylecithin
nuts: nuts, almond, walnut, peanut

# Example format for return
For "Chocolate Croissant", return:
{
  "triggers": ["gluten", "dairy", "sugar"]
}

For "Grilled Salmon", return:
{
  "triggers": []
}

Return ONLY valid JSON with a "triggers" array, no other text.`;
    },
  },
} as const;

/**
 * Get the prompt for extracting dishes for the given version.
 */
export function getExtractDishesPrompt(
  rawEntryText: string,
  version: string = PROMPT_VERSION,
): string {
  const prompts = PROMPTS[version as keyof typeof PROMPTS];
  if (!prompts) {
    throw new Error(`Unknown prompt version: ${version}`);
  }
  return prompts.extractDishes(rawEntryText);
}

/**
 * Get the prompt for predicting triggers for the given version.
 */
export function getPredictTriggersPrompt(
  dishName: string,
  fragmentText: string,
  version: string = PROMPT_VERSION,
): string {
  const prompts = PROMPTS[version as keyof typeof PROMPTS];
  if (!prompts) {
    throw new Error(`Unknown prompt version: ${version}`);
  }
  return prompts.predictTriggers(dishName, fragmentText);
}
