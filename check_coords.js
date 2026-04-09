import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function check() {
  const { data: apps } = await supabase.from('appointments').select('id, client_postal_code, latitude, longitude');
  console.log("Coordonnées des rendez-vous en base :");
  apps.forEach(a => console.log(`- CP: ${a.client_postal_code}, Lat: ${a.latitude}, Lon: ${a.longitude}`));
}

check();
