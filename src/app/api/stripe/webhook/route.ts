// src/app/api/stripe/webhook/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // Utiliser le client standard pour injecter la clé secrète
import Stripe from 'stripe';

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-03-25.dahlia',
});

// IMPORTANT: La signature du webhook est essentielle pour la sécurité
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Créer un client Supabase avec les droits d'administration (Bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Clé secrète qui contourne la RLS
);

export async function POST(req: Request) {
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
      // On récupère les metadata mais on ne bloque pas si elles sont incomplètes, 
      // car le paymentIntent ID est le lien principal et suffisant.
      const metadata = paymentIntentSucceeded.metadata || {};

      if (!paymentIntentSucceeded.id)
{
        console.error('Missing paymentIntent ID');
        return NextResponse.json({ error: 'Missing payment intent ID' }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from('appointments')
        .update({ status: 'confirmed', payment_status: 'paid' })
        .eq('stripe_payment_intent_id', paymentIntentSucceeded.id)
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

      if (!paymentIntentFailed.id)
{
        console.error('Missing paymentIntent ID for failed payment');
        return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
      }

      const { error: updateError } = await supabaseAdmin
        .from('appointments')
        .update({ payment_status: 'failed', status: 'pending' }) // Ou un statut spécifique 'payment_failed'
        .eq('stripe_payment_intent_id', paymentIntentFailed.id);

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
