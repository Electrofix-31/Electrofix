import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function test() {
  console.log("Recherche d'un RDV récent...");
  const { data: apps, error: fetchError } = await supabase
    .from('appointments')
    .select('id, profiles!appointments_client_id_fkey(email)')
    .order('created_at', { ascending: false })
    .limit(1);

  if (fetchError || !apps || apps.length === 0) {
    console.error("Impossible de trouver un RDV :", fetchError);
    return;
  }

  const appointmentId = apps[0].id;
  const email = apps[0].profiles?.email;
  console.log(`RDV trouvé : ${appointmentId} (Client : ${email})`);
  
  console.log("Simulation de l'appel à l'API de confirmation (comme la page de succès)...");
  
  try {
    const res = await fetch('http://localhost:3000/api/appointments/send-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: appointmentId })
    });
    
    const text = await res.text();
    console.log(`Status : ${res.status}`);
    console.log(`Réponse : ${text}`);
  } catch (err) {
    console.error("Erreur de fetch :", err);
  }
}

test();
