// TODO: add updated_at and deleted_at columns

export interface BowelEntryRow {
  id: string;
  user_id: string;
  occurred_at: string;
  urgency: 'Low' | 'Medium' | 'High';
  consistency: number;
  mucus_present: boolean;
  blood_present: boolean;
  notes: string | null;
  created_at: string;
}

export interface SymptomEntryRow {
  id: string;
  user_id: string;
  occurred_at: string;
  symptom: string;
  intensity: string;
  notes: string | null;
  created_at: string;
}

export interface RawFoodEntryRow {
  id: string;
  user_id: string;
  raw_entry_text: string;
  created_at: string;
}

export interface PredictedDishRow {
  id: string;
  raw_entry_id: string;
  dish_fragment_text: string;
  dish_name_suggestion: string;
  model_version: string;
  prompt_version: string;
  created_at: string;
}

export interface DishRow {
  id: string;
  user_id: string;
  dish_name: string;
  normalized_dish_name: string;
  dish_embedding_id: string | null;
  created_at: string;
}

export interface DishEventRow {
  id: string;
  user_id: string;
  dish_id: string;
  predicted_dish_id: string | null;
  raw_entry_id: string;
  confirmed_by_user: boolean;
  deleted_at: string | null;
  created_at: string;
}

export interface TriggerRow {
  id: string;
  trigger_name: string;
  created_at: string;
}

export interface PredictedDishTriggerRow {
  id: string;
  dish_id: string;
  dish_event_id: string;
  trigger_id: string;
  model_version: string;
  prompt_version: string;
  created_at: string;
}

export interface DishTriggerRow {
  id: string;
  dish_id: string;
  dish_event_id: string;
  trigger_id: string;
  created_at: string;
}
