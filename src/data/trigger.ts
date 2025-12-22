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
  