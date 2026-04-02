// src/app/api/appointments/slots/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = createClient();

  const { searchParams } = new URL(request.url);
  const service_type = searchParams.get('service_type'); // 'atelier' ou 'domicile'
  const date = searchParams.get('date'); // Format 'YYYY-MM-DD'

  if (!service_type || !date)
{
    return NextResponse.json({ error: 'Missing service_type or date parameter' }, { status: 400 });
  }

  // Pour l'instant, on récupère tous les créneaux actifs pour la date donnée.
  // La logique de géo-optimisation ou de capacité par technicien sera affinée plus tard.
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

  // Filtrage simple basé sur le type de service (pour l'UI frontend)
  // Plus tard, cette logique intégrera la capacité réelle (max_capacity_store, max_capacity_field)
  // et le nombre de rendez-vous déjà pris.
  const slotsFilteredByServiceType = availableSlots.filter(slot => {
    if (service_type === 'atelier' && slot.max_capacity_store > 0)
{
      // Devra vérifier si des techniciens sont disponibles au magasin
      return true;
    }
    if (service_type === 'domicile' && slot.max_capacity_field > 0)
{
      // Devra vérifier si des techniciens itinérants sont disponibles
      return true;
    }
    return false;
  });


  // TODO: Implémenter la logique pour vérifier la capacité restante de chaque slot
  // en fonction des rendez-vous déjà pris pour cette date et ce créneau,
  // et en fonction des techniciens disponibles.
  // const { data: bookedAppointments, error: bookedError } = await supabase
  //   .from('appointments')
  //   .select('id, appointment_type')
  //   .eq('date', date)
  //   .neq('status', 'cancelled');
  // if (bookedError) { /* handle error */ }
  //
  // const slotsWithRemainingCapacity = slotsFilteredByServiceType.map(slot => {
  //   const bookedStoreCount = bookedAppointments.filter(app =>
  //     app.time === slot.start_time && app.appointment_type === 'atelier'
  //   ).length;
  //   const bookedFieldCount = bookedAppointments.filter(app =>
  //     app.time === slot.start_time && app.appointment_type === 'domicile'
  //   ).length;
  //
  //   return {
  //     ...slot,
  //     remaining_store_capacity: slot.max_capacity_store - bookedStoreCount,
  //     remaining_field_capacity: slot.max_capacity_field - bookedFieldCount,
  //   };
  // }).filter(slot =>
  //   (service_type === 'atelier' && slot.remaining_store_capacity > 0) ||
  //   (service_type === 'domicile' && slot.remaining_field_capacity > 0)
  // );


  return NextResponse.json(slotsFilteredByServiceType, { status: 200 });
}
