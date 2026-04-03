import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'atelier', 'domicile'

  let query = supabase.from('services').select('*');

  if (type) {
    // Si un type est spécifié, on récupère les services de ce type ou ceux qui font les deux
    query = query.or(`type.eq.${type},type.eq.both`);
  }

  const { data: services, error } = await query;

  if (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }

  return NextResponse.json(services, { status: 200 });
}
