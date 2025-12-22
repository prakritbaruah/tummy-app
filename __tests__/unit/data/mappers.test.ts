import { describe, expect, it } from 'vitest';

import {
  toBowelRow,
  fromBowelRow,
  toSymptomRow,
  fromSymptomRow,
  toRawFoodEntryRow,
  fromRawFoodEntryRow,
  toPredictedDishRow,
  fromPredictedDishRow,
  toDishRow,
  fromDishRow,
  toDishEventRow,
  fromDishEventRow,
  fromTriggerRow,
  toPredictedDishTriggerRow,
  fromPredictedDishTriggerRow,
  toDishTriggerRow,
  fromDishTriggerRow,
} from '@/data/mappers';
import { BowelEntry } from '@/types/bowel';
import { SymptomEntry } from '@/types/symptoms';
import {
  Dish,
  DishEvent,
  DishTrigger,
  PredictedDish,
  PredictedDishTrigger,
  RawFoodEntry,
  Trigger,
} from '@/types/dish';

describe('mappers', () => {
  it('round-trips bowel entries', () => {
    const entry: BowelEntry = {
      id: 'b1',
      occurredAt: 1710000000000,
      urgency: 'Medium',
      consistency: 4,
      mucusPresent: true,
      bloodPresent: false,
    };

    const row = toBowelRow(entry, 'user-123');
    expect(row.user_id).toBe('user-123');
    expect(row.urgency).toBe('Medium');

    const mapped = fromBowelRow({
      id: 'b1',
      ...row,
      created_at: new Date().toISOString(),
    });
    expect(mapped).toEqual(entry);
  });

  it('round-trips symptom entries', () => {
    const entry: SymptomEntry = {
      id: 's1',
      occurredAt: 1710000000000,
      name: 'Bloating',
      severity: 'High',
    };

    const row = toSymptomRow(entry, 'user-123');
    expect(row.symptom).toBe('Bloating');

    const mapped = fromSymptomRow({
      id: 's1',
      ...row,
      created_at: new Date().toISOString(),
    });
    expect(mapped).toEqual(entry);
  });

  it('round-trips raw food entries', () => {
    const entry: Omit<RawFoodEntry, 'id' | 'createdAt'> = {
      userId: 'user-123',
      rawEntryText: 'Had pizza and pasta for dinner',
    };

    const row = toRawFoodEntryRow(entry);
    expect(row.user_id).toBe('user-123');
    expect(row.raw_entry_text).toBe('Had pizza and pasta for dinner');

    const fullEntry: RawFoodEntry = {
      id: 'rf1',
      ...entry,
      createdAt: 1710000000000,
    };

    const mapped = fromRawFoodEntryRow({
      id: 'rf1',
      ...row,
      created_at: new Date(1710000000000).toISOString(),
    });
    expect(mapped).toEqual(fullEntry);
  });

  it('round-trips predicted dish entries', () => {
    const entry: Omit<PredictedDish, 'id' | 'createdAt'> = {
      rawEntryId: 'rf1',
      dishFragmentText: 'pizza',
      dishNameSuggestion: 'Pizza',
      modelVersion: 'v1.0',
      promptVersion: 'p1.0',
    };

    const row = toPredictedDishRow(entry);
    expect(row.raw_entry_id).toBe('rf1');
    expect(row.dish_fragment_text).toBe('pizza');
    expect(row.dish_name_suggestion).toBe('Pizza');
    expect(row.model_version).toBe('v1.0');
    expect(row.prompt_version).toBe('p1.0');

    const fullEntry: PredictedDish = {
      id: 'pd1',
      ...entry,
      createdAt: 1710000000000,
    };

    const mapped = fromPredictedDishRow({
      id: 'pd1',
      ...row,
      created_at: new Date(1710000000000).toISOString(),
    });
    expect(mapped).toEqual(fullEntry);
  });

  it('round-trips dish entries', () => {
    const entry: Omit<Dish, 'id' | 'createdAt'> = {
      userId: 'user-123',
      dishName: 'Pizza',
      normalizedDishName: 'pizza',
      dishEmbeddingId: 'emb-123',
    };

    const row = toDishRow(entry);
    expect(row.user_id).toBe('user-123');
    expect(row.dish_name).toBe('Pizza');
    expect(row.normalized_dish_name).toBe('pizza');
    expect(row.dish_embedding_id).toBe('emb-123');

    const fullEntry: Dish = {
      id: 'd1',
      ...entry,
      createdAt: 1710000000000,
    };

    const mapped = fromDishRow({
      id: 'd1',
      ...row,
      created_at: new Date(1710000000000).toISOString(),
    });
    expect(mapped).toEqual(fullEntry);
  });

  it('round-trips dish entries with null embedding', () => {
    const entry: Omit<Dish, 'id' | 'createdAt'> = {
      userId: 'user-123',
      dishName: 'Pasta',
      normalizedDishName: 'pasta',
      dishEmbeddingId: null,
    };

    const row = toDishRow(entry);
    expect(row.dish_embedding_id).toBeNull();

    const fullEntry: Dish = {
      id: 'd2',
      ...entry,
      createdAt: 1710000000000,
    };

    const mapped = fromDishRow({
      id: 'd2',
      ...row,
      created_at: new Date(1710000000000).toISOString(),
    });
    expect(mapped).toEqual(fullEntry);
  });

  it('round-trips dish event entries', () => {
    const entry: Omit<DishEvent, 'id' | 'createdAt'> = {
      userId: 'user-123',
      dishId: 'd1',
      predictedDishId: 'pd1',
      rawEntryId: 'rf1',
      confirmedByUser: false,
      deletedAt: null,
    };

    const row = toDishEventRow(entry);
    expect(row.user_id).toBe('user-123');
    expect(row.dish_id).toBe('d1');
    expect(row.predicted_dish_id).toBe('pd1');
    expect(row.raw_entry_id).toBe('rf1');
    expect(row.confirmed_by_user).toBe(false);

    const fullEntry: DishEvent = {
      id: 'de1',
      ...entry,
      createdAt: 1710000000000,
    };

    const mapped = fromDishEventRow({
      id: 'de1',
      ...row,
      created_at: new Date(1710000000000).toISOString(),
    });
    expect(mapped).toEqual(fullEntry);
  });

  it('round-trips dish event entries with null predictedDishId', () => {
    const entry: Omit<DishEvent, 'id' | 'createdAt'> = {
      userId: 'user-123',
      dishId: 'd1',
      predictedDishId: null,
      rawEntryId: 'rf1',
      confirmedByUser: false,
      deletedAt: null,
    };

    const row = toDishEventRow(entry);
    expect(row.predicted_dish_id).toBeNull();
    expect(row.confirmed_by_user).toBe(false);

    const fullEntry: DishEvent = {
      id: 'de2',
      ...entry,
      createdAt: 1710000000000,
    };

    const mapped = fromDishEventRow({
      id: 'de2',
      ...row,
      created_at: new Date(1710000000000).toISOString(),
    });
    expect(mapped).toEqual(fullEntry);
  });

  it('round-trips trigger entries', () => {
    const row = {
      id: 't1',
      trigger_name: 'Bloating',
      created_at: new Date(1710000000000).toISOString(),
    };

    const mapped = fromTriggerRow(row);
    expect(mapped.id).toBe('t1');
    expect(mapped.triggerName).toBe('Bloating');
    expect(mapped.createdAt).toBe(1710000000000);
  });

  it('round-trips predicted dish trigger entries', () => {
    const entry: Omit<PredictedDishTrigger, 'id' | 'createdAt'> = {
      dishId: 'd1',
      dishEventId: 'de1',
      triggerId: 't1',
      modelVersion: 'v1.0',
      promptVersion: 'p1.0',
    };

    const row = toPredictedDishTriggerRow(entry);
    expect(row.dish_id).toBe('d1');
    expect(row.dish_event_id).toBe('de1');
    expect(row.trigger_id).toBe('t1');
    expect(row.model_version).toBe('v1.0');
    expect(row.prompt_version).toBe('p1.0');

    const fullEntry: PredictedDishTrigger = {
      id: 'pdt1',
      ...entry,
      createdAt: 1710000000000,
    };

    const mapped = fromPredictedDishTriggerRow({
      id: 'pdt1',
      ...row,
      created_at: new Date(1710000000000).toISOString(),
    });
    expect(mapped).toEqual(fullEntry);
  });

  it('round-trips dish trigger entries', () => {
    const entry: Omit<DishTrigger, 'id' | 'createdAt'> = {
      dishId: 'd1',
      dishEventId: 'de1',
      triggerId: 't1',
    };

    const row = toDishTriggerRow(entry);
    expect(row.dish_id).toBe('d1');
    expect(row.dish_event_id).toBe('de1');
    expect(row.trigger_id).toBe('t1');

    const fullEntry: DishTrigger = {
      id: 'dt1',
      ...entry,
      createdAt: 1710000000000,
    };

    const mapped = fromDishTriggerRow({
      id: 'dt1',
      ...row,
      created_at: new Date(1710000000000).toISOString(),
    });
    expect(mapped).toEqual(fullEntry);
  });
});
