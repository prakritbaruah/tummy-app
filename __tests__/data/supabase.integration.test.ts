import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

// Requires a real Supabase project with the migration applied.
const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

describe('supabase integration (service role)', () => {
  if (!supabaseUrl || !secretKey) {
    throw new Error('SUPABASE_URL or SUPABASE_SECRET_KEY are not set');
  }

  const testUserId = process.env.SUPABASE_TEST_USER_ID;
  if (!testUserId) {
    throw new Error('SUPABASE_TEST_USER_ID is not set');
  }

  const client = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  
  it(
    'round-trips a bowel entry',
    async () => {
      const now = new Date().toISOString();
      const insert = await client
        .from('bowel_entries')
        .insert({
          user_id: testUserId,
          occurred_at: now,
          urgency: 'Low',
          consistency: 3,
          mucus_present: false,
          blood_present: false,
          notes: 'integration test',
        })
        .select()
        .single();

      expect(insert.error).toBeNull();
      const insertedId = insert.data.id as string;

      const fetched = await client
        .from('bowel_entries')
        .select('*')
        .eq('id', insertedId)
        .single();

      expect(fetched.error).toBeNull();
      expect(fetched.data?.user_id).toBe(testUserId);

      await client.from('bowel_entries').delete().eq('id', insertedId);
    },
    15000,
  );
});
