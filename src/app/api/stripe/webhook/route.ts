// src/app/api/stripe/webhook/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-03-25.dahlia',
});

// IMPORTANT: La signature du webhook est essentielle pour la sécurité
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
  } catch (err: any)
{
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Gérer les événements
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
      console.log(`PaymentIntent for ${paymentIntentSucceeded.amount} was successful!`);

      // Mettre à jour le statut du rendez-vous dans Supabase
      const { client_id, service_id, appointment_date, appointment_time } = paymentIntentSucceeded.metadata;

      if (!paymentIntentSucceeded.id || !client_id)
{
        console.error('Missing paymentIntent ID or client_id in metadata');
        return NextResponse.json({ error: 'Missing required data in metadata' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed', payment_status: 'paid' })
        .eq('stripe_payment_intent_id', paymentIntentSucceeded.id)
        .eq('client_id', client_id) // Pour plus de sécurité
        .select();

      if (error)
{
        console.error('Error updating appointment status after successful payment:', error);
        return NextResponse.json({ error: 'Failed to update appointment status' }, { status: 500 });
      }

      console.log('Appointment confirmed and payment status updated:', data);
      break;

    // Gérer d'autres événements si nécessaire (ex: payment_intent.payment_failed)
    case 'payment_intent.payment_failed':
      const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
      console.warn(`PaymentIntent for ${paymentIntentFailed.amount} failed!`);

      // Mettre à jour le statut du rendez-vous à 'failed'
      const { client_id: failedClientId } = paymentIntentFailed.metadata;

      if (!paymentIntentFailed.id || !failedClientId)
{
        console.error('Missing paymentIntent ID or client_id in metadata for failed payment');
        return NextResponse.json({ error: 'Missing required data in metadata for failed payment' }, { status: 400 });
      }

      const { error: updateError } = await supabase
        .from('appointments')
        .update({ payment_status: 'failed', status: 'pending' }) // Ou un statut spécifique 'payment_failed'
        .eq('stripe_payment_intent_id', paymentIntentFailed.id)
        .eq('client_id', failedClientId);

      if (updateError)
{
        console.error('Error updating appointment status after failed payment:', updateError);
        return NextResponse.json({ error: 'Failed to update appointment status after failed payment' }, { status: 500 });
      }
      break;

    default:
      console.warn(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

// Le body parser par défaut de Next.js n'a plus besoin d'être désactivé dans le App Router
// car req.text() récupère déjà le corps brut de la requête.
