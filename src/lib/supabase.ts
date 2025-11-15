import { createClient } from '@supabase/supabase-js';

// Supabase URL and Anon Key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tklerpekhqwcixcyidto.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbGVycGVraHF3Y2l4Y3lpZHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxNDg0MTEsImV4cCI6MjA2MjcyNDQxMX0.Ax1U0iM1HrWa_768UUAJ76ZH0dxnhqLNNOPtgMsK3fY';

// Debug logging
console.log('🔧 Supabase Config Debug:');
console.log('URL:', supabaseUrl ? 'Present' : 'Missing');
console.log('Key:', supabaseAnonKey ? 'Present' : 'Missing');

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  throw new Error(
    'Missing Supabase environment variables. Please click the "Connect to Supabase" button in the top right corner to set up your Supabase connection.'
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Export helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
};