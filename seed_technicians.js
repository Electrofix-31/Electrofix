import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const serviceKeyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (!urlMatch || !serviceKeyMatch) {
  console.error("Erreur: URL ou SERVICE_ROLE_KEY introuvable dans .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(urlMatch[1].trim(), serviceKeyMatch[1].trim(), {
  auth: { autoRefreshToken: false, persistSession: false }
});

const technicians = [
  { email: 'tech01@tondomaine.ovh', first_name: 'Technicien', last_name: '01' },
  { email: 'tech02@tondomaine.ovh', first_name: 'Technicien', last_name: '02' },
  { email: 'tech03@tondomaine.ovh', first_name: 'Technicien', last_name: '03' },
  { email: 'tech04@tondomaine.ovh', first_name: 'Technicien', last_name: '04' },
  { email: 'tech05@tondomaine.ovh', first_name: 'Technicien', last_name: '05' }
];

async function seed() {
  console.log("Démarrage de la création des techniciens...");
  
  for (const tech of technicians) {
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: tech.email,
      email_confirm: true,
      password: 'PasswordSecurise123!',
      user_metadata: {
        first_name: tech.first_name,
        last_name: tech.last_name
      }
    });

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log(`[SKIP] ${tech.email} existe deja.`);
      } else {
        console.error(`[ERREUR] Impossible de creer ${tech.email}:`, authError.message);
      }
      continue;
    }

    console.log(`[OK] Utilisateur cree: ${tech.email}`);

    if (authUser.user) {
      await supabaseAdmin
        .from('profiles')
        .update({ role: 'technician', first_name: tech.first_name, last_name: tech.last_name })
        .eq('id', authUser.user.id);
      console.log(`   -> Profil mis a jour (Role: technician)`);
    }
  }
  
  console.log("Termine ! Tu peux maintenant les recruter dans l'Admin.");
}

seed();
