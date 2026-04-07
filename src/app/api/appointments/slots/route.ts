import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const service_type = searchParams.get('service_type');
  const date = searchParams.get('date');
  const postal_code = searchParams.get('postal_code');

  if (!service_type || !date) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

  // 1. Récupérer les créneaux configurés
  const { data: availableSlots } = await supabase
    .from('appointment_slots')
    .select('*')
    .eq('date', date)
    .eq('is_active', true)
    .order('start_time', { ascending: true });

  // 2. Récupérer les réglages RH réels de l'Admin
  const { data: adminSettings } = await supabase.from('admin_settings').select('key, value');
  const minStaffRequired = adminSettings?.find(s => s.key === 'min_staff_store')?.value?.value ?? 3;
  const fixedStaffCount = adminSettings?.find(s => s.key === 'fixed_staff_store')?.value?.value ?? 2;

  // 3. Récupérer l'équipe de techniciens réelle
  const { data: techs } = await supabase.from('technicians').select('*');
  const totalStoreStaff = techs?.filter(t => t.is_available_store).length || 0;
  const totalFieldCapacity = techs?.filter(t => t.is_available_field).length || 0;

  // 4. Récupérer les RDV déjà confirmés
  const { data: bookedAppointments } = await supabase
    .from('appointments')
    .select('time, appointment_type, status, client_postal_code')
    .eq('date', date)
    .neq('status', 'cancelled');

  // Logs pour suivi Admin (Optionnel en prod)
  const [y, m, d] = date.split('-');
  console.log(`[Slots API] ${d}/${m}/${y} - Base: ${techs?.length || 0} techs configurés.`);

  // 5. Calcul des disponibilités dynamiques
  const finalSlots = (availableSlots || []).map(slot => {
    const timeStr = slot.start_time;

    const fieldAppsAtTime = bookedAppointments?.filter(a => a.time === timeStr && a.appointment_type === 'domicile').length || 0;
    const storeAppsAtTime = bookedAppointments?.filter(a => a.time === timeStr && a.appointment_type === 'atelier').length || 0;

    // Logique RH
    const techAtStore = totalStoreStaff - fieldAppsAtTime;
    const currentStoreStaff = fixedStaffCount + techAtStore - storeAppsAtTime;
    const isStoreRuleRespected = currentStoreStaff >= minStaffRequired;

    // Capacité Terrain
    const remainingFieldTechs = totalFieldCapacity - fieldAppsAtTime;
    const canSendOneMoreToField = (fixedStaffCount + (techAtStore - 1)) >= minStaffRequired;

    const isAvailable = service_type === 'atelier'
      ? (isStoreRuleRespected && storeAppsAtTime < slot.max_capacity_store)
      : (remainingFieldTechs > 0 && canSendOneMoreToField && fieldAppsAtTime < slot.max_capacity_field);

    const isRecommended = service_type === 'domicile' && postal_code && 
                         bookedAppointments?.some(a => a.appointment_type === 'domicile' && a.client_postal_code === postal_code);

    return {
      ...slot,
      is_available_for_service: isAvailable,
      is_recommended: isRecommended || false,
      remaining_capacity: service_type === 'domicile' ? remainingFieldTechs : currentStoreStaff
    };
  }).filter(slot => slot.is_available_for_service);

  return NextResponse.json(finalSlots, { status: 200 });
}
