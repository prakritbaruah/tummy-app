/**
 * Valid trigger names that can be returned by the LLM.
 * These must match the trigger names in the database.
 */
export const VALID_TRIGGER_NAMES = [
    'alcohol',
    'caffeine',
    'dairy',
    'spicy',
    'fried_food',
    'gluten',
    'added_sugar',
    'insoluble_fiber',
    'fructans',
    'legumes_beans',
    'high_fructose_fruits',
    'red_meat',
    'processed_meat',
    'sesame',
    'shellfish',
    'fish',
    'soy',
    'nuts',
  ] as const;

//   Left out:
//   'polyols_sugar_alcohols',
//   'artificial_sweeteners',
//   'emulsifiers_thickeners',
//   'maltodextrin',
//   'sulfites',
//   'sulfates',
  
  export type ValidTriggerName = typeof VALID_TRIGGER_NAMES[number];
  

  // Mapping between trigger names and their display text in the AddTriggerContainer
export const TRIGGER_DISPLAY_TEXT_MAP: Record<string, string> = {
  'alcohol': 'Alcohol',
  'caffeine': 'Caffeine',
  'dairy': 'Dairy',
  'spicy': 'Spicy',
  'fried_food': 'Fried Food',
  'gluten': 'Gluten',
  'added_sugar': 'Added Sugar',
  'insoluble_fiber': 'Insoluble Fiber',
  'fructans': 'Fructans',
  'legumes_beans': 'Legumes or Beans',
  'high_fructose_fruits': 'High-fructose Fruits',
  'red_meat': 'Red Meat',
  'processed_meat': 'Processed Meat',
  'sesame': 'Sesame',
  'shellfish': 'Shellfish',
  'fish': 'Fish',
  'soy': 'Soy',
  'nuts': 'Nuts',
};

// Helper function to get display text for a trigger
export function getTriggerDisplayText(triggerName: string): string {
  return TRIGGER_DISPLAY_TEXT_MAP[triggerName] || triggerName;
};