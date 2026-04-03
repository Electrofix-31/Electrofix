'use client';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { ReactNode } from 'react';

// Ne pas oublier de mettre la clé publique dans .env.local
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || 'pk_test_...placeholder');

export default function StripeWrapper({ children, clientSecret }: { children: ReactNode; clientSecret?: string }) {
  if (!clientSecret) return <>{children}</>;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
      {children}
    </Elements>
  );
}
