import {
  ConfirmFoodEntryRequest,
  ConfirmFoodEntryResponse,
  CreateFoodEntryRequest,
  CreateFoodEntryResponse,
  DishWithTriggers,
} from '@/types/foodEntry';
import {
  findOrCreateDishForUser,
  getMostRecentDishTriggers,
  normalizeDishName,
  upsertDishTriggersForEvent,
} from '@/data/dishHelpers';
import { llmExtractDishes, llmPredictTriggers } from '@/data/llmService';
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
  updateDishEventConfirmation,
} from '@/data/foodEntryRepo';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/data/utils';
import { logger } from '@/utils/logger';
import { MODEL_VERSION, PROMPT_VERSION } from '@/lib/llmPrompts';

const FILENAME = 'foodEntryService.ts';

/**
 * Creates a new food entry from raw text, extracts dishes, matches them to existing dishes,
 * and predicts triggers.
 */
export async function createFoodEntry(
  request: CreateFoodEntryRequest,
): Promise<CreateFoodEntryResponse> {
  logger.info(FILENAME, 'createFoodEntry', 'Creating food entry', { rawEntryTextLength: request.raw_entry_text.length });
  const userId = await getAuthenticatedUserId();
  logger.info(FILENAME, 'createFoodEntry', 'Authenticated user ID', { userId });

  // Step 1: Insert raw_entry
  const rawEntry = await createRawFoodEntry(userId, request.raw_entry_text);
  logger.info(FILENAME, 'createFoodEntry', 'Raw food entry created', { rawEntryId: rawEntry.id });

  // Step 2: Extract dishes using LLM stub
  const extractedDishes = await llmExtractDishes(request.raw_entry_text);
  logger.info(FILENAME, 'createFoodEntry', 'Dishes extracted', { dishCount: extractedDishes.length });

  const dishEvents: Array<{
    dishEvent: { id: string; dishId: string };
    dishName: string;
    isNewDish: boolean;
  }> = [];

  // Step 3: Process each extracted dish
  for (const extracted of extractedDishes) {
    logger.info(FILENAME, 'createFoodEntry', 'Processing dish', { 
      dishNameSuggestion: extracted.dish_name_suggestion,
      fragmentText: extracted.dish_fragment_text.substring(0, 50) + '...'
    });
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
    logger.info(FILENAME, 'createFoodEntry', 'Dish found/created', { dishId: beforeCreate.id, dishName: beforeCreate.dishName });
    
    // Check if dish existed before (by checking if it has any confirmed triggers)
    const existingTriggers = await getMostRecentDishTriggers(beforeCreate.id);
    const isNewDish = existingTriggers.length === 0;
    if (isNewDish) {
      logger.info(FILENAME, 'createFoodEntry', 'New dish created', { dishId: beforeCreate.id, dishName: beforeCreate.dishName });
    } else {
      logger.info(FILENAME, 'createFoodEntry', 'Existing dish found', { dishId: beforeCreate.id, dishName: beforeCreate.dishName });
    }
    
    const dish = beforeCreate;

    // Insert dish_events
    const dishEvent = await createDishEvent({
      userId,
      dishId: dish.id,
      predictedDishId: predictedDish.id,
      rawEntryId: rawEntry.id,
      confirmedByUser: false,
    });
    logger.info(FILENAME, 'createFoodEntry', 'Dish event created', { dishEventId: dishEvent.id, dishId: dish.id });

    dishEvents.push({
      dishEvent: { id: dishEvent.id, dishId: dish.id },
      dishName: dish.dishName,
      isNewDish,
    });
  }
  logger.info(FILENAME, 'createFoodEntry', 'All dishes processed', { dishEventCount: dishEvents.length });

  // Step 4: Predict triggers for each dish_event
  const allTriggerNames = new Set<string>();

  for (const { dishEvent, dishName, isNewDish } of dishEvents) {
    logger.info(FILENAME, 'createFoodEntry', 'Predicting triggers for dish event', { 
      dishEventId: dishEvent.id, 
      dishName, 
      isNewDish 
    });
    let triggerNames: string[];

    if (isNewDish) {
      // For new dishes, use LLM stub to predict triggers
      logger.info(FILENAME, 'createFoodEntry', 'Using LLM to predict triggers for new dish', { dishName });
      const predictedDish = extractedDishes.find(
        (ed) => ed.dish_name_suggestion === dishName,
      );
      const fragmentText = predictedDish?.dish_fragment_text || dishName;
      triggerNames = await llmPredictTriggers(dishName, fragmentText);
      logger.info(FILENAME, 'createFoodEntry', 'LLM predicted triggers', { dishName, triggerCount: triggerNames.length, triggers: triggerNames });
    } else {
      // For existing dishes, copy from most recent confirmed triggers
      logger.info(FILENAME, 'createFoodEntry', 'Copying triggers from most recent dish event', { dishId: dishEvent.dishId });
      const recentTriggers = await getMostRecentDishTriggers(dishEvent.dishId);
      triggerNames = recentTriggers.map((t) => t.triggerName);
      logger.info(FILENAME, 'createFoodEntry', 'Copied triggers from existing dish', { dishId: dishEvent.dishId, triggerCount: triggerNames.length, triggers: triggerNames });
    }

    // Store trigger names for later lookup
    triggerNames.forEach((name) => allTriggerNames.add(name));

    // Get trigger IDs
    const triggers = await getTriggersByNames(Array.from(triggerNames));
    logger.info(FILENAME, 'createFoodEntry', 'Retrieved trigger IDs', { triggerCount: triggers.length });

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
    logger.info(FILENAME, 'createFoodEntry', 'Predicted dish triggers created', { 
      dishEventId: dishEvent.id, 
      triggerCount: triggers.length 
    });
  }
  logger.info(FILENAME, 'createFoodEntry', 'All triggers predicted', { uniqueTriggerCount: allTriggerNames.size });

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

  logger.info(FILENAME, 'createFoodEntry', 'Food entry creation completed', { 
    entryId: rawEntry.id, 
    dishCount: dishes.length,
    totalPredictedTriggers: predictedTriggers.length
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
  logger.info(FILENAME, 'confirmFoodEntry', 'Confirming food entry', { 
    rawEntryId, 
    confirmedDishCount: request.confirmed_dishes.length 
  });
  await getAuthenticatedUserId(); // Verify auth

  // Step 1: Process each confirmed dish
  for (const confirmed of request.confirmed_dishes) {
    logger.info(FILENAME, 'confirmFoodEntry', 'Processing confirmed dish', {
      dishEventId: confirmed.dish_event_id,
      dishId: confirmed.dish_id,
      finalDishName: confirmed.final_dish_name,
      triggerCount: confirmed.trigger_ids.length
    });
    // Update dish name if changed
    const dishEvent = (await getDishEventsByRawFoodEntryId(rawEntryId)).find(
      (de) => de.id === confirmed.dish_event_id,
    );

    if (!dishEvent) {
      logger.error(FILENAME, 'confirmFoodEntry', 'Dish event not found', new Error(`Dish event not found: ${confirmed.dish_event_id}`));
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
      logger.error(FILENAME, 'confirmFoodEntry', 'Dish not found', dishError);
      throw new Error(`Dish not found: ${dishError.message}`);
    }

    if (!dishRow) {
      logger.error(FILENAME, 'confirmFoodEntry', 'Dish not found', new Error(`Dish not found: ${confirmed.dish_id}`));
      throw new Error(`Dish not found: ${confirmed.dish_id}`);
    }

    // Verify the dish belongs to the correct user
    if (dishRow.user_id !== dishEvent.userId) {
      logger.error(FILENAME, 'confirmFoodEntry', 'Dish ownership mismatch', new Error('Dish does not belong to the user'));
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
      logger.info(FILENAME, 'confirmFoodEntry', 'Dish name changed, updating', {
        dishId: confirmed.dish_id,
        oldName: currentDish.dishName,
        newName: confirmed.final_dish_name
      });
      // Check if another dish with the new normalized name already exists
      const { data: existingDishWithNewName, error: checkError } = await supabase
        .from('dish')
        .select('id')
        .eq('user_id', dishEvent.userId)
        .eq('normalized_dish_name', normalizedName)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" - that's what we want
        logger.error(FILENAME, 'confirmFoodEntry', 'Failed to check for existing dish', checkError);
        throw new Error(`Failed to check for existing dish: ${checkError.message}`);
      }

      // If a dish with the new normalized name exists and it's not the current dish, we have a conflict
      if (existingDishWithNewName && existingDishWithNewName.id !== confirmed.dish_id) {
        logger.warn(FILENAME, 'confirmFoodEntry', 'Dish name conflict detected', {
          dishId: confirmed.dish_id,
          conflictingDishId: existingDishWithNewName.id,
          normalizedName
        });
        throw new Error(
          `Cannot update dish name: a dish with normalized name "${normalizedName}" already exists`,
        );
      }

      // Safe to update - either no dish exists with that name, or it's the same dish
      await updateDish(confirmed.dish_id, {
        dishName: confirmed.final_dish_name,
        normalizedDishName: normalizedName,
      });
      logger.info(FILENAME, 'confirmFoodEntry', 'Dish name updated successfully', { dishId: confirmed.dish_id });
    }

    // Upsert dish triggers
    logger.info(FILENAME, 'confirmFoodEntry', 'Upserting dish triggers', {
      dishEventId: confirmed.dish_event_id,
      triggerCount: confirmed.trigger_ids.length
    });
    await upsertDishTriggersForEvent(confirmed.dish_event_id, confirmed.trigger_ids);
    logger.info(FILENAME, 'confirmFoodEntry', 'Dish triggers upserted successfully', { dishEventId: confirmed.dish_event_id });
  }
  logger.info(FILENAME, 'confirmFoodEntry', 'All confirmed dishes processed');

  // Step 2: Mark all dish events for this raw entry as confirmed
  const dishEvents = await getDishEventsByRawFoodEntryId(rawEntryId);
  const dishEventIds = dishEvents.map((de) => de.id);
  logger.info(FILENAME, 'confirmFoodEntry', 'Marking dish events as confirmed', { dishEventCount: dishEventIds.length });
  await updateDishEventConfirmation(dishEventIds, true);
  logger.info(FILENAME, 'confirmFoodEntry', 'Dish events marked as confirmed successfully');

  // Step 3: Build response with final state
  logger.info(FILENAME, 'confirmFoodEntry', 'Retrieved dish events', { dishEventCount: dishEvents.length });

  const confirmedTriggers = await getConfirmedTriggersByDishEventIds(dishEventIds);
  logger.info(FILENAME, 'confirmFoodEntry', 'Retrieved confirmed triggers', { triggerCount: confirmedTriggers.length });
  
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

  logger.info(FILENAME, 'confirmFoodEntry', 'Food entry confirmation completed', {
    rawEntryId,
    dishCount: dishes.length,
    totalConfirmedTriggers: confirmedTriggers.length
  });

  return {
    entry_id: rawEntryId,
    dishes,
  };
}

/**
 * Fetches all dish events with dish names for the authenticated user.
 * Returns dish events directly using their created_at timestamp.
 */
export async function getFoodEntriesForUser(): Promise<Array<{
  dishEventId: string;
  dishName: string;
  createdAt: number; // timestamp
}>> {
  const userId = await getAuthenticatedUserId();
  logger.info(FILENAME, 'getFoodEntriesForUser', 'Fetching food entries for user', { userId });

  // Get all confirmed dish events for the user with dish names using a join
  const { data: dishEventsData, error: dishEventsError } = await supabase
    .from('dish_events')
    .select(`
      id,
      created_at,
      dish:dish_id (
        id,
        dish_name
      )
    `)
    .eq('user_id', userId)
    .eq('confirmed_by_user', true)
    .order('created_at', { ascending: false });

  if (dishEventsError) {
    logger.error(FILENAME, 'getFoodEntriesForUser', 'Failed to fetch dish events', dishEventsError);
    throw new Error(`Failed to fetch dish events: ${dishEventsError.message}`);
  }

  if (!dishEventsData) {
    logger.info(FILENAME, 'getFoodEntriesForUser', 'No dish events found');
    return [];
  }

  logger.info(FILENAME, 'getFoodEntriesForUser', 'Retrieved dish events', { count: dishEventsData.length });

  // Map to simplified format
  const result = dishEventsData.map((row: any) => {
    const dish = row.dish;
    const dishName = dish?.dish_name || 'Unknown';
    const createdAt = new Date(row.created_at).getTime();

    return {
      dishEventId: row.id,
      dishName,
      createdAt,
    };
  });

  logger.info(FILENAME, 'getFoodEntriesForUser', 'Food entries fetched successfully', { entryCount: result.length });
  return result;
}
