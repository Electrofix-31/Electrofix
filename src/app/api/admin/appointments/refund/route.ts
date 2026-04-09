import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(request: Request) {
  const supabase = await createClient();

  // Sécurité: Vérifier si l'utilisateur est admin (simplifié ici, à ajuster selon votre auth admin exacte)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { appointmentId } = await request.json();

    if (!appointmentId) {
      return NextResponse.json({ error: 'Missing appointment ID' }, { status: 400 });
    }

    // 1. Récupérer l'ID Stripe (payment_intent) depuis la base de données
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('stripe_payment_intent_id, status, payment_status')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (!appointment.stripe_payment_intent_id) {
      return NextResponse.json({ error: 'No Stripe payment linked to this appointment' }, { status: 400 });
    }

    if (appointment.status === 'cancelled') {
        return NextResponse.json({ error: 'Appointment is already cancelled' }, { status: 400 });
    }

    // 2. Déclencher le remboursement via l'API Stripe
    try {
      const refund = await stripe.refunds.create({
        payment_intent: appointment.stripe_payment_intent_id,
        reason: 'requested_by_customer', // Raison par défaut pour les annulations
      });

      console.log('Stripe refund successful:', refund.id);

      // 3. Mettre à jour le statut en base de données (Annulé et Remboursé)
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled', 
          payment_status: 'refunded' 
        })
        .eq('id', appointmentId);

      if (updateError) {
         console.error('Error updating appointment status after refund:', updateError);
         // Même si l'update BDD échoue, le remboursement Stripe est passé.
         // Une alerte critique devrait idéalement être loggée ici.
      }

      return NextResponse.json({ success: true, refundId: refund.id }, { status: 200 });

    } catch (stripeError: any) {
      console.error('Stripe refund error:', stripeError);
      return NextResponse.json({ error: stripeError.message || 'Refund failed at Stripe' }, { status: 500 });
    }

  } catch (error) {
    console.error('General refund processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
