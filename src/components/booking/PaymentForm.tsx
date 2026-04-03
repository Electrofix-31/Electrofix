'use client';

import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function PaymentForm({ clientSecret, appointmentId }: { clientSecret: string; appointmentId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Redirection après succès - On peut aussi gérer sans redirection
        return_url: `${window.location.origin}/book/success?appointment_id=${appointmentId}`,
      },
      redirect: 'if_required', // Ne pas rediriger si le paiement est immédiat (ex: carte sans 3DS)
    });

    if (error) {
      if (error.type === 'card_error' || error.type === 'validation_error') {
        setMessage(error.message!);
      } else {
        setMessage('Une erreur inattendue est survenue.');
      }
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setIsSuccess(true);
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-12 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Paiement Réussi !</h2>
        <p className="text-slate-600 mb-8">Votre rendez-vous a été confirmé. Vous allez recevoir un email de confirmation.</p>
        <button
          onClick={() => window.location.href = '/'}
          className="bg-primary text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <button
        disabled={isLoading || !stripe || !elements}
        className="w-full bg-primary text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-800 transition-all disabled:opacity-50 shadow-lg shadow-blue-900/20"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Traitement...
          </>
        ) : (
          'Confirmer et Payer'
        )}
      </button>
      {message && <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">{message}</div>}
    </form>
  );
}
