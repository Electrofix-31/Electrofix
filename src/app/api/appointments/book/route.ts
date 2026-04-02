// src/app/api/appointments/book/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!,
{
  apiVersion: '2023-10-16', // Utilise la version API Stripe que tu préfères
});

export async function POST(request: Request) {
  const supabase = createClient();

  // 1. Vérifier l'authentification de l'utilisateur (client)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
{
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    service_id,
    appointment_type,
    date,
    time,
    material_ref,
    material_issue,
    purchase_info,
    attachment_url,
    client_address, // Seulement pour 'domicile'
    client_phone, // Pour contact
  } = await request.json();

  // 2. Validation des données de base
  if (!service_id || !appointment_type || !date || !time)
{
    return NextResponse.json({ error: 'Missing required appointment fields' }, { status: 400 });
  }
  if (appointment_type === 'domicile' && !client_address)
{
    return NextResponse.json({ error: 'Address is required for home appointments' }, { status: 400 });
  }

  // Mettre à jour le profil client avec l'adresse et le téléphone s'ils sont fournis et si c'est la première fois
  const { data: profileUpdateData, error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ address: client_address, phone: client_phone })
    .eq('id', user.id)
    .select();

  if (profileUpdateError)
{
    console.error('Error updating client profile:', profileUpdateError);
    // Continuer sans erreur bloquante si la mise à jour du profil n'est pas critique pour la réservation
  }

  // 3. Vérifier la disponibilité des créneaux (logique simplifiée pour l'instant)
  // Plus tard, cette logique inclura la géo-optimisation et la vérification des techniciens.
  const { data: slotData, error: slotError } = await supabase
    .from('appointment_slots')
    .select('*')
    .eq('date', date)
    .eq('start_time', time)
    .single();

  if (slotError || !slotData || !slotData.is_active)
{
    return NextResponse.json({ error: 'Selected slot is not available or inactive' }, { status: 400 });
  }

  // 4. Appliquer la règle RH pour les rendez-vous en atelier
  if (appointment_type === 'atelier') {
    const { data: currentAppointmentsInSlot, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id')
      .eq('date', date)
      .eq('time', time)
      .eq('appointment_type', 'atelier')
      .neq('status', 'cancelled'); // Ne compte pas les rendez-vous annulés

    if (appointmentsError)
{
      console.error('Error fetching appointments for HR rule:', appointmentsError);
      return NextResponse.json({ error: 'Failed to check HR rule' }, { status: 500 });
    }

    const currentBookedStoreSlots = currentAppointmentsInSlot?.length || 0;

    // Récupérer la règle min_staff_store depuis admin_settings
    const { data: minStaffSetting, error: minStaffError } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'min_staff_store')
      .single();

    if (minStaffError || !minStaffSetting || typeof minStaffSetting.value?.value !== 'number')
{
      console.error('Error fetching min_staff_store setting:', minStaffError || 'Setting not found or invalid');
      return NextResponse.json({ error: 'Failed to retrieve minimum staff setting' }, { status: 500 });
    }

    const minStaffStore = minStaffSetting.value.value;

    // Si le nombre de rendez-vous en atelier + le minimum de personnel dépasse la capacité du slot
    // C'est une logique à affiner : ici, on compte les rendez-vous comme des "besoins" en personnel
    // Une meilleure approche serait de compter les techniciens disponibles vs slots pris.
    // Pour l'instant, je vais juste vérifier la capacité max du slot
    if (currentBookedStoreSlots >= slotData.max_capacity_store)
{
      return NextResponse.json({ error: 'No more atelier slots available for this time' }, { status: 400 });
    }

    // Ici on devrait aussi vérifier si le nombre de techniciens au magasin est suffisant
    // Cela nécessite une logique plus complexe pour interroger la table technicians et admin_settings
    // Pour l'instant, on se base sur max_capacity_store du slot
  }

  // 5. Récupérer le prix du service pour Stripe
  const { data: serviceData, error: serviceError } = await supabase
    .from('services')
    .select('price, name')
    .eq('id', service_id)
    .single();

  if (serviceError || !serviceData)
{
    return NextResponse.json({ error: 'Service not found' }, { status: 400 });
  }

  const amount = Math.round(serviceData.price * 100); // Montant en centimes

  // 6. Créer un PaymentIntent Stripe
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'eur',
      metadata: {
        client_id: user.id,
        service_id: service_id,
        appointment_date: date,
        appointment_time: time,
      },
      // capture_method: 'manual', // Si tu veux capturer le paiement plus tard
    });
  } catch (stripeError: any)
{
    console.error('Stripe PaymentIntent creation error:', stripeError);
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 });
  }

  // 7. Créer l'entrée 'appointment' dans Supabase
  const { data: appointment, error: createAppointmentError } = await supabase
    .from('appointments')
    .insert({
      client_id: user.id,
      service_id: service_id,
      appointment_type: appointment_type,
      date: date,
      time: time,
      material_ref: material_ref,
      material_issue: material_issue,
      purchase_info: purchase_info,
      attachment_url: attachment_url,
      stripe_payment_intent_id: paymentIntent.id,
      payment_status: 'pending', // Sera mis à jour par le webhook Stripe
      status: 'pending', // Sera mis à jour par le webhook Stripe après paiement réussi
    })
    .select()
    .single();

  if (createAppointmentError)
{
    console.error('Error creating appointment:', createAppointmentError);
    // Annuler le PaymentIntent si la création du rendez-vous échoue
    if (paymentIntent.id)
{
      await stripe.paymentIntents.cancel(paymentIntent.id).catch(e => console.error('Failed to cancel PaymentIntent:', e));
    }
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
  }

  // 8. Retourner le clientSecret de Stripe
  return NextResponse.json({ clientSecret: paymentIntent.client_secret, appointment_id: appointment.id }, { status: 201 });
}
