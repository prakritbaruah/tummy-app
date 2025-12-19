#!/usr/bin/env tsx
/**
 * Verification script for Supabase integration test setup
 * 
 * Run with: npx tsx __tests__/integration/verify-setup.ts
 * 
 * This script verifies that:
 * 1. Test environment variables are set
 * 2. Can connect to test Supabase instance
 * 3. Test user exists
 * 4. Triggers table is populated
 * 5. Required tables exist
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_TEST_URL;
const supabaseAnonKey = process.env.SUPABASE_TEST_ANON_KEY;
const supabaseSecretKey = process.env.SUPABASE_TEST_SECRET_KEY;
const testUserId = process.env.SUPABASE_TEST_USER_ID;

const requiredTriggers = ['gluten', 'dairy', 'nuts', 'caffeine', 'sugar', 'red_meat'];

async function verifySetup() {
  console.log('🔍 Verifying Supabase integration test setup...\n');

  // 1. Check environment variables
  console.log('1. Checking environment variables...');
  const missingVars: string[] = [];
  if (!supabaseUrl) missingVars.push('SUPABASE_TEST_URL');
  if (!supabaseAnonKey) missingVars.push('SUPABASE_TEST_ANON_KEY');
  if (!supabaseSecretKey) missingVars.push('SUPABASE_TEST_SECRET_KEY');
  if (!testUserId) missingVars.push('SUPABASE_TEST_USER_ID');

  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:', missingVars.join(', '));
    console.error('   Please set these in your .env.local file');
    process.exit(1);
  }
  console.log('✅ All environment variables are set\n');

  // 2. Test connection with anon key
  console.log('2. Testing connection to Supabase...');
  const anonClient = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data, error } = await anonClient.from('triggers').select('trigger_name').limit(1);
    if (error) {
      console.error('❌ Failed to connect:', error.message);
      process.exit(1);
    }
    console.log('✅ Successfully connected to Supabase\n');
  } catch (error) {
    console.error('❌ Connection error:', error);
    process.exit(1);
  }

  // 3. Test connection with service role key
  console.log('3. Testing service role access...');
  const adminClient = createClient(supabaseUrl!, supabaseSecretKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data, error } = await adminClient.auth.admin.getUserById(testUserId!);
    if (error && error.message !== 'User not found') {
      console.error('❌ Failed to access admin API:', error.message);
      process.exit(1);
    }
    if (data?.user) {
      console.log(`✅ Test user exists: ${data.user.email || testUserId}\n`);
    } else {
      console.log(`⚠️  Test user not found (ID: ${testUserId})`);
      console.log('   This is okay if you plan to create the user during tests\n');
    }
  } catch (error) {
    console.error('❌ Admin API error:', error);
    process.exit(1);
  }

  // 4. Check triggers table
  console.log('4. Checking triggers table...');
  try {
    const { data: triggers, error } = await adminClient
      .from('triggers')
      .select('trigger_name');

    if (error) {
      console.error('❌ Failed to query triggers:', error.message);
      process.exit(1);
    }

    const triggerNames = triggers?.map((t) => t.trigger_name) || [];
    const missingTriggers = requiredTriggers.filter((t) => !triggerNames.includes(t));

    if (missingTriggers.length > 0) {
      console.error('❌ Missing triggers:', missingTriggers.join(', '));
      console.error('   Run the seed SQL in the README to populate triggers');
      process.exit(1);
    }

    console.log(`✅ All required triggers exist (${triggerNames.length} total)\n`);
  } catch (error) {
    console.error('❌ Error checking triggers:', error);
    process.exit(1);
  }

  // 5. Check required tables exist
  console.log('5. Checking required tables...');
  const requiredTables = [
    'raw_entry',
    'predicted_dish',
    'dish',
    'dish_events',
    'triggers',
    'predicted_dish_triggers',
    'dish_triggers',
  ];

  const missingTables: string[] = [];
  for (const table of requiredTables) {
    try {
      const { error } = await adminClient.from(table).select('*').limit(0);
      if (error && error.code === '42P01') {
        // Table doesn't exist
        missingTables.push(table);
      } else if (error && error.code !== 'PGRST116') {
        // Other error (PGRST116 is "no rows returned" which is fine)
        console.warn(`⚠️  Warning querying ${table}:`, error.message);
      }
    } catch (error) {
      console.warn(`⚠️  Warning checking ${table}:`, error);
    }
  }

  if (missingTables.length > 0) {
    console.error('❌ Missing tables:', missingTables.join(', '));
    console.error('   Run migrations: supabase db reset (local) or apply migrations to cloud');
    process.exit(1);
  }

  console.log(`✅ All required tables exist (${requiredTables.length} tables)\n`);

  // Success!
  console.log('🎉 Setup verification complete!');
  console.log('   Your integration test environment is ready.\n');
  console.log('   Run tests with: npm test -- __tests__/integration\n');
}

verifySetup().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
