import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.replace(/"/g, '');

const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

async function check() {
  const { data, error } = await supabase.from('appointments').select('id, date, status, payment_status, stripe_payment_intent_id').order('created_at', { ascending: false }).limit(5);
  console.log("Latest Appointments:");
  console.log(data);
}
check();
