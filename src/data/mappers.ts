import { BowelEntry, Urgency } from '@/types/bowel';
import { Severity, SymptomEntry } from '@/types/symptoms';
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
  BowelEntryRow,
  DishEventRow,
  DishRow,
  DishTriggerRow,
  PredictedDishRow,
  PredictedDishTriggerRow,
  RawFoodEntryRow,
  SymptomEntryRow,
  TriggerRow,
} from '@/types/supabase';

function toISOString(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

export function toBowelRow(
  entry: BowelEntry,
  userId: string,
): Omit<BowelEntryRow, 'created_at' | 'id'> {
  return {
    user_id: userId,
    occurred_at: toISOString(entry.occurredAt),
    urgency: entry.urgency,
    consistency: entry.consistency,
    mucus_present: entry.mucusPresent,
    blood_present: entry.bloodPresent,
    notes: null,
    // Treat both null and undefined as "not deleted"
    deleted_at: entry.deletedAt != null ? new Date(entry.deletedAt).toISOString() : null,
  };
}

export function fromBowelRow(row: BowelEntryRow): BowelEntry {
  return {
    id: row.id,
    occurredAt: new Date(row.occurred_at).getTime(),
    urgency: row.urgency as Urgency,
    consistency: row.consistency,
    mucusPresent: row.mucus_present,
    bloodPresent: row.blood_present,
    deletedAt: row.deleted_at != null ? new Date(row.deleted_at).getTime() : null,
  };
}


export function toSymptomRow(
  entry: SymptomEntry,
  userId: string,
): Omit<SymptomEntryRow, 'created_at' | 'id'> {
  return {
    user_id: userId,
    occurred_at: toISOString(entry.occurredAt),
    symptom: entry.name,
    intensity: entry.severity,
    notes: null,
    deleted_at: entry.deletedAt != null ? new Date(entry.deletedAt).toISOString() : null,
  };
}

export function fromSymptomRow(row: SymptomEntryRow): SymptomEntry {
  return {
    id: row.id,
    occurredAt: new Date(row.occurred_at).getTime(),
    name: row.symptom as SymptomEntry['name'],
    severity: row.intensity as Severity,
    deletedAt: row.deleted_at != null ? new Date(row.deleted_at).getTime() : null,
  };
}

// Raw Food Entry mappers
export function toRawFoodEntryRow(
  entry: Omit<RawFoodEntry, 'id' | 'createdAt'>,
): Omit<RawFoodEntryRow, 'id' | 'created_at'> {
  return {
    user_id: entry.userId,
    raw_entry_text: entry.rawEntryText,
  };
}

export function fromRawFoodEntryRow(row: RawFoodEntryRow): RawFoodEntry {
  return {
    id: row.id,
    userId: row.user_id,
    rawEntryText: row.raw_entry_text,
    createdAt: new Date(row.created_at).getTime(),
  };
}

// Predicted Dish mappers
export function toPredictedDishRow(
  entry: Omit<PredictedDish, 'id' | 'createdAt'>,
): Omit<PredictedDishRow, 'id' | 'created_at'> {
  return {
    raw_entry_id: entry.rawEntryId,
    dish_fragment_text: entry.dishFragmentText,
    dish_name_suggestion: entry.dishNameSuggestion,
    model_version: entry.modelVersion,
    prompt_version: entry.promptVersion,
  };
}

export function fromPredictedDishRow(row: PredictedDishRow): PredictedDish {
  return {
    id: row.id,
    rawEntryId: row.raw_entry_id,
    dishFragmentText: row.dish_fragment_text,
    dishNameSuggestion: row.dish_name_suggestion,
    modelVersion: row.model_version,
    promptVersion: row.prompt_version,
    createdAt: new Date(row.created_at).getTime(),
  };
}

// Dish mappers
export function toDishRow(entry: Omit<Dish, 'id' | 'createdAt'>): Omit<DishRow, 'id' | 'created_at'> {
  return {
    user_id: entry.userId,
    dish_name: entry.dishName,
    normalized_dish_name: entry.normalizedDishName,
    dish_embedding_id: entry.dishEmbeddingId,
  };
}

export function fromDishRow(row: DishRow): Dish {
  return {
    id: row.id,
    userId: row.user_id,
    dishName: row.dish_name,
    normalizedDishName: row.normalized_dish_name,
    dishEmbeddingId: row.dish_embedding_id,
    createdAt: new Date(row.created_at).getTime(),
  };
}

// Dish Event mappers
export function toDishEventRow(
  entry: Omit<DishEvent, 'id' | 'createdAt'>,
): Omit<DishEventRow, 'id' | 'created_at'> {
  return {
    user_id: entry.userId,
    dish_id: entry.dishId,
    predicted_dish_id: entry.predictedDishId,
    raw_entry_id: entry.rawEntryId,
    confirmed_by_user: entry.confirmedByUser,
    deleted_at: entry.deletedAt != null ? new Date(entry.deletedAt).toISOString() : null,
  };
}

export function fromDishEventRow(row: DishEventRow): DishEvent {
  return {
    id: row.id,
    userId: row.user_id,
    dishId: row.dish_id,
    predictedDishId: row.predicted_dish_id,
    rawEntryId: row.raw_entry_id,
    confirmedByUser: row.confirmed_by_user,
    deletedAt: row.deleted_at !== null ? new Date(row.deleted_at).getTime() : null,
    createdAt: new Date(row.created_at).getTime(),
  };
}

// Trigger mappers
export function fromTriggerRow(row: TriggerRow): Trigger {
  return {
    id: row.id,
    triggerName: row.trigger_name,
    createdAt: new Date(row.created_at).getTime(),
  };
}

// Predicted Dish Trigger mappers
export function toPredictedDishTriggerRow(
  entry: Omit<PredictedDishTrigger, 'id' | 'createdAt'>,
): Omit<PredictedDishTriggerRow, 'id' | 'created_at'> {
  return {
    dish_id: entry.dishId,
    dish_event_id: entry.dishEventId,
    trigger_id: entry.triggerId,
    model_version: entry.modelVersion,
    prompt_version: entry.promptVersion,
  };
}

export function fromPredictedDishTriggerRow(row: PredictedDishTriggerRow): PredictedDishTrigger {
  return {
    id: row.id,
    dishId: row.dish_id,
    dishEventId: row.dish_event_id,
    triggerId: row.trigger_id,
    modelVersion: row.model_version,
    promptVersion: row.prompt_version,
    createdAt: new Date(row.created_at).getTime(),
  };
}

// Dish Trigger mappers
export function toDishTriggerRow(
  entry: Omit<DishTrigger, 'id' | 'createdAt'>,
): Omit<DishTriggerRow, 'id' | 'created_at'> {
  return {
    dish_id: entry.dishId,
    dish_event_id: entry.dishEventId,
    trigger_id: entry.triggerId,
  };
}

export function fromDishTriggerRow(row: DishTriggerRow): DishTrigger {
  return {
    id: row.id,
    dishId: row.dish_id,
    dishEventId: row.dish_event_id,
    triggerId: row.trigger_id,
    createdAt: new Date(row.created_at).getTime(),
  };
}
