import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  // Récupérer les rendez-vous à domicile avec coordonnées pour une date donnée
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id,
      date,
      time,
      status,
      appointment_type,
      material_ref,
      material_issue,
      client_address,
      client_phone,
      latitude,
      longitude,
      services (name, price),
      profiles (first_name, last_name),
      equipment_types (
        name,
        equipment_categories (
          name
        )
      )
    `)
    .eq('date', date)
    .eq('appointment_type', 'domicile')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) {
    console.error('Error fetching map appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }

  return NextResponse.json(appointments, { status: 200 });
}
