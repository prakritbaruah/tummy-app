import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBowelEntry, listBowelEntries } from '../../src/data/bowelRepo';
import { supabase } from '../../src/lib/supabase';
import { BowelEntry } from '../../src/types/bowel';
import { BowelEntryRow } from '../../src/types/supabase';

const originalFrom = supabase.from;

const mockListChain = (rows: BowelEntryRow[] | null, error: Error | null = null) => {
  const order = vi.fn().mockReturnValue(Promise.resolve({ data: rows, error }));
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq, order });
  (supabase as any).from = vi.fn().mockReturnValue({ select });
  return { order, eq, select };
};

const mockInsertChain = (row: BowelEntryRow | null, error: Error | null = null) => {
  const single = vi.fn().mockReturnValue(Promise.resolve({ data: row, error }));
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  (supabase as any).from = vi.fn().mockReturnValue({ insert });
  return { insert, select, single };
};

afterEach(() => {
  (supabase as any).from = originalFrom;
  vi.restoreAllMocks();
});

describe('bowelRepo', () => {
  it('lists entries for a user', async () => {
    const row: BowelEntryRow = {
      id: 'b1',
      user_id: 'user-1',
      occurred_at: new Date(1710000000000).toISOString(),
      urgency: 'Medium',
      consistency: 4,
      mucus_present: false,
      blood_present: false,
      notes: null,
      created_at: new Date().toISOString(),
    };
    const { order, eq } = mockListChain([row]);

    const entries = await listBowelEntries('user-1');

    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(order).toHaveBeenCalledWith('occurred_at', { ascending: false });
    expect(entries[0]).toMatchObject({
      id: 'b1',
      urgency: 'Medium',
      consistency: 4,
    });
  });

  it('surfaces errors when listing', async () => {
    mockListChain(null, new Error('list failed'));
    await expect(listBowelEntries('user-1')).rejects.toThrow('list failed');
  });

  it('creates an entry and returns mapped data', async () => {
    const entry: BowelEntry = {
      id: 'b2',
      timestamp: 1710000000000,
      urgency: 'High',
      consistency: 5,
      mucusPresent: true,
      bloodPresent: false,
    };
    const row: BowelEntryRow = {
      id: entry.id,
      user_id: 'user-2',
      occurred_at: new Date(entry.timestamp).toISOString(),
      urgency: entry.urgency,
      consistency: entry.consistency,
      mucus_present: entry.mucusPresent,
      blood_present: entry.bloodPresent,
      notes: null,
      created_at: new Date().toISOString(),
    };
    const { insert } = mockInsertChain(row);

    const saved = await createBowelEntry(entry, 'user-2');

    expect(insert).toHaveBeenCalled();
    expect(saved).toMatchObject({
      id: 'b2',
      urgency: 'High',
    });
  });

  it('surfaces errors when insert fails', async () => {
    mockInsertChain(null, new Error('insert failed'));
    const entry: BowelEntry = {
      id: 'b3',
      timestamp: 1710000000000,
      urgency: 'Low',
      consistency: 3,
      mucusPresent: false,
      bloodPresent: false,
    };
    await expect(createBowelEntry(entry, 'user-3')).rejects.toThrow('insert failed');
  });
});
