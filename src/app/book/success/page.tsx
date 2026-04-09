'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Calendar, MapPin, Wrench, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('appointment_id');
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (appointmentId) {
      // Vider la mémoire de réservation après un succès
      localStorage.removeItem('pending_booking');
      
      // Envoi de l'email de confirmation (avec une vérification pour éviter les doubles envois en mode dev StrictMode)
      const hasSentEmail = sessionStorage.getItem(`email_sent_${appointmentId}`);
      if (!hasSentEmail) {
        fetch('/api/appointments/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointment_id: appointmentId })
        }).then(res => {
          if (res.ok) {
            sessionStorage.setItem(`email_sent_${appointmentId}`, 'true');
            console.log("Email de confirmation envoyé au client.");
          }
        }).catch(err => console.error("Erreur d'envoi d'email:", err));
      }

      setLoading(false);
    }
  }, [appointmentId]);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">C&apos;est confirmé !</h1>
        <p className="text-slate-600 mb-8">
          Votre paiement a été validé et votre rendez-vous est enregistré.
          Un email récapitulatif vient de vous être envoyé.
        </p>

        <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left space-y-4">
          <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2">Détails de l&apos;intervention</h3>
          
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Date et Heure</p>
              <p className="text-slate-600 text-sm">Le rendez-vous sera confirmé par notre technicien sous 2h.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Wrench className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Numéro de suivi</p>
              <p className="text-primary font-mono text-sm">{appointmentId?.slice(0, 8).toUpperCase() || 'REF-PENDING'}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link 
            href="/"
            className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
          >
            Retour à l&apos;accueil
          </Link>
          <button className="text-slate-500 font-semibold py-2 hover:text-primary transition-colors text-sm">
            Besoin d&apos;aide ? Contactez-nous
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
