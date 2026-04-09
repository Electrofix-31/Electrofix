import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.replace(/"/g, '');

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles!appointments_client_id_fkey(email, first_name, last_name, phone),
        services(name, price),
        equipment_types(name, equipment_categories(name)),
        warranty_types(name)
      `)
      .eq('date', '2026-04-15')
      .order('start_time', { ascending: true });
  console.log("Error:", error);
  console.log("Data length:", data?.length);
}
check();
