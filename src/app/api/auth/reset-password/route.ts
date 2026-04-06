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

    // Détermination de l'origine
    let origin = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
    if (!origin) {
      const host = request.headers.get('host');
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      origin = `${protocol}://${host}`;
    }
    origin = origin.replace(/\/$/, '');

    // 1. Générer le lien de récupération via Supabase
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email
    });

    if (linkError) return NextResponse.json({ message: 'Si cet email existe, un message a été envoyé.' });

    // EXTRACTION DU TOKEN : Supabase place le jeton long dans le paramètre 'token' de l'action_link
    const linkURL = new URL(data.properties.action_link);
    const token = linkURL.searchParams.get('token'); 

    // On crée notre propre lien direct vers la page de reset
    // On le nomme token_hash dans notre URL car c'est ce que la fonction verifyOtp attend
    const directResetLink = `${origin}/auth/reset-password?token_hash=${token}`;

    if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Config Resend manquante' }, { status: 500 });

    // 2. Envoyer l'email via Resend
    const { error: sendError } = await resend.emails.send({
      from: 'ElectroFix <noreply@electrofix.badie.ovh>',
      to: email,
      subject: 'Réinitialisation de votre mot de passe - ElectroFix',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #334155;">
          <h1 style="color: #0f172a;">Réinitialisation de mot de passe</h1>
          <p>Bonjour,</p>
          <p>Pour définir votre nouveau mot de passe, veuillez cliquer sur le bouton ci-dessous :</p>
          <a href="${directResetLink}" style="display: inline-block; background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
            Changer mon mot de passe
          </a>
          <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
            ${directResetLink}
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">Ce lien est valable 1 heure.</p>
        </div>
      `,
    });

    if (sendError) return NextResponse.json({ error: "Erreur envoi email" }, { status: 500 });
    return NextResponse.json({ message: 'Email envoyé' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
