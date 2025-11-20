import { createClient } from '@supabase/supabase-js';

// Get environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate that required environment variables are present
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ [Supabase] Missing required environment variables.');
  console.error('Please ensure the following variables are set in your .env file:');
  console.error('  - VITE_SUPABASE_URL: Your Supabase project URL (must use HTTPS)');
  console.error('  - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous/public key');
  console.error('');
  console.error('Example .env file:');
  console.error('  VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('  VITE_SUPABASE_ANON_KEY=your-anon-key-here');
  console.error('');
  console.error('Get these values from: https://app.supabase.com/project/_/settings/api');
  throw new Error('Missing required Supabase configuration. Check console for details.');
}

// Validate that URL uses HTTPS (required for production)
if (!SUPABASE_URL.startsWith('https://')) {
  console.error('❌ [Supabase] Invalid Supabase URL - must use HTTPS');
  console.error(`Current URL: ${SUPABASE_URL}`);
  console.error('Supabase URLs must start with https:// for security');
  throw new Error('Invalid Supabase URL - HTTPS required');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-app-module': 'tabungan',
      // Alias headers to accommodate backend variations
      'x-module': 'tabungan',
      'x-source-module': 'tabungan',
    }
  }
});