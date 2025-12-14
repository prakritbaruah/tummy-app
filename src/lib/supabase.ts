import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// TODO: fix with auth
// Singleton Supabase client for the app. Auth will be wired later; for now we keep
// session persistence off and rely on explicit user ids passed to repo methods.
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
