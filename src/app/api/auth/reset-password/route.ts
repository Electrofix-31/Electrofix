import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resend } from '@/lib/resend';

// On utilise le Service Role Key pour pouvoir générer des liens d'admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    // 1. Générer le lien de récupération via Supabase
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${new URL(request.url).origin}/auth/reset-password`,
      }
    });

    if (linkError) {
      console.error('Erreur Supabase Link:', linkError);
      // Pour des raisons de sécurité, on ne dit pas si l'email existe ou pas
      return NextResponse.json({ message: 'Si cet email existe, un message a été envoyé.' });
    }

    const resetLink = data.properties.action_link;

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
    console.error('Erreur Reset Password Route:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
