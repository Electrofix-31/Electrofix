import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function debug() {
  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 1);
  const dateStr = testDate.toISOString().split('T')[0];
  
  console.log("--- DIAGNOSTIC DES CRÉNEAUX POUR LE :", dateStr, "---");

  // 1. Vérifier si des créneaux existent dans la table appointment_slots
  const { data: slots, error: slotError } = await supabase
    .from('appointment_slots')
    .select('*')
    .eq('date', dateStr);
    
  console.log("Nb de créneaux trouvés dans la table :", slots?.length || 0);
  if (slots && slots.length > 0) {
    console.log("Exemple de créneau :", slots[0]);
  }

  // 2. Vérifier les techniciens terrain
  const { data: techs } = await supabase.from('technicians').select('*').eq('is_available_field', true);
  console.log("Nb de techniciens TERRAIN trouvés :", techs?.length || 0);

  // 3. Simuler le calcul de l'API
  const totalFieldCapacity = techs?.length || 1;
  const isAvailable = (0 < totalFieldCapacity); // 0 rdv pris pour le test
  console.log("isAvailable calculé pour un créneau vide :", isAvailable);
}

debug();
