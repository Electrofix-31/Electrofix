import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function check() {
  const { data: adminSettings } = await supabase.from('admin_settings').select('key, value');
  const { data: techs } = await supabase.from('technicians').select('*');
  
  const fixedStaffCount = adminSettings?.find(s => s.key === 'fixed_staff_store')?.value?.value ?? 2;
  const minStaffRequired = adminSettings?.find(s => s.key === 'min_staff_store')?.value?.value ?? 3;
  const totalStoreStaff = techs?.filter(t => t.is_available_store).length || 0;
  const totalFieldCapacity = techs?.filter(t => t.is_available_field).length || 0;

  console.log("=== DIAGNOSTIC RH ===");
  console.log("Min Staff Requis Magasin:", minStaffRequired);
  console.log("Staff Fixe Magasin:", fixedStaffCount);
  console.log("Nb Total Techs:", techs?.length || 0);
  console.log("Techs dispo Magasin:", totalStoreStaff);
  console.log("Techs dispo Terrain:", totalFieldCapacity);
  
  const techAtStore = totalStoreStaff - 0; // 0 field apps
  const canSendOneMoreToField = (fixedStaffCount + (techAtStore - 1)) >= minStaffRequired;
  
  console.log("Peut envoyer 1 tech sur le terrain ? :", canSendOneMoreToField);
}

check();
