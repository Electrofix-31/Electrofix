import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const { searchParams } = url
  
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  
  // Le paramètre next est tout ce qui se trouve après "next=" dans l'URL brute
  // pour éviter que searchParams.get() ne le coupe au premier "&" ou "?"
  let next = '/';
  const rawUrl = request.url;
  const nextMatch = rawUrl.match(/next=([^&]+)/);
  
  if (nextMatch && nextMatch[1]) {
      // Si next était encodé (ex: %2Fbook%3Fstep%3Dreview)
      next = decodeURIComponent(nextMatch[1]);
      
      // S'il n'était pas encodé, on reconstruit l'URL avec les paramètres restants
      // Ex: next=/book&step=review  ->  on récupère /book?step=review
      if (!next.includes('?') && rawUrl.includes('step=')) {
          const stepParam = searchParams.get('step');
          if (stepParam) {
              next = `${next}?step=${stepParam}`;
          }
      }
  }

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
      // Redirection vers la page demandée (ex: /book?step=review)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // En cas d'erreur, redirection vers une page d'erreur
  return NextResponse.redirect(`${origin}/login?error=Lien invalide ou expiré`)
}
