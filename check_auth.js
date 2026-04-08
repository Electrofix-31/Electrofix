import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const serviceKeyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseAdmin = createClient(urlMatch[1].trim(), serviceKeyMatch[1].trim());

async function check() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  console.log("Emails dans Auth :");
  users.forEach(u => console.log("- " + u.email));
  
  const { data: profiles } = await supabaseAdmin.from('profiles').select('email');
  console.log("\nEmails dans Profiles :");
  profiles.forEach(p => console.log("- " + p.email));
}

check();
