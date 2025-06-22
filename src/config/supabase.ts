import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://tvxlzhfqkpqrletyxcyt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2eGx6aGZxa3BxcmxldHl4Y3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MzY4ODUsImV4cCI6MjA2NjExMjg4NX0.9Il6WxU6TW-PYNwJbTjNEzsvZVK0-7HFZ8j_SL-9eps';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}); 