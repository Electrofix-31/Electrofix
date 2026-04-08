import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const serviceKeyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseAdmin = createClient(urlMatch[1].trim(), serviceKeyMatch[1].trim());

async function purge() {
  console.log("Purge de tous les rendez-vous en cours...");
  
  // Utiliser une condition qui est toujours vraie (neq id à un uuid bidon) pour supprimer tout
  const { data, error, count } = await supabaseAdmin
    .from('appointments')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select();
    
  if (error) {
    console.error("Erreur SQL:", error);
  } else {
    console.log("Succès ! Nombre de RDV supprimés :", data.length);
  }
}

purge();
