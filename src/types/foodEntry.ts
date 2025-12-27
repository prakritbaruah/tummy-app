// API request/response types for food entry creation and confirmation

export interface ExtractedDish {
  dish_fragment_text: string;
  dish_name_suggestion: string;
}

export interface ConfirmedDish {
  dish_event_id: string;
  dish_id: string;
  final_dish_name: string;
  trigger_ids: string[];
}

export interface CreateFoodEntryRequest {
  raw_entry_text: string;
}

export interface DishWithTriggers {
  dish_event_id: string;
  dish_id: string;
  dish_name: string;
  predicted_triggers?: Array<{ trigger_id: string; trigger_name: string }>;
  triggers?: Array<{ trigger_id: string; trigger_name: string }>;
}

export interface CreateFoodEntryResponse {
  entry_id: string;
  dishes: DishWithTriggers[];
}

export interface ConfirmFoodEntryRequest {
  confirmed_dishes: ConfirmedDish[];
  occurred_at: number; // Timestamp in milliseconds. Updates all dish_events' occurred_at to reflect when the meal was actually eaten.
}

export interface ConfirmFoodEntryResponse {
  entry_id: string;
  dishes: DishWithTriggers[];
}
