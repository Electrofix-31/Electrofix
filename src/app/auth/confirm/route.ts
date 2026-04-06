import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  // Détermination de l'origine
  let origin = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) {
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    origin = `${protocol}://${host}`;
  }
  origin = origin.replace(/\/$/, '');

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    
    if (!error) {
      // Redirection vers la page demandée (ex: review)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // En cas d'erreur, redirection vers une page d'erreur
  return NextResponse.redirect(`${origin}/login?error=Lien invalide ou expiré`)
}
