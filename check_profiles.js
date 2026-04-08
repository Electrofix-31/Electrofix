import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (data && data.length > 0) {
    console.log("Colonnes détectées :", Object.keys(data[0]));
  } else {
    // Si la table est vide, on cherche d'une autre façon ou on essaie juste id, email, role
    console.log("Table vide ou erreur. Test simple avec id, email, role.");
  }
}

check();
