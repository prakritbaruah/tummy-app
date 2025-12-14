import { describe, expect, it } from 'vitest';

import { toBowelRow, fromBowelRow, toFoodRow, fromFoodRow, toSymptomRow, fromSymptomRow } from '../../src/data/mappers';
import { BowelEntry } from '../../src/types/bowel';
import { FoodEntry } from '../../src/types/food';
import { SymptomEntry } from '../../src/types/symptoms';

describe('mappers', () => {
  it('round-trips bowel entries', () => {
    const entry: BowelEntry = {
      id: 'b1',
      timestamp: 1710000000000,
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

  it('round-trips food entries', () => {
    const entry: FoodEntry = {
      id: 'f1',
      timestamp: 1710000000000,
      name: 'Toast',
      quantity: '1 slice',
      notes: 'With jam',
    };

    const row = toFoodRow(entry, 'user-123');
    expect(row.name).toBe('Toast');
    expect(row.quantity).toBe('1 slice');

    const mapped = fromFoodRow({
      id: 'f1',
      ...row,
      created_at: new Date().toISOString(),
      notes: row.notes,
    });
    expect(mapped).toEqual(entry);
  });

  it('round-trips symptom entries', () => {
    const entry: SymptomEntry = {
      id: 's1',
      timestamp: 1710000000000,
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
});
