'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Wrench, MapPin, Calendar, User, CreditCard, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import StripeWrapper from './StripeWrapper';
import PaymentForm from './PaymentForm';

type Step = 'type' | 'service' | 'slot' | 'info' | 'auth' | 'payment';

export default function BookingWizard() {
  const [step, setStep] = useState<Step>('type');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [appointmentType, setAppointmentType] = useState<'atelier' | 'domicile' | null>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [clientInfo, setClientInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    material_ref: '',
    issue: '',
  });

  // Auth State
  const [otpCode, setOtpCode] = useState('');

  // Stripe
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  // Data
  const [services, setServices] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);

  const supabase = createClient();

  // Load services when appointment type changes
  useEffect(() => {
    if (appointmentType) {
      fetch(`/api/services?type=${appointmentType}`)
        .then(res => res.json())
        .then(data => setServices(data))
        .catch(err => console.error('Error fetching services:', err));
    }
  }, [appointmentType]);

  // Load slots when date changes
  useEffect(() => {
    if (selectedDate && appointmentType) {
      // Si c'est à domicile, on essaie d'envoyer le code postal s'il a déjà été tapé (ex: retour arrière)
      const postalCodeMatch = clientInfo.address.match(/\b\d{5}\b/);
      const postalCodeQuery = postalCodeMatch ? `&postal_code=${postalCodeMatch[0]}` : '';

      fetch(`/api/appointments/slots?service_type=${appointmentType}&date=${selectedDate}${postalCodeQuery}`)
        .then(res => res.json())
        .then(data => setSlots(data))
        .catch(err => console.error('Error fetching slots:', err));
    }
  }, [selectedDate, appointmentType, clientInfo.address]);

  const handleNext = async () => {
    if (step === 'type' && appointmentType) setStep('service');
    else if (step === 'service' && selectedService) setStep('slot');
    else if (step === 'slot' && selectedSlot) setStep('info');
    else if (step === 'info') {
      await handleAuthCheck();
    }
    else if (step === 'auth') {
      await verifyOtpAndBook();
    }
  };

  const handleBack = () => {
    if (step === 'service') setStep('type');
    else if (step === 'slot') setStep('service');
    else if (step === 'info') setStep('slot');
    else if (step === 'auth') setStep('info');
    else if (step === 'payment') setStep('info');
  };

  const handleAuthCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Déjà connecté
        await createAppointment();
      } else {
        // Pas connecté, on envoie un code OTP
        if (!clientInfo.email) throw new Error("Veuillez renseigner un email valide.");
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: clientInfo.email,
          options: {
            // Optionnel: on peut ajouter les données du profil pour la première inscription ici
            data: {
              full_name: clientInfo.name,
              phone: clientInfo.phone,
            }
          }
        });
        
        if (otpError) throw otpError;
        setStep('auth');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpAndBook = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: clientInfo.email,
        token: otpCode,
        type: 'email'
      });

      if (verifyError) throw verifyError;

      // OTP validé, on lance la réservation
      await createAppointment();
    } catch (err: any) {
      setError(err.message || 'Code invalide.');
      setLoading(false);
    }
  };

  const createAppointment = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedService.id,
          appointment_type: appointmentType,
          date: selectedDate,
          time: selectedSlot.start_time,
          material_ref: clientInfo.material_ref,
          material_issue: clientInfo.issue,
          client_address: clientInfo.address,
          client_phone: clientInfo.phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la réservation');

      setClientSecret(data.clientSecret);
      setAppointmentId(data.appointment_id);
      setStep('payment');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[500px]">
      {/* Progress Bar */}
      <div className="flex border-b border-slate-100 bg-slate-50/50">
        {[
          { id: 'type', label: 'Type', icon: MapPin },
          { id: 'service', label: 'Service', icon: Wrench },
          { id: 'slot', label: 'Rendez-vous', icon: Calendar },
          { id: 'info', label: 'Infos', icon: User },
          { id: 'payment', label: 'Paiement', icon: CreditCard },
        ].map((s, idx) => (
          <div
            key={s.id}
            className={`flex-1 flex flex-col items-center py-4 border-b-2 transition-all ${
              step === s.id ? 'border-primary text-primary' : 'border-transparent text-slate-400'
            }`}
          >
            <s.icon className={`w-5 h-5 mb-1 ${step === s.id ? 'text-primary' : 'text-slate-300'}`} />
            <span className="text-xs font-semibold uppercase tracking-wider hidden sm:block">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="p-8 flex-1">
        <AnimatePresence mode="wait">
          {step === 'type' && (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-slate-800">Où souhaitez-vous la réparation ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setAppointmentType('atelier');
                    setStep('service');
                  }}
                  className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col gap-4 ${
                    appointmentType === 'atelier' ? 'border-primary bg-blue-50/50' : 'border-slate-100 hover:border-blue-200'
                  }`}
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-primary">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">En Atelier</h3>
                    <p className="text-slate-500 text-sm">Déposez votre appareil dans notre magasin partenaire.</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setAppointmentType('domicile');
                    setStep('service');
                  }}
                  className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col gap-4 ${
                    appointmentType === 'domicile' ? 'border-primary bg-blue-50/50' : 'border-slate-100 hover:border-blue-200'
                  }`}
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-primary">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">À Domicile</h3>
                    <p className="text-slate-500 text-sm">Un technicien se déplace chez vous pour réparer.</p>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {step === 'service' && (
            <motion.div
              key="service"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-slate-800">Quel appareil pose problème ?</h2>
              <div className="grid grid-cols-1 gap-3">
                {services.map(service => (
                  <button
                    key={service.id}
                    onClick={() => {
                      setSelectedService(service);
                      setStep('slot');
                    }}
                    className={`p-4 rounded-xl border transition-all text-left flex justify-between items-center ${
                      selectedService?.id === service.id ? 'border-primary bg-blue-50 text-primary ring-2 ring-primary/20' : 'border-slate-200 hover:border-primary/50'
                    }`}
                  >
                    <div>
                      <h3 className="font-bold">{service.name}</h3>
                      <p className="text-slate-500 text-sm">{service.description}</p>
                    </div>
                    <span className="font-bold text-lg">{service.price}€</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'slot' && (
            <motion.div
              key="slot"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-slate-800">Choisissez une date et un créneau</h2>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {slots.length > 0 ? (
                  slots.map(slot => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot)}
                      className={`relative p-3 rounded-lg border text-sm font-semibold transition-all ${
                        selectedSlot?.id === slot.id 
                          ? 'bg-primary text-white border-primary' 
                          : slot.is_recommended 
                            ? 'bg-green-50 text-green-700 border-green-300 hover:border-green-500'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-primary'
                      }`}
                    >
                      {slot.start_time.slice(0, 5)}
                      {slot.is_recommended && !selectedSlot?.id && (
                        <span className="absolute -top-2 -right-2 flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="col-span-full text-slate-400 text-center py-8">
                    {selectedDate ? 'Aucun créneau disponible pour cette date.' : 'Sélectionnez une date.'}
                  </p>
                )}
              </div>
              
              {appointmentType === 'domicile' && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-800 flex items-start gap-3">
                   <MapPin className="w-5 h-5 shrink-0 mt-0.5" />
                   <p>
                     <strong>Astuce écolo :</strong> Lors de l&apos;étape suivante, en renseignant votre adresse, nous mettrons en évidence les créneaux où un technicien est déjà dans votre secteur.
                   </p>
                </div>
              )}
            </motion.div>
          )}

          {step === 'info' && (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-slate-800">Vos informations</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  placeholder="Nom complet"
                  className="p-4 rounded-xl border border-slate-200"
                  value={clientInfo.name}
                  onChange={e => setClientInfo({ ...clientInfo, name: e.target.value })}
                />
                <input
                  placeholder="Téléphone"
                  className="p-4 rounded-xl border border-slate-200"
                  value={clientInfo.phone}
                  onChange={e => setClientInfo({ ...clientInfo, phone: e.target.value })}
                />
              </div>
              <input
                placeholder="Email"
                type="email"
                className="w-full p-4 rounded-xl border border-slate-200"
                value={clientInfo.email}
                onChange={e => setClientInfo({ ...clientInfo, email: e.target.value })}
              />
              {appointmentType === 'domicile' && (
                <input
                  placeholder="Adresse d'intervention"
                  className="w-full p-4 rounded-xl border border-slate-200"
                  value={clientInfo.address}
                  onChange={e => setClientInfo({ ...clientInfo, address: e.target.value })}
                />
              )}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="font-bold mb-3">Détails de l&apos;appareil</h3>
                <input
                  placeholder="Référence de l'appareil (ex: Samsung S21)"
                  className="w-full p-4 rounded-xl border border-slate-200 mb-4"
                  value={clientInfo.material_ref}
                  onChange={e => setClientInfo({ ...clientInfo, material_ref: e.target.value })}
                />
                <textarea
                  placeholder="Description de la panne"
                  className="w-full p-4 rounded-xl border border-slate-200 min-h-[100px]"
                  value={clientInfo.issue}
                  onChange={e => setClientInfo({ ...clientInfo, issue: e.target.value })}
                />
              </div>
            </motion.div>
          )}

          {step === 'auth' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-center max-w-md mx-auto"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                <User className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Vérification de votre email</h2>
              <p className="text-slate-600">
                Nous avons envoyé un code de confirmation à <strong>{clientInfo.email}</strong>.
                Veuillez le saisir ci-dessous pour confirmer votre identité.
              </p>
              
              <div className="pt-4">
                <input
                  type="text"
                  placeholder="Code de confirmation"
                  maxLength={8}
                  className="w-full p-4 text-center text-2xl tracking-widest font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                />
              </div>
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6">
                <h3 className="font-bold text-slate-800 mb-2">Récapitulatif</h3>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>{selectedService.name}</span>
                  <span className="font-bold">{selectedService.price}€</span>
                </div>
                <div className="text-sm text-slate-500">
                  Le {selectedDate} à {selectedSlot.start_time.slice(0, 5)}
                </div>
              </div>
              <StripeWrapper clientSecret={clientSecret!}>
                <PaymentForm clientSecret={clientSecret!} appointmentId={appointmentId!} />
              </StripeWrapper>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
        {step !== 'type' && step !== 'payment' ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" /> Retour
          </button>
        ) : (
          <div></div>
        )}

        {step !== 'payment' && (
          <button
            onClick={handleNext}
            disabled={
              loading ||
              (step === 'type' && !appointmentType) ||
              (step === 'service' && !selectedService) ||
              (step === 'slot' && (!selectedSlot || !selectedDate)) ||
              (step === 'auth' && otpCode.length < 6)
            }
            className="bg-primary text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                {step === 'info' ? 'Vérifier l\'identité' : step === 'auth' ? 'Procéder au paiement' : 'Continuer'} <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
