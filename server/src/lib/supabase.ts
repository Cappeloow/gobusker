import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('Initializing Supabase client...');
console.log(`Supabase URL configured: ${supabaseUrl ? 'Yes' : 'No'}`);
console.log(`Supabase Key configured: ${supabaseKey ? 'Yes' : 'No'}`);

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
console.log('Supabase client created successfully');