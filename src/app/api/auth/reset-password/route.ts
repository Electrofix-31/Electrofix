import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resend } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Variables d environnement Supabase manquantes.');
      return NextResponse.json({ error: 'Configuration serveur incomplète (clés Supabase manquantes).' }, { status: 500 });
    }

    // On initialise le client dans la fonction pour éviter de crasher toute la route si les clés manquent
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Détermination de l'origine pour le lien de redirection
    let origin = process.env.NEXT_PUBLIC_SITE_URL;
    
    if (!origin) {
      // Fallback sur les headers si la variable est absente
      const host = request.headers.get('host');
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      origin = `${protocol}://${host}`;
    }

    // 1. Générer le lien de récupération via Supabase
    // On redirige vers le callback pour établir la session, puis vers la page de reset
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
      }
    });

    if (linkError) {
      console.error('Erreur Supabase Link:', linkError);
      // Pour des raisons de sécurité, on ne dit pas si l'email existe ou pas
      return NextResponse.json({ message: 'Si cet email existe, un message a été envoyé.' });
    }

    const resetLink = data.properties.action_link;
    
    if (!process.env.RESEND_API_KEY) {
      console.error('Variable RESEND_API_KEY manquante.');
      return NextResponse.json({ error: 'Configuration serveur incomplète (clé Email manquante).' }, { status: 500 });
    }

    // 2. Envoyer l'email via Resend
    const { error: sendError } = await resend.emails.send({
      from: 'ElectroFix <noreply@electrofix.badie.ovh>',
      to: email,
      subject: 'Réinitialisation de votre mot de passe - ElectroFix',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #334155;">
          <h1 style="color: #0f172a;">Réinitialisation de mot de passe</h1>
          <p>Bonjour,</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte ElectroFix.</p>
          <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
          <a href="${resetLink}" style="display: inline-block; background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
            Réinitialiser mon mot de passe
          </a>
          <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">L'équipe technique d'ElectroFix</p>
        </div>
      `,
    });

    if (sendError) {
      console.error('Erreur Resend:', sendError);
      return NextResponse.json({ error: "Erreur lors de l'envoi de l'email." }, { status: 500 });
    }

    return NextResponse.json({ message: 'Email envoyé avec succès.' });
  } catch (error: any) {
    console.error('Erreur globale Reset Password Route:', error);
    return NextResponse.json({ error: 'Erreur serveur interne.' }, { status: 500 });
  }
}
