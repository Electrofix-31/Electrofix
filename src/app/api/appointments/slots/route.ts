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

  // 3. Récupérer les rendez-vous déjà pris pour cette date avec leur code postal
  const { data: bookedAppointments } = await supabase
    .from('appointments')
    .select('time, appointment_type, technician_id, client_postal_code')
    .eq('date', date)
    .neq('status', 'cancelled');

  // 4. Filtrer et "Scorer" les créneaux
  const slotsWithCapacityAndScore = availableSlots.map(slot => {
    const timeStr = slot.start_time;
    
    // --- RÈGLE RH (Atelier) ---
    const occupiedStaffCount = bookedAppointments?.filter(app => app.time === timeStr).length || 0;
    const remainingStaffInStore = totalStoreStaff - occupiedStaffCount;
    const isStoreRuleRespected = remainingStaffInStore > minStaffRequired;

    // --- GÉO-OPTIMISATION (Domicile) ---
    let geoScore = 0; // 0 = Neutre, 1 = Optimal (même zone, même jour)
    let isRecommended = false;

    if (service_type === 'domicile' && postal_code) {
      // Chercher s'il y a un RDV à domicile dans le MÊME code postal ce jour-là
      const appointmentsInSameZone = bookedAppointments?.filter(app => 
        app.appointment_type === 'domicile' && app.client_postal_code === postal_code
      ) || [];

      if (appointmentsInSameZone.length > 0) {
        // Option simple : on recommande les créneaux du jour si on est déjà dans le coin
        geoScore = 1; 
        isRecommended = true;

        // Évolution future : Recommander les créneaux *adjacents* (heure précédente ou suivante)
        // pour limiter l'attente entre deux RDV.
      }
    }

    return {
      ...slot,
      is_available_for_service: service_type === 'atelier' 
        ? (isStoreRuleRespected && slot.max_capacity_store > 0)
        : (slot.max_capacity_field > 0),
      is_recommended: isRecommended,
      geo_score: geoScore
    };
  }).filter(slot => slot.is_available_for_service);

  return NextResponse.json(slotsWithCapacityAndScore, { status: 200 });
}
