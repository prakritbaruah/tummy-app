// Domain types for dish and trigger system

import { Timestamp } from '@/types/common';

export interface RawFoodEntry {
  id: string;
  userId: string;
  rawEntryText: string;
  createdAt: Timestamp;
}

export interface PredictedDish {
  id: string;
  rawEntryId: string;
  dishFragmentText: string;
  dishNameSuggestion: string;
  modelVersion: string;
  promptVersion: string;
  createdAt: Timestamp;
}

export interface Dish {
  id: string;
  userId: string;
  dishName: string;
  normalizedDishName: string;
  dishEmbeddingId: string | null;
  createdAt: Timestamp;
}

export interface DishEvent {
  id: string;
  userId: string;
  dishId: string;
  predictedDishId: string | null;
  rawEntryId: string;
  confirmedByUser: boolean;
  createdAt: Timestamp;
}

export interface Trigger {
  id: string;
  triggerName: string;
  createdAt: Timestamp;
}

export interface PredictedDishTrigger {
  id: string;
  dishId: string;
  dishEventId: string;
  triggerId: string;
  modelVersion: string;
  promptVersion: string;
  createdAt: Timestamp;
}

export interface DishTrigger {
  id: string;
  dishId: string;
  dishEventId: string;
  triggerId: string;
  createdAt: Timestamp;
}



