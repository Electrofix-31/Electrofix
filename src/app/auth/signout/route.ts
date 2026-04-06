import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();

  // Check if user is signed in
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    await supabase.auth.signOut();
  }

  // Détermination de l'origine de manière fiable pour le Reverse Proxy
  let origin = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) {
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    origin = `${protocol}://${host}`;
  }
  
  if (origin.includes('localhost') && request.headers.get('host')?.includes('zapto.org')) {
    origin = `https://${request.headers.get('host')}`;
  }
  
  origin = origin.replace(/\/$/, '');

  // Redirection vers l'accueil
  return NextResponse.redirect(`${origin}/`, {
    status: 303,
  });
}
