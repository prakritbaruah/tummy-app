import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBowelEntry, listBowelEntries } from '@/data/bowelRepo';
import { supabase } from '@/lib/supabase';
import { BowelEntry } from '@/types/bowel';
import { BowelEntryRow } from '@/types/supabase';

const originalFrom = supabase.from;
const originalAuth = supabase.auth;

const mockUser = { id: 'test-user-123' };

const mockAuth = () => {
  (supabase as any).auth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    }),
  };
};

const mockListChain = (rows: BowelEntryRow[] | null, error: Error | null = null) => {
  const order = vi.fn().mockResolvedValue({ data: rows, error });
  const is = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ is });
  (supabase as any).from = vi.fn().mockReturnValue({ select });
  return { order, is, select };
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
  (supabase as any).auth = originalAuth;
  vi.restoreAllMocks();
});

describe('bowelRepo', () => {
  it('lists entries for a user', async () => {
    mockAuth();
    const row: BowelEntryRow = {
      id: 'b1',
      user_id: mockUser.id,
      occurred_at: new Date(1710000000000).toISOString(),
      urgency: 'Medium',
      consistency: 4,
      mucus_present: false,
      blood_present: false,
      notes: null,
      created_at: new Date().toISOString(),
      deleted_at: null,
    };
    const { is, order } = mockListChain([row]);

    const entries = await listBowelEntries();

    expect(order).toHaveBeenCalledWith('occurred_at', { ascending: false });
    expect(is).toHaveBeenCalledWith('deleted_at', null);
    expect(entries[0]).toMatchObject({
      id: 'b1',
      urgency: 'Medium',
      consistency: 4,
    });
  });

  it('surfaces errors when listing', async () => {
    mockAuth();
    mockListChain(null, new Error('list failed'));
    await expect(listBowelEntries()).rejects.toThrow('list failed');
  });

  it('creates an entry and returns mapped data', async () => {
    const entry: BowelEntry = {
      id: 'b2',
      occurredAt: 1710000000000,
      urgency: 'High',
      consistency: 5,
      mucusPresent: true,
      bloodPresent: false,
      deletedAt: null,
    };
    const row: BowelEntryRow = {
      id: entry.id,
      user_id: mockUser.id,
      occurred_at: new Date(entry.occurredAt).toISOString(),
      urgency: entry.urgency,
      consistency: entry.consistency,
      mucus_present: entry.mucusPresent,
      blood_present: entry.bloodPresent,
      notes: null,
      created_at: new Date().toISOString(),
      deleted_at: null,
    };
    const { insert } = mockInsertChain(row);

    const saved = await createBowelEntry(entry);

    expect(insert).toHaveBeenCalled();
    expect(saved).toMatchObject({
      id: 'b2',
      urgency: 'High',
    });
  });

  it('surfaces errors when insert fails', async () => {
    mockAuth();
    mockInsertChain(null, new Error('insert failed'));
    const entry: BowelEntry = {
      id: 'b3',
      occurredAt: 1710000000000,
      urgency: 'Low',
      consistency: 3,
      mucusPresent: false,
      bloodPresent: false,
      deletedAt: null,
    };
    await expect(createBowelEntry(entry)).rejects.toThrow('insert failed');
  });
});
