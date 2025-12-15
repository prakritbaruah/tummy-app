const requireEnv = (value: string | undefined, key: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

// Expo automatically inlines variables prefixed with EXPO_PUBLIC_.
export const env = {
  supabaseUrl: requireEnv(process.env.EXPO_PUBLIC_SUPABASE_URL, 'EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv(
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ),
  // Note: supabaseDevUserId has been removed. All data access now requires authentication.
  // The authenticated user ID is automatically obtained from the Supabase session.
};
