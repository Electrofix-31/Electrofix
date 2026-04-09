import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resend } from '@/lib/resend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, name, phone } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) return NextResponse.json({ error: 'Config Supabase manquante' }, { status: 500 });

    // Client Admin pour générer des liens sans restriction
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Déterminer l'origine pour le lien de redirection
    let origin = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
    if (!origin) {
      const host = request.headers.get('host');
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      origin = `${protocol}://${host}`;
    }
    origin = origin.replace(/\/$/, '');

    // 2. Générer le lien de jeton via Supabase (Méthode Admin)
    let linkData;
    let linkType: 'invite' | 'magiclink' = 'invite';

    // Extraction du prénom et du nom
    const [firstName, ...lastNameParts] = (name || '').split(' ');
    const lastName = lastNameParts.join(' ');

    const userMetadata = {
      first_name: firstName || null,
      last_name: lastName || null,
      phone: phone || null
    };

    try {
      // Tentative d'invitation (Nouvel utilisateur) avec injection des métadonnées
      const { data, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: {
          data: userMetadata
        }
      });

      if (inviteError && (inviteError.status === 422 || inviteError.message.includes('already'))) {
        linkType = 'magiclink';
        // L'utilisateur existe déjà. On génère le lien magique.
        const { data: magicData, error: magicError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email
        });
        
        if (magicError) throw magicError;
        linkData = magicData;

        // Mise à jour explicite du profil existant (si le client veut corriger son nom/téléphone)
        const { data: userObj } = await supabaseAdmin.auth.admin.getUserById(magicData.user.id);
        if (userObj?.user) {
          await supabaseAdmin.from('profiles').update(userMetadata).eq('id', userObj.user.id);
        }

      } else if (inviteError) {
        throw inviteError;
      } else {
        linkData = data;
        
        // Pour une invitation réussie (nouvel user), la table profile est remplie par le trigger SQL habituel,
        // mais pour être absolument certain qu'il y a un prénom/nom avant la validation, on force l'update.
        if (data?.user?.id) {
           await supabaseAdmin.from('profiles').upsert({ id: data.user.id, email: email, ...userMetadata });
        }
      }
    } catch (err: any) {
      console.error('Generation Error:', err);
      return NextResponse.json({ error: "Erreur technique de jeton" }, { status: 500 });
    }

    // 3. Extraire le jeton (token)
    const supabaseGeneratedLink = new URL(linkData.properties.action_link);
    const tokenHash = supabaseGeneratedLink.searchParams.get('token');

    // 4. Fabriquer NOTRE lien personnalisé vers notre route de confirmation
    const finalMagicLink = `${origin}/auth/confirm?token_hash=${tokenHash}&type=${linkType}&next=/book?step=review`;

    if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Config Resend manquante' }, { status: 500 });

    // 5. Envoyer l'email via Resend
    const { error: sendError } = await resend.emails.send({
      from: 'ElectroFix <noreply@electrofix.badie.ovh>',
      to: email,
      subject: 'Votre lien de connexion - ElectroFix',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #334155; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h1 style="color: #1e3a8a; text-align: center;">ELECTRO'FIX</h1>
          <p>Bonjour,</p>
          <p>Vous avez demandé un lien de connexion pour finaliser votre réservation.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${finalMagicLink}" style="display: inline-block; background-color: #1e3a8a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              Valider mon identité
            </a>
          </p>
          <p style="font-size: 14px; color: #64748b; line-height: 1.5;">
            Ce lien est valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">
            ELECTRO'FIX &bull; Expert Dépannage &bull; 2026
          </p>
        </div>
      `,
    });

    if (sendError) {
      console.error('Resend Error:', sendError);
      return NextResponse.json({ error: "Erreur lors de l'envoi de l'email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Magic Link API Error:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
