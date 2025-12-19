// Set up test environment variables
process.env.SUPABASE_TEST_USER_ID =
  process.env.SUPABASE_TEST_USER_ID ?? '00000000-0000-0000-0000-000000000000';

// For integration tests: if test Supabase credentials are provided, use them instead of production
// This ensures integration tests use a test database, not production
// This must happen BEFORE the supabase singleton is imported
if (process.env.SUPABASE_TEST_URL && process.env.SUPABASE_TEST_ANON_KEY) {
  process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.SUPABASE_TEST_URL;
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY;
}

// Mock window and other browser globals for Node.js test environment
if (typeof window === 'undefined') {
  (global as any).window = {
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    },
  };
}

// Mock document if needed
if (typeof document === 'undefined') {
  (global as any).document = {};
}

export {};