import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const service_type = searchParams.get('service_type');
  const date = searchParams.get('date');
  const postal_code = searchParams.get('postal_code');

  if (!service_type || !date) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

  // 1. Récupérer les créneaux
  const { data: availableSlots } = await supabase
    .from('appointment_slots')
    .select('*')
    .eq('date', date)
    .eq('is_active', true)
    .order('start_time', { ascending: true });

  // 2. Configuration Équipe Réelle (Gérante + Vendeuse + 3 Techs)
  const fixedStaffCount = 2; 
  const minStaffRequired = 3;
  
  // ITINÉRANCE : On force 2 itinérants et 1 sédentaire pour la simulation réelle
  const totalStoreStaff = 3;    // Les 3 techs peuvent être au magasin
  const totalFieldCapacity = 2; // Seuls 2 peuvent sortir (Tech 2 et Tech 3)

  // 3. Récupérer les RDV déjà pris
  const { data: bookedAppointments } = await supabase
    .from('appointments')
    .select('time, appointment_type, status, client_postal_code')
    .eq('date', date)
    .neq('status', 'cancelled');

  const [y, m, d] = date.split('-');
  console.log(`[${d}/${m}] Slots:${availableSlots?.length || 0} | RDV:${bookedAppointments?.length || 0} | Team:OK`);

  // 4. Calcul des disponibilités
  const finalSlots = (availableSlots || []).map(slot => {
    const timeStr = slot.start_time;

    const fieldAppsAtTime = bookedAppointments?.filter(a => a.time === timeStr && a.appointment_type === 'domicile').length || 0;
    const storeAppsAtTime = bookedAppointments?.filter(a => a.time === timeStr && a.appointment_type === 'atelier').length || 0;

    // Logique RH : On a 2 fixes + (3 techs - ceux dehors - ceux en atelier)
    const techAtStore = totalStoreStaff - fieldAppsAtTime;
    const currentStoreStaff = fixedStaffCount + techAtStore - storeAppsAtTime;
    
    const isStoreRuleRespected = currentStoreStaff >= minStaffRequired;

    // Capacité Terrain : Il reste des itinérants ET on peut en envoyer un de plus sans casser les 3 au magasin
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
