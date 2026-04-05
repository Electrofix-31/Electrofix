import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resend } from '@/lib/resend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) return NextResponse.json({ error: 'Config Supabase manquante' }, { status: 500 });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // --- LOGIQUE DE DÉTERMINATION DE L'URL (SÉCURISÉE) ---
    // On utilise SITE_URL (sans NEXT_PUBLIC) pour qu'elle soit lue en direct sur le serveur
    let origin = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
    
    // Si toujours rien, on regarde les headers
    if (!origin || origin.includes('localhost')) {
      const host = request.headers.get('host');
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      origin = `${protocol}://${host}`;
    }

    // Sécurité ultime : si on est sur zapto.org mais que l'origin est localhost, on force zapto
    if (origin.includes('localhost') && request.headers.get('host')?.includes('zapto.org')) {
       origin = `https://${request.headers.get('host')}`;
    }

    origin = origin.replace(/\/$/, '');
    console.log('>>> RESET PASSWORD ORIGIN UTILISÉE :', origin);

    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
      }
    });

    if (linkError) return NextResponse.json({ message: 'Si cet email existe, un message a été envoyé.' });

    const resetLink = data.properties.action_link;
    if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Config Resend manquante' }, { status: 500 });

    const { error: sendError } = await resend.emails.send({
      from: 'ElectroFix <noreply@electrofix.badie.ovh>',
      to: email,
      subject: 'Réinitialisation de votre mot de passe - ElectroFix',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #334155;">
          <h1 style="color: #0f172a;">Réinitialisation de mot de passe</h1>
          <p>Bonjour,</p>
          <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
          <a href="${resetLink}" style="display: inline-block; background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
            Réinitialiser mon mot de passe
          </a>
          <p>Si le bouton ne fonctionne pas, copiez ce lien : ${resetLink}</p>
        </div>
      `,
    });

    if (sendError) return NextResponse.json({ error: "Erreur envoi email" }, { status: 500 });
    return NextResponse.json({ message: 'Email envoyé' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
