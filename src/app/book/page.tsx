'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import BookingWizard from '@/components/booking/BookingWizard';

export default function BookPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 relative">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-semibold bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
            <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
          </Link>
        </div>
        
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-primary mb-4">Réserver votre dépannage</h1>
          <p className="text-slate-600 text-lg">
            Choisissez votre service, un créneau et confirmez votre rendez-vous en quelques clics.
          </p>
        </header>

        <main className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <Suspense fallback={<div className="p-12 text-center">Chargement de l&apos;assistant...</div>}>
            <BookingWizard />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
