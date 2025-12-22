import { supabase } from '@/lib/supabase';
import { Dish, Trigger } from '@/types/dish';
import { DishRow, TriggerRow } from '@/types/supabase';

/**
 * Normalizes a dish name for matching purposes.
 * - Converts to lowercase
 * - Trims whitespace
 * - Collapses multiple spaces into one
 * - Removes filler words: "and", "with", "or" (case-insensitive)
 */
export function normalizeDishName(name: string): string {
  let normalized = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Collapse multiple spaces

  // Remove filler words (with word boundaries to avoid partial matches)
  const fillerWords = ['and', 'with', 'or'];
  for (const word of fillerWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(regex, ' ').trim();
  }

  // Collapse spaces again after removing filler words
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Finds an existing dish for a user by normalized name, or creates a new one.
 */
export async function findOrCreateDishForUser(args: {
  userId: string;
  dishNameSuggestion: string;
}): Promise<Dish> {
  const normalizedName = normalizeDishName(args.dishNameSuggestion);

  // Try to find existing dish
  const { data: existingDish, error: findError } = await supabase
    .from('dish')
    .select('*')
    .eq('user_id', args.userId)
    .eq('normalized_dish_name', normalizedName)
    .single();

  // TODO: Handle PGRST116 error gracefully
  if (findError && findError.code !== 'PGRST116') {
    throw new Error(`Failed to find dish: ${findError.message}`);
  }

  if (existingDish) {
    return fromDishRow(existingDish as DishRow);
  }

  // Create new dish
  const newDish: Omit<DishRow, 'id' | 'created_at'> = {
    user_id: args.userId,
    dish_name: args.dishNameSuggestion,
    normalized_dish_name: normalizedName,
    dish_embedding_id: null,
  };

  const { data: createdDish, error: createError } = await supabase
    .from('dish')
    .insert(newDish)
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create dish: ${createError.message}`);
  }

  if (!createdDish) {
    throw new Error('Failed to create dish: no data returned');
  }

  return fromDishRow(createdDish as DishRow);
}

/**
 * Gets the most recent confirmed triggers for a dish.
 * Returns triggers from the most recent dish_event that has confirmed triggers.
 */
export async function getMostRecentDishTriggers(dishId: string): Promise<Trigger[]> {
  // Get all confirmed dish_events for this dish, ordered by most recent
  const { data: dishEvents, error: eventsError } = await supabase
    .from('dish_events')
    .select('id, created_at')
    .eq('dish_id', dishId)
    .eq('confirmed_by_user', true)
    .order('created_at', { ascending: false });

  if (eventsError) {
    throw new Error(`Failed to get dish events: ${eventsError.message}`);
  }

  if (!dishEvents || dishEvents.length === 0) {
    return [];
  }

  // For each event (starting with most recent), check if it has triggers
  for (const event of dishEvents) {
    const { data: triggerRows, error: triggersError } = await supabase
      .from('dish_triggers')
      .select(`
        trigger_id,
        triggers:trigger_id (
          id,
          trigger_name,
          created_at
        )
      `)
      .eq('dish_event_id', event.id);

    if (triggersError) {
      // Continue to next event if this one fails
      continue;
    }

    if (triggerRows && triggerRows.length > 0) {
      // Extract and convert triggers
      const triggers: Trigger[] = [];
      const seenIds = new Set<string>();

      for (const row of triggerRows) {
        const trigger = (row as any).triggers;
        if (trigger && !seenIds.has(trigger.id)) {
          seenIds.add(trigger.id);
          triggers.push(fromTriggerRow(trigger as TriggerRow));
        }
      }

      return triggers;
    }
  }

  // No triggers found for any event
  return [];
}

/**
 * Upserts dish triggers for a specific dish event.
 * Deletes existing triggers and inserts new ones.
 */
export async function upsertDishTriggersForEvent(
  dishEventId: string,
  triggerIds: string[],
): Promise<void> {
  // Delete existing triggers for this event
  const { error: deleteError } = await supabase
    .from('dish_triggers')
    .delete()
    .eq('dish_event_id', dishEventId);

  if (deleteError) {
    throw new Error(`Failed to delete existing dish triggers: ${deleteError.message}`);
  }

  // If no triggers to insert, we're done
  if (triggerIds.length === 0) {
    return;
  }

  // Get dish_id from dish_event
  const { data: dishEvent, error: eventError } = await supabase
    .from('dish_events')
    .select('dish_id')
    .eq('id', dishEventId)
    .single();

  if (eventError || !dishEvent) {
    throw new Error(`Failed to find dish event: ${eventError?.message || 'not found'}`);
  }

  // Insert new triggers
  const newTriggers = triggerIds.map((triggerId) => ({
    dish_id: dishEvent.dish_id,
    dish_event_id: dishEventId,
    trigger_id: triggerId,
  }));

  const { error: insertError } = await supabase
    .from('dish_triggers')
    .insert(newTriggers);

  if (insertError) {
    throw new Error(`Failed to insert dish triggers: ${insertError.message}`);
  }
}

// Helper functions to convert rows to domain types
function fromDishRow(row: DishRow): Dish {
  return {
    id: row.id,
    userId: row.user_id,
    dishName: row.dish_name,
    normalizedDishName: row.normalized_dish_name,
    dishEmbeddingId: row.dish_embedding_id,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function fromTriggerRow(row: TriggerRow): Trigger {
  return {
    id: row.id,
    triggerName: row.trigger_name,
    createdAt: new Date(row.created_at).getTime(),
  };
}



