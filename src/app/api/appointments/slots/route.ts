// src/app/api/appointments/slots/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const service_type = searchParams.get('service_type'); // 'atelier' ou 'domicile'
  const date = searchParams.get('date'); // Format 'YYYY-MM-DD'
  const postal_code = searchParams.get('postal_code'); // Optionnel, pour géo-optimisation

  if (!service_type || !date)
{
    return NextResponse.json({ error: 'Missing service_type or date parameter' }, { status: 400 });
  }

  // Récupérer tous les créneaux actifs
  const { data: availableSlots, error } = await supabase
    .from('appointment_slots')
    .select('*')
    .eq('date', date)
    .eq('is_active', true)
    .order('start_time', { ascending: true });

  if (error)
{
    console.error('Error fetching appointment slots:', error);
    return NextResponse.json({ error: 'Failed to fetch appointment slots' }, { status: 500 });
  }

  // 1. Récupérer le nombre minimum de personnel requis au magasin
  const { data: minStaffSetting } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'min_staff_store')
    .single();
  const minStaffRequired = (minStaffSetting?.value as any)?.value || 3;

  // 2. Récupérer tous les techniciens capables de travailler au magasin
  const { data: storeTechnicians } = await supabase
    .from('technicians')
    .select('profile_id')
    .eq('is_available_store', true);
  const totalStoreStaff = storeTechnicians?.length || 0;

  // 3. Récupérer les rendez-vous déjà pris pour cette date
  const { data: bookedAppointments } = await supabase
    .from('appointments')
    .select('time, appointment_type, status, client_postal_code')
    .eq('date', date)
    .neq('status', 'cancelled');

  // 4. Récupérer le nombre de techniciens réellement disponibles pour le TERRAIN (Field)
  // On pourra affiner avec les plannings individuels plus tard
  const { data: fieldTechs } = await supabase
    .from('technicians')
    .select('id')
    .eq('is_available_field', true);
  const totalFieldCapacity = fieldTechs?.length || 0;

  // 5. Filtrer et "Scorer" les créneaux
  const slotsWithCapacityAndScore = availableSlots.map(slot => {
    const timeStr = slot.start_time;
    
    // --- CALCUL DE CAPACITÉ DYNAMIQUE ---
    
    // RDV déjà pris à cette heure-là
    const fieldAppointmentsAtTime = bookedAppointments?.filter(app => 
      app.time === timeStr && app.appointment_type === 'domicile'
    ).length || 0;

    const storeAppointmentsAtTime = bookedAppointments?.filter(app => 
      app.time === timeStr && app.appointment_type === 'atelier'
    ).length || 0;

    // RÈGLE RH (Atelier/Magasin)
    // On vérifie qu'on ne dépasse pas la capacité d'accueil physique du magasin
    // ET qu'on respecte le personnel minimum requis
    const occupiedStaffInStore = storeAppointmentsAtTime; 
    const remainingStoreStaff = totalStoreStaff - occupiedStaffInStore;
    
    // Si la table technicians est vide (totalStoreStaff === 0), on ignore la règle RH pour le test
    const isStoreRuleRespected = totalStoreStaff === 0 || remainingStoreStaff >= minStaffRequired;

    // CAPACITÉ TERRAIN (Domicile)
    // Capacité réelle = Total techniciens itinérants - RDV déjà pris
    // Si totalFieldCapacity est 0, on se base uniquement sur max_capacity_field du créneau
    const currentFieldCapacity = totalFieldCapacity === 0 
      ? slot.max_capacity_field - fieldAppointmentsAtTime
      : totalFieldCapacity - fieldAppointmentsAtTime;

    // --- GÉO-OPTIMISATION (Domicile) ---
    let geoScore = 0; 
    let isRecommended = false;

    if (service_type === 'domicile' && postal_code) {
      const appointmentsInSameZone = bookedAppointments?.filter(app => 
        app.appointment_type === 'domicile' && app.client_postal_code === postal_code
      ) || [];

      if (appointmentsInSameZone.length > 0) {
        geoScore = 1; 
        isRecommended = true;
      }
    }

    return {
      ...slot,
      // Un créneau est disponible si :
      // 1. Pour l'Atelier : La règle RH est respectée ET le magasin n'est pas saturé
      // 2. Pour le Domicile : Il reste au moins un technicien itinérant libre
      is_available_for_service: service_type === 'atelier' 
        ? (isStoreRuleRespected && storeAppointmentsAtTime < slot.max_capacity_store)
        : (currentFieldCapacity > 0 && fieldAppointmentsAtTime < slot.max_capacity_field),
      is_recommended: isRecommended,
      geo_score: geoScore,
      remaining_capacity: service_type === 'domicile' ? currentFieldCapacity : remainingStoreStaff
    };
  }).filter(slot => slot.is_available_for_service);

  return NextResponse.json(slotsWithCapacityAndScore, { status: 200 });
}
