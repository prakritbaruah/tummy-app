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
  openaiApiKey: requireEnv(process.env.EXPO_PUBLIC_OPENAI_API_KEY, 'EXPO_PUBLIC_OPENAI_API_KEY'),
};
