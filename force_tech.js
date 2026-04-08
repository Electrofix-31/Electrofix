import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const serviceKeyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), serviceKeyMatch[1].trim());

async function force() {
  console.log("Tentative de forçage de tech03 sur le terrain...");
  
  // 1. Trouver tech03
  const { data: profile } = await supabase.from('profiles').select('id').eq('email', 'tech03@tondomaine.ovh').single();
  
  if (!profile) {
    console.log("tech03 non trouvé dans profiles");
    return;
  }
  
  // 2. Mettre à jour technicians
  const { data, error } = await supabase
    .from('technicians')
    .update({ is_available_field: true, is_available_store: true })
    .eq('profile_id', profile.id)
    .select();
    
  if (error) console.log("Erreur SQL:", error);
  else console.log("Succès, nouvel état:", data);
}

force();
