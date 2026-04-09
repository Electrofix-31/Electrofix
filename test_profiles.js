import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.replace(/"/g, '');

const supabaseAdmin = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

async function check() {
  const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        client_id,
        profiles!appointments_client_id_fkey(first_name, last_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(3);
  console.log("Données avec droits Admin :");
  console.dir(data, { depth: null });
}
check();
