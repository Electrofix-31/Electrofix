import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  // Récupérer les rendez-vous assignés à ce technicien
  // Si c'est un admin, on peut imaginer qu'il voit tout ou qu'on passe un tech_id
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
      profiles (first_name, last_name)
    `)
    .eq('date', date)
    .eq('technician_id', user.id) // Seul les siens
    .order('time', { ascending: true });

  if (error) {
    console.error('Error fetching technician schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }

  return NextResponse.json(appointments, { status: 200 });
}
