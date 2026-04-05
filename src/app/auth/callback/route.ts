import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Détermination de l'origine de manière ultra-fiable (comme dans l'API reset-password)
  let origin = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  
  if (!origin) {
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    origin = `${protocol}://${host}`;
  }

  // Sécurité si on est sur zapto.org
  if (origin.includes('localhost') && request.headers.get('host')?.includes('zapto.org')) {
    origin = `https://${request.headers.get('host')}`;
  }

  origin = origin.replace(/\/$/, '');

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // On redirige vers l'origin détectée + le paramètre next
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // En cas d'erreur
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
