import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resend } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const { appointment_id } = await request.json();
    
    if (!appointment_id) {
      return NextResponse.json({ error: 'ID de rendez-vous manquant' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Récupérer les détails complets du RDV
    const { data: app, error } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles!appointments_client_id_fkey(first_name, last_name, email),
        services(name, price),
        equipment_types(name, equipment_categories(name))
      `)
      .eq('id', appointment_id)
      .single();

    if (error || !app) {
      console.error("Erreur RDV non trouvé:", error);
      return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 });
    }

    const clientEmail = app.profiles?.email;
    if (!clientEmail) {
      return NextResponse.json({ error: 'Email client introuvable' }, { status: 400 });
    }

    // 2. Formater la date en français
    const dateObj = new Date(app.date);
    const dateFR = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const heureStr = app.time.substring(0, 5);

    // 3. Préparer le contenu de l'email
    const equipmentName = app.equipment_types?.name || app.custom_equipment_question || 'Matériel non spécifié';
    const categoryName = app.equipment_types?.equipment_categories?.name || '';
    const interventionType = app.appointment_type === 'domicile' ? 'À Domicile' : 'Dépôt en Atelier';

    const emailHtml = `
      <div style="font-family: sans-serif; padding: 30px; color: #334155; max-width: 600px; margin: auto; background-color: #f8fafc; border-radius: 16px;">
        <div style="background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <h1 style="color: #1e3a8a; text-align: center; margin-bottom: 10px; font-size: 24px;">ELECTRO'FIX</h1>
          <p style="text-align: center; color: #10b981; font-weight: bold; font-size: 18px; margin-top: 0;">Réservation Confirmée !</p>
          
          <p>Bonjour ${app.profiles?.first_name || ''},</p>
          <p>Nous vous confirmons la bonne réception de votre acompte et la validation de votre rendez-vous de dépannage.</p>
          
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h2 style="font-size: 16px; margin-top: 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Récapitulatif de votre intervention</h2>
            <ul style="list-style: none; padding: 0; line-height: 1.8;">
              <li><strong>Type :</strong> ${interventionType}</li>
              <li><strong>Date :</strong> <span style="text-transform: capitalize;">${dateFR}</span></li>
              <li><strong>Heure :</strong> ${heureStr}</li>
              <li><strong>Appareil :</strong> ${equipmentName} ${categoryName ? `(${categoryName})` : ''}</li>
              ${app.client_address ? `<li><strong>Adresse :</strong> ${app.client_address}</li>` : ''}
              ${app.access_instructions ? `<li><strong style="color: #d97706;">Instructions d'accès :</strong> ${app.access_instructions}</li>` : ''}
            </ul>
          </div>
          
          <p style="font-size: 14px; line-height: 1.5;">
            <strong>Acompte réglé :</strong> ${app.services?.price} €<br/>
            <em>Ce montant couvre le diagnostic et les frais de déplacement. S'il s'agit d'une réparation nécessitant des pièces, un devis vous sera proposé sur place.</em>
          </p>

          <p style="margin-top: 40px; font-size: 14px;">
            Pour toute modification, veuillez nous contacter au plus vite au <strong>05.XX.XX.XX.XX</strong>.
          </p>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
            ELECTRO'FIX • 31390 Carbonne<br/>
            L'équipe technique vous remercie de votre confiance.
          </div>
        </div>
      </div>
    `;

    // 4. Envoyer via Resend
    const { error: sendError } = await resend.emails.send({
      from: 'ElectroFix Réservation <noreply@electrofix.badie.ovh>',
      to: clientEmail,
      subject: `Confirmation de rendez-vous - ElectroFix (${dateFR})`,
      html: emailHtml,
    });

    if (sendError) {
      console.error('Erreur envoi Resend:', sendError);
      return NextResponse.json({ error: "Erreur lors de l'envoi de l'email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('API Send Confirmation Error:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
