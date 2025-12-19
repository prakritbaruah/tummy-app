import {
  ConfirmFoodEntryRequest,
  ConfirmFoodEntryResponse,
  CreateFoodEntryRequest,
  CreateFoodEntryResponse,
  DishWithTriggers,
} from '../types/foodEntry';
import {
  findOrCreateDishForUser,
  getMostRecentDishTriggers,
  normalizeDishName,
  upsertDishTriggersForEvent,
} from './dishHelpers';
import { llmExtractDishes, llmPredictTriggers } from './llmStubs';
import {
  createDishEvent,
  createPredictedDishTrigger,
  createRawFoodEntry,
  createPredictedDish,
  getConfirmedTriggersByDishEventIds,
  getDishEventsByRawFoodEntryId,
  getPredictedTriggersByDishEventIds,
  getTriggerById,
  getTriggersByNames,
  updateDish,
} from './foodEntryRepo';
import { supabase } from '../lib/supabase';
import { getAuthenticatedUserId } from './utils';

const MODEL_VERSION = 'v1-stub';
const PROMPT_VERSION = 'v1-stub';

/**
 * Creates a new food entry from raw text, extracts dishes, matches them to existing dishes,
 * and predicts triggers.
 */
export async function createFoodEntry(
  request: CreateFoodEntryRequest,
): Promise<CreateFoodEntryResponse> {
  const userId = await getAuthenticatedUserId();

  // Step 1: Insert raw_entry
  const rawEntry = await createRawFoodEntry(userId, request.raw_entry_text);

  // Step 2: Extract dishes using LLM stub
  const extractedDishes = await llmExtractDishes(request.raw_entry_text);

  const dishEvents: Array<{
    dishEvent: { id: string; dishId: string };
    dishName: string;
    isNewDish: boolean;
  }> = [];

  // Step 3: Process each extracted dish
  for (const extracted of extractedDishes) {
    // Insert predicted_dish
    const predictedDish = await createPredictedDish({
      rawEntryId: rawEntry.id,
      dishFragmentText: extracted.dish_fragment_text,
      dishNameSuggestion: extracted.dish_name_suggestion,
      modelVersion: MODEL_VERSION,
      promptVersion: PROMPT_VERSION,
    });

    // Find or create dish
    const beforeCreate = await findOrCreateDishForUser({
      userId,
      dishNameSuggestion: extracted.dish_name_suggestion,
    });
    
    // Check if dish existed before (by checking if it has any confirmed triggers)
    const existingTriggers = await getMostRecentDishTriggers(beforeCreate.id);
    const isNewDish = existingTriggers.length === 0;
    
    const dish = beforeCreate;

    // Insert dish_events
    const dishEvent = await createDishEvent({
      userId,
      dishId: dish.id,
      predictedDishId: predictedDish.id,
      rawEntryId: rawEntry.id,
    });

    dishEvents.push({
      dishEvent: { id: dishEvent.id, dishId: dish.id },
      dishName: dish.dishName,
      isNewDish,
    });
  }

  // Step 4: Predict triggers for each dish_event
  const allTriggerNames = new Set<string>();

  for (const { dishEvent, dishName, isNewDish } of dishEvents) {
    let triggerNames: string[];

    if (isNewDish) {
      // For new dishes, use LLM stub to predict triggers
      const predictedDish = extractedDishes.find(
        (ed) => ed.dish_name_suggestion === dishName,
      );
      const fragmentText = predictedDish?.dish_fragment_text || dishName;
      triggerNames = await llmPredictTriggers(dishName, fragmentText);
    } else {
      // For existing dishes, copy from most recent confirmed triggers
      const recentTriggers = await getMostRecentDishTriggers(dishEvent.dishId);
      triggerNames = recentTriggers.map((t) => t.triggerName);
    }

    // Store trigger names for later lookup
    triggerNames.forEach((name) => allTriggerNames.add(name));

    // Get trigger IDs
    const triggers = await getTriggersByNames(Array.from(triggerNames));

    // Insert predicted_dish_triggers
    for (const trigger of triggers) {
      await createPredictedDishTrigger({
        dishId: dishEvent.dishId,
        dishEventId: dishEvent.id,
        triggerId: trigger.id,
        modelVersion: MODEL_VERSION,
        promptVersion: PROMPT_VERSION,
      });
    }
  }

  // Step 5: Build response
  const dishEventIds = dishEvents.map((de) => de.dishEvent.id);
  const predictedTriggers = await getPredictedTriggersByDishEventIds(dishEventIds);
  const allTriggers = await getTriggersByNames(Array.from(allTriggerNames));

  const triggerMap = new Map(allTriggers.map((t) => [t.id, t.triggerName]));

  const dishes: DishWithTriggers[] = dishEvents.map(({ dishEvent, dishName }) => {
    const eventPredictedTriggers = predictedTriggers.filter(
      (pt) => pt.dishEventId === dishEvent.id,
    );

    return {
      dish_event_id: dishEvent.id,
      dish_id: dishEvent.dishId,
      dish_name: dishName,
      predicted_triggers: eventPredictedTriggers.map((pt) => ({
        trigger_id: pt.triggerId,
        trigger_name: triggerMap.get(pt.triggerId) || 'unknown',
      })),
    };
  });

  return {
    entry_id: rawEntry.id,
    dishes,
  };
}

/**
 * Confirms a food entry by updating dish names and setting confirmed triggers.
 */
export async function confirmFoodEntry(
  rawEntryId: string,
  request: ConfirmFoodEntryRequest,
): Promise<ConfirmFoodEntryResponse> {
  await getAuthenticatedUserId(); // Verify auth

  // Step 1: Process each confirmed dish
  for (const confirmed of request.confirmed_dishes) {
    // Update dish name if changed
    const dishEvent = (await getDishEventsByRawFoodEntryId(rawEntryId)).find(
      (de) => de.id === confirmed.dish_event_id,
    );

    if (!dishEvent) {
      throw new Error(`Dish event not found: ${confirmed.dish_event_id}`);
    }

    // Get the dish by ID to verify it exists and check if name needs updating
    // We use the dish_id from the confirmed dish, not findOrCreateDishForUser,
    // because we want to UPDATE the existing dish, not create a new one
    const { data: dishRow, error: dishError } = await supabase
      .from('dish')
      .select('*')
      .eq('id', confirmed.dish_id)
      .single();

    if (dishError) {
      throw new Error(`Dish not found: ${dishError.message}`);
    }

    if (!dishRow) {
      throw new Error(`Dish not found: ${confirmed.dish_id}`);
    }

    // Verify the dish belongs to the correct user
    if (dishRow.user_id !== dishEvent.userId) {
      throw new Error('Dish does not belong to the user');
    }

    const normalizedName = normalizeDishName(confirmed.final_dish_name);
    const currentDish = {
      id: dishRow.id,
      dishName: dishRow.dish_name,
      normalizedDishName: dishRow.normalized_dish_name,
    };

    // Update dish name if it changed
    if (
      currentDish.dishName !== confirmed.final_dish_name ||
      currentDish.normalizedDishName !== normalizedName
    ) {
      // Check if another dish with the new normalized name already exists
      const { data: existingDishWithNewName, error: checkError } = await supabase
        .from('dish')
        .select('id')
        .eq('user_id', dishEvent.userId)
        .eq('normalized_dish_name', normalizedName)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" - that's what we want
        throw new Error(`Failed to check for existing dish: ${checkError.message}`);
      }

      // If a dish with the new normalized name exists and it's not the current dish, we have a conflict
      if (existingDishWithNewName && existingDishWithNewName.id !== confirmed.dish_id) {
        throw new Error(
          `Cannot update dish name: a dish with normalized name "${normalizedName}" already exists`,
        );
      }

      // Safe to update - either no dish exists with that name, or it's the same dish
      await updateDish(confirmed.dish_id, {
        dishName: confirmed.final_dish_name,
        normalizedDishName: normalizedName,
      });
    }

    // Upsert dish triggers
    await upsertDishTriggersForEvent(confirmed.dish_event_id, confirmed.trigger_ids);
  }

  // Step 2: Build response with final state
  const dishEvents = await getDishEventsByRawFoodEntryId(rawEntryId);
  const dishEventIds = dishEvents.map((de) => de.id);

  const confirmedTriggers = await getConfirmedTriggersByDishEventIds(dishEventIds);
  const triggerIds = new Set(confirmedTriggers.map((ct) => ct.triggerId));

  // Get all unique trigger IDs and fetch their names
  const uniqueTriggerIds = Array.from(triggerIds);
  const triggers = await Promise.all(
    uniqueTriggerIds.map((id) => getTriggerById(id)),
  );

  const validTriggers = triggers.filter((t): t is NonNullable<typeof t> => t !== null);
  const triggerMap = new Map(validTriggers.map((t) => [t.id, t.triggerName]));

  const dishes: DishWithTriggers[] = dishEvents.map((dishEvent) => {
    const eventTriggers = confirmedTriggers.filter(
      (ct) => ct.dishEventId === dishEvent.id,
    );

    // Get dish name
    const confirmedDish = request.confirmed_dishes.find(
      (cd) => cd.dish_event_id === dishEvent.id,
    );
    const dishName = confirmedDish?.final_dish_name || 'Unknown';

    return {
      dish_event_id: dishEvent.id,
      dish_id: dishEvent.dishId,
      dish_name: dishName,
      triggers: eventTriggers.map((ct) => ({
        trigger_id: ct.triggerId,
        trigger_name: triggerMap.get(ct.triggerId) || 'unknown',
      })),
    };
  });

  return {
    entry_id: rawEntryId,
    dishes,
  };
}
