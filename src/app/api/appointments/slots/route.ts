import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateDistance, getCoordinatesFromPostalCode } from '@/lib/geo';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const service_type = searchParams.get('service_type');
  const date = searchParams.get('date');
  const postal_code = searchParams.get('postal_code');

  if (!service_type || !date) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

  // 1. Récupérer les réglages Admin (Rayon max)
  const { data: radiusSetting } = await supabase.from('admin_settings').select('value').eq('key', 'max_intervention_radius').single();
  const maxRadius = radiusSetting?.value?.value ?? 20;

  // 2. Point central : Carbonne (31390)
  const STORE_COORDS = { lat: 43.2974, lon: 1.2268 }; // Coordonnées approximatives de Carbonne centre

  // 3. Récupérer les créneaux configurés
  const { data: availableSlots } = await supabase
    .from('appointment_slots')
    .select('*')
    .eq('date', date)
    .eq('is_active', true)
    .order('start_time', { ascending: true });

  // 4. Récupérer les RDV déjà confirmés pour cette date
  const { data: bookedAppointments } = await supabase
    .from('appointments')
    .select('time, appointment_type, status, client_postal_code, latitude, longitude')
    .eq('date', date)
    .neq('status', 'cancelled');

  // 5. Vérification de la zone géographique globale (Rayon de Carbonne)
  let isOutsideStoreZone = false;
  let clientCoords: { lat: number, lon: number } | null = null;
  
  if (service_type === 'domicile' && postal_code) {
    clientCoords = await getCoordinatesFromPostalCode(postal_code);
    if (clientCoords) {
      const distanceToStore = calculateDistance(clientCoords.lat, clientCoords.lon, STORE_COORDS.lat, STORE_COORDS.lon);
      if (distanceToStore > maxRadius) {
        isOutsideStoreZone = true;
      }
    }
  }

  // 6. Calcul des disponibilités finales avec Proximité Séquentielle
  const finalSlots = (availableSlots || []).map(slot => {
    const timeStr = slot.start_time;

    // CORRECTION : On compte bien le nombre d'éléments (length) et non le tableau lui-même
    const fieldAppsCount = bookedAppointments?.filter(a => a.time === timeStr && a.appointment_type === 'domicile').length || 0;
    const storeAppsAtTime = bookedAppointments?.filter(a => a.time === timeStr && a.appointment_type === 'atelier').length || 0;

    let isAvailable = false;
    let isRecommended = false;

    if (service_type === 'atelier') {
      isAvailable = storeAppsAtTime < slot.max_capacity_store;
    } else {
      // DOMICILE : Règle 1 : Zone globale & Créneau libre (Tournée unique)
      isAvailable = !isOutsideStoreZone && fieldAppsCount < 1;

      // DOMICILE : Règle 2 : Proximité Séquentielle (Anti-Zigzag)
      if (isAvailable && clientCoords) {
        const MAX_SEQUENTIAL_DISTANCE = 10; // km max entre deux RDV consécutifs
        const slotHour = parseInt(timeStr.split(':')[0]);

        // On cherche les RDV Domicile du même jour
        const allFieldAppsToday = bookedAppointments?.filter(a => a.appointment_type === 'domicile' && a.latitude && a.longitude) || [];

        for (const app of allFieldAppsToday) {
          const appHour = parseInt(app.time.split(':')[0]);
          // Est-ce un RDV "adjacent" (juste avant ou juste après, ex: 2h de battement)
          const isAdjacent = Math.abs(appHour - slotHour) <= 2; 

          if (isAdjacent) {
            const distanceToAdjacent = calculateDistance(clientCoords.lat, clientCoords.lon, app.latitude, app.longitude);
            console.log(`[DEBUG SLOTS] Distance entre ${postal_code} et ${app.client_postal_code}: ${distanceToAdjacent.toFixed(2)}km`);
            
            if (distanceToAdjacent > MAX_SEQUENTIAL_DISTANCE) {
              console.log(`[DEBUG SLOTS] Bloqué: ${distanceToAdjacent.toFixed(2)}km > ${MAX_SEQUENTIAL_DISTANCE}km`);
              isAvailable = false; 
              break; 
            }
          }
        }
      }
      
      // On recommande si on est dans le même code postal
      isRecommended = isAvailable && postal_code && bookedAppointments?.some(a => 
        a.appointment_type === 'domicile' && a.client_postal_code === postal_code
      ) || false;
    }

    return {
      ...slot,
      is_available_for_service: isAvailable,
      is_recommended: isRecommended,
      remaining_capacity: isAvailable ? 1 : 0,
      is_too_far: isOutsideStoreZone
    };
  }).filter(slot => slot.is_available_for_service);

  return NextResponse.json(finalSlots, { status: 200 });
}
