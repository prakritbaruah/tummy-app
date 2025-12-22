import { supabase } from '@/lib/supabase';
import {
  Dish,
  DishEvent,
  DishTrigger,
  PredictedDish,
  PredictedDishTrigger,
  RawFoodEntry,
  Trigger,
} from '@/types/dish';
import {
  DishEventRow,
  DishRow,
  DishTriggerRow,
  PredictedDishRow,
  PredictedDishTriggerRow,
  RawFoodEntryRow,
  TriggerRow,
} from '@/types/supabase';
import {
  fromDishEventRow,
  fromDishRow,
  fromDishTriggerRow,
  fromPredictedDishRow,
  fromPredictedDishTriggerRow,
  fromRawFoodEntryRow,
  fromTriggerRow,
  toDishEventRow,
  toDishRow,
  toDishTriggerRow,
  toPredictedDishRow,
  toPredictedDishTriggerRow,
  toRawFoodEntryRow,
} from '@/data/mappers';
import { handleError } from '@/data/utils';

// Raw Food Entry operations
export async function createRawFoodEntry(
  userId: string,
  rawEntryText: string,
): Promise<RawFoodEntry> {
  const row = toRawFoodEntryRow({ userId, rawEntryText });

  const { data, error } = await supabase
    .from('raw_entry')
    .insert(row)
    .select()
    .single();

  if (error) {
    handleError(error);
  }

  if (!data) {
    throw new Error('Failed to create raw food entry');
  }

  return fromRawFoodEntryRow(data as RawFoodEntryRow);
}

// Predicted Dish operations
export async function createPredictedDish(
  predictedDish: Omit<PredictedDish, 'id' | 'createdAt'>,
): Promise<PredictedDish> {
  const row = toPredictedDishRow(predictedDish);

  const { data, error } = await supabase
    .from('predicted_dish')
    .insert(row)
    .select()
    .single();

  if (error) {
    handleError(error);
  }

  if (!data) {
    throw new Error('Failed to create predicted dish');
  }

  return fromPredictedDishRow(data as PredictedDishRow);
}

// Dish operations
export async function createDish(dish: Omit<Dish, 'id' | 'createdAt'>): Promise<Dish> {
  const row = toDishRow(dish);

  const { data, error } = await supabase
    .from('dish')
    .insert(row)
    .select()
    .single();

  if (error) {
    handleError(error);
  }

  if (!data) {
    throw new Error('Failed to create dish');
  }

  return fromDishRow(data as DishRow);
}

export async function findDishByNormalizedName(
  userId: string,
  normalizedName: string,
): Promise<Dish | null> {
  const { data, error } = await supabase
    .from('dish')
    .select('*')
    .eq('user_id', userId)
    .eq('normalized_dish_name', normalizedName)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found - this is expected
      return null;
    }
    handleError(error);
  }

  if (!data) {
    return null;
  }

  return fromDishRow(data as DishRow);
}

export async function updateDish(
  dishId: string,
  updates: { dishName?: string; normalizedDishName?: string },
): Promise<Dish> {
  const updateData: Partial<DishRow> = {};
  if (updates.dishName !== undefined) {
    updateData.dish_name = updates.dishName;
  }
  if (updates.normalizedDishName !== undefined) {
    updateData.normalized_dish_name = updates.normalizedDishName;
  }

  const { data, error } = await supabase
    .from('dish')
    .update(updateData)
    .eq('id', dishId)
    .select()
    .single();

  if (error) {
    handleError(error);
  }

  if (!data) {
    throw new Error('Failed to update dish');
  }

  return fromDishRow(data as DishRow);
}

// Dish Event operations
export async function createDishEvent(
  dishEvent: Omit<DishEvent, 'id' | 'createdAt'>,
): Promise<DishEvent> {
  const row = toDishEventRow(dishEvent);

  const { data, error } = await supabase
    .from('dish_events')
    .insert(row)
    .select()
    .single();

  if (error) {
    handleError(error);
  }

  if (!data) {
    throw new Error('Failed to create dish event');
  }

  return fromDishEventRow(data as DishEventRow);
}

// Trigger operations
export async function getTriggersByNames(triggerNames: string[]): Promise<Trigger[]> {
  const { data, error } = await supabase
    .from('triggers')
    .select('*')
    .in('trigger_name', triggerNames);

  if (error) {
    handleError(error);
  }

  if (!data) {
    return [];
  }

  return data.map((row) => fromTriggerRow(row as TriggerRow));
}

export async function getTriggerById(triggerId: string): Promise<Trigger | null> {
  const { data, error } = await supabase
    .from('triggers')
    .select('*')
    .eq('id', triggerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    handleError(error);
  }

  if (!data) {
    return null;
  }

  return fromTriggerRow(data as TriggerRow);
}

// TODO: consider replacing with hardcoded list of triggers
export async function getAllTriggers(): Promise<Trigger[]> {
  const { data, error } = await supabase
    .from('triggers')
    .select('*')
    .order('trigger_name', { ascending: true });

  if (error) {
    handleError(error);
  }

  if (!data) {
    return [];
  }

  return data.map((row) => fromTriggerRow(row as TriggerRow));
}

// Predicted Dish Trigger operations
export async function createPredictedDishTrigger(
  predictedTrigger: Omit<PredictedDishTrigger, 'id' | 'createdAt'>,
): Promise<PredictedDishTrigger> {
  const row = toPredictedDishTriggerRow(predictedTrigger);

  const { data, error } = await supabase
    .from('predicted_dish_triggers')
    .insert(row)
    .select()
    .single();

  if (error) {
    handleError(error);
  }

  if (!data) {
    throw new Error('Failed to create predicted dish trigger');
  }

  return fromPredictedDishTriggerRow(data as PredictedDishTriggerRow);
}

// Dish Trigger operations
export async function createDishTrigger(
  dishTrigger: Omit<DishTrigger, 'id' | 'createdAt'>,
): Promise<DishTrigger> {
  const row = toDishTriggerRow(dishTrigger);

  const { data, error } = await supabase
    .from('dish_triggers')
    .insert(row)
    .select()
    .single();

  if (error) {
    handleError(error);
  }

  if (!data) {
    throw new Error('Failed to create dish trigger');
  }

  return fromDishTriggerRow(data as DishTriggerRow);
}

export async function deleteDishTriggersForEvent(dishEventId: string): Promise<void> {
  const { error } = await supabase
    .from('dish_triggers')
    .delete()
    .eq('dish_event_id', dishEventId);

  if (error) {
    handleError(error);
  }
}

// Get dish events for a raw food entry
export async function getDishEventsByRawFoodEntryId(rawEntryId: string): Promise<DishEvent[]> {
  const { data, error } = await supabase
    .from('dish_events')
    .select('*')
    .eq('raw_entry_id', rawEntryId)
    .order('created_at', { ascending: false });

  if (error) {
    handleError(error);
  }

  if (!data) {
    return [];
  }

  return data.map((row) => fromDishEventRow(row as DishEventRow));
}

// Get predicted triggers for dish events
export async function getPredictedTriggersByDishEventIds(
  dishEventIds: string[],
): Promise<PredictedDishTrigger[]> {
  const { data, error } = await supabase
    .from('predicted_dish_triggers')
    .select('*')
    .in('dish_event_id', dishEventIds);

  if (error) {
    handleError(error);
  }

  if (!data) {
    return [];
  }

  return data.map((row) => fromPredictedDishTriggerRow(row as PredictedDishTriggerRow));
}

// Get confirmed triggers for dish events
export async function getConfirmedTriggersByDishEventIds(
  dishEventIds: string[],
): Promise<DishTrigger[]> {
  const { data, error } = await supabase
    .from('dish_triggers')
    .select('*')
    .in('dish_event_id', dishEventIds);

  if (error) {
    handleError(error);
  }

  if (!data) {
    return [];
  }

  return data.map((row) => fromDishTriggerRow(row as DishTriggerRow));
}

// Update dish events to mark them as confirmed
export async function updateDishEventConfirmation(
  dishEventIds: string[],
  confirmed: boolean = true,
): Promise<void> {
  const { error } = await supabase
    .from('dish_events')
    .update({ confirmed_by_user: confirmed })
    .in('id', dishEventIds);

  if (error) {
    handleError(error);
  }
}
