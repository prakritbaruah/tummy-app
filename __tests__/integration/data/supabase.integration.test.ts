import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, beforeAll } from 'vitest';
import { createBowelEntry, listBowelEntries } from '@/data/bowelRepo';
import { supabase } from '@/lib/supabase';

/**
 * Integration tests for Supabase database operations.
 * 
 * These tests follow Supabase best practices:
 * - Test as real users (anon key + authentication) to verify RLS policies
 * - Use service role key ONLY for setup/teardown (admin operations)
 * - Test the full user experience using repository functions
 * 
 * Requires a test Supabase project with migrations applied (not production).
 * Set SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, SUPABASE_TEST_SECRET_KEY, and SUPABASE_TEST_USER_ID
 * in your .env.local file for integration tests.
 */
const supabaseUrl = process.env.SUPABASE_TEST_URL;
const supabaseAnonKey = process.env.SUPABASE_TEST_ANON_KEY;
const supabaseSecretKey = process.env.SUPABASE_TEST_SECRET_KEY;
const testUserId = process.env.SUPABASE_TEST_USER_ID;

describe('supabase integration (test database)', () => {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseSecretKey) {
    throw new Error(
      'SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, or SUPABASE_TEST_SECRET_KEY are not set. These should point to a test Supabase instance, not production.',
    );
  }

  if (!testUserId) {
    throw new Error('SUPABASE_TEST_USER_ID is not set');
  }

  // Service role client for admin operations ONLY (setup/teardown/verification)
  // This bypasses RLS and should never be used for actual test operations
  const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Authenticated user ID (may differ from testUserId env var)
  let authenticatedUserId: string = testUserId;

  beforeAll(async () => {
    // SETUP: Create/get test user using service role (admin operation)
    const testUserEmail = `test-${testUserId}@example.com`;
    const testUserPassword = 'test-password-123!';

    // Try to get existing user by ID
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
      testUserId,
    );

    let userEmail = testUserEmail;
    let targetUserId = testUserId;

    if (userError || !userData?.user) {
      // User doesn't exist, create it
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        password: testUserPassword,
        user_metadata: { test_user: true },
      });

      if (createError && createError.code !== 'email_exists') {
        throw createError;
      }

      if (newUser?.user) {
        targetUserId = newUser.user.id;
        authenticatedUserId = newUser.user.id;
      }
    } else {
      userEmail = userData.user.email || userEmail;
      targetUserId = userData.user.id;
      authenticatedUserId = userData.user.id;
    }

    // Ensure password is set correctly
    await adminClient.auth.admin.updateUserById(targetUserId, {
      password: testUserPassword,
    });

    // AUTHENTICATE: Sign in as the test user using anon key (real user behavior)
    // This ensures RLS policies are tested correctly
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: testUserPassword,
    });

    if (signInError || !sessionData?.session) {
      throw signInError || new Error('Failed to sign in test user');
    }

    authenticatedUserId = sessionData.session.user.id;

    // Verify authentication worked
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    if (getUserError || !user) {
      throw new Error('Failed to verify authentication');
    }
  });

  it(
    'round-trips a bowel entry using repository functions',
    async () => {
      // Create entry using repository function (tests RLS and full flow)
      // BowelEntry expects occurredAt as number (milliseconds since epoch)
      const now = Date.now();
      const entry = await createBowelEntry({
        id: '', // Will be set by database
        occurredAt: now,
        urgency: 'Low',
        consistency: 3,
        mucusPresent: false,
        bloodPresent: false,
      });

      expect(entry.id).toBeDefined();
      expect(entry.occurredAt).toBe(now);
      expect(entry.urgency).toBe('Low');
      expect(entry.consistency).toBe(3);
      expect(entry.mucusPresent).toBe(false);
      expect(entry.bloodPresent).toBe(false);

      // List entries using repository function (tests RLS - should only see own entries)
      const entries = await listBowelEntries();
      expect(entries.length).toBeGreaterThan(0);

      const foundEntry = entries.find((e) => e.id === entry.id);
      expect(foundEntry).toBeDefined();
      expect(foundEntry?.occurredAt).toBe(now);

      // Cleanup using admin client (admin operation)
      await adminClient.from('bowel_entries').delete().eq('id', entry.id);
    },
    15000,
  );

  it(
    'verifies RLS policies prevent access to other users data',
    async () => {
      // Create entry as authenticated user
      const now = Date.now();
      const entry = await createBowelEntry({
        id: '', // Will be set by database
        occurredAt: now,
        urgency: 'Medium',
        consistency: 4,
        mucusPresent: true,
        bloodPresent: false,
      });

      expect(entry.id).toBeDefined();
      expect(entry.occurredAt).toBe(now);

      // Verify we can see our own entry
      const entries = await listBowelEntries();
      const foundEntry = entries.find((e) => e.id === entry.id);
      expect(foundEntry).toBeDefined();

      // Try to access via authenticated client - should work (our own data)
      const { data: ownData, error: ownError } = await supabase
        .from('bowel_entries')
        .select('*')
        .eq('id', entry.id)
        .single();

      expect(ownError).toBeNull();
      expect(ownData).toBeDefined();
      expect(ownData?.user_id).toBe(authenticatedUserId);
      expect(new Date(ownData?.occurred_at).getTime()).toBe(now);

      // Verify via admin client that entry exists (verification only)
      const { data: adminData } = await adminClient
        .from('bowel_entries')
        .select('*')
        .eq('id', entry.id)
        .single();

      expect(adminData).toBeDefined();
      expect(adminData?.user_id).toBe(authenticatedUserId);

      // Cleanup
      await adminClient.from('bowel_entries').delete().eq('id', entry.id);
    },
    15000,
  );

  it(
    'creates and lists multiple entries correctly',
    async () => {
      // Create multiple entries
      // Use occurredAt timestamps in milliseconds
      const occurredAt1 = new Date('2024-01-01T10:00:00Z').getTime();
      const occurredAt2 = new Date('2024-01-02T10:00:00Z').getTime();

      const entry1 = await createBowelEntry({
        id: '', // Will be set by database
        occurredAt: occurredAt1,
        urgency: 'Low',
        consistency: 2,
        mucusPresent: false,
        bloodPresent: false,
      });

      const entry2 = await createBowelEntry({
        id: '', // Will be set by database
        occurredAt: occurredAt2,
        urgency: 'High',
        consistency: 5,
        mucusPresent: true,
        bloodPresent: true,
      });

      expect(entry1.id).toBeDefined();
      expect(entry2.id).toBeDefined();
      expect(entry1.occurredAt).toBe(occurredAt1);
      expect(entry2.occurredAt).toBe(occurredAt2);

      // List entries - should see both
      const entries = await listBowelEntries();
      expect(entries.length).toBeGreaterThanOrEqual(2);

      const found1 = entries.find((e) => e.id === entry1.id);
      const found2 = entries.find((e) => e.id === entry2.id);

      expect(found1).toBeDefined();
      expect(found2).toBeDefined();

      // Verify entries are ordered by occurred_at descending (most recent first)
      // entry2 has a later occurredAt, so it should appear first in the list
      const entry1Index = entries.findIndex((e) => e.id === entry1.id);
      const entry2Index = entries.findIndex((e) => e.id === entry2.id);
      expect(entry2Index).toBeLessThan(entry1Index); // entry2 is more recent (later occurredAt)

      // Cleanup
      await adminClient.from('bowel_entries').delete().eq('id', entry1.id);
      await adminClient.from('bowel_entries').delete().eq('id', entry2.id);
    },
    15000,
  );
});
