'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Wrench, MapPin, Calendar, User, CreditCard, ChevronRight, ChevronLeft, Loader2, Mail } from 'lucide-react';
import StripeWrapper from './StripeWrapper';
import PaymentForm from './PaymentForm';

type Step = 'type' | 'postal' | 'service' | 'equipment' | 'slot' | 'info' | 'auth' | 'review' | 'payment';

export default function BookingWizard() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>('type');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [appointmentType, setAppointmentType] = useState<'atelier' | 'domicile' | null>(null);
  const [postalCode, setPostalCode] = useState<string>('');
  const [selectedService, setSelectedService] = useState<any>(null);
  
  // Nouveaux états Matériel
  const [categories, setCategories] = useState<any[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<any[]>([]);
  const [warrantyTypes, setWarrantyTypes] = useState<any[]>([]);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedEquipmentTypeId, setSelectedEquipmentTypeId] = useState<string>('');
  const [selectedWarrantyTypeId, setSelectedWarrantyTypeId] = useState<string>('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

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

  // Auth State (Magic Link)
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Stripe
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  // Data
  const [services, setServices] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);

  const supabase = createClient();

  // Fix Hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load equipment data
  useEffect(() => {
    if (mounted) {
      const fetchData = async () => {
        const { data: catData } = await supabase.from('equipment_categories').select('*').order('name');
        const { data: warData } = await supabase.from('warranty_types').select('*').order('name');
        setCategories(catData || []);
        setWarrantyTypes(warData || []);
      };
      fetchData();
    }
  }, [mounted]);

  // Load equipment types when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      const fetchTypes = async () => {
        const { data } = await supabase.from('equipment_types').select('*').eq('category_id', selectedCategoryId).order('name');
        setEquipmentTypes(data || []);
      };
      fetchTypes();
    } else {
      setEquipmentTypes([]);
    }
  }, [selectedCategoryId]);

  const handleNext = async () => {
    if (step === 'type') {
      if (appointmentType === 'domicile') setStep('postal');
      else setStep('service');
    }
    else if (step === 'postal' && postalCode.length === 5) setStep('service');
    else if (step === 'service' && selectedService) setStep('equipment');
    else if (step === 'equipment' && (selectedEquipmentTypeId || customQuestion)) setStep('slot');
    else if (step === 'slot' && selectedSlot) setStep('info');
    else if (step === 'info') {
      await handleAuthCheck();
    }
    else if (step === 'review') {
      await createAppointment();
    }
  };

  const handleBack = () => {
    if (step === 'postal') setStep('type');
    else if (step === 'service') {
      if (appointmentType === 'domicile') setStep('postal');
      else setStep('type');
    }
    else if (step === 'equipment') setStep('service');
    else if (step === 'slot') setStep('equipment');
    else if (step === 'info') setStep('slot');
    else if (step === 'auth') setStep('info');
    else if (step === 'review') setStep('info');
    else if (step === 'payment') setStep('review');
  };

  const handleAuthCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const cleanEmail = clientInfo.email.trim().toLowerCase();
      
      // Si déjà connecté AVEC LE MÊME EMAIL -> On passe au récapitulatif
      if (session && session.user.email === cleanEmail) {
        setStep('review');
      } else {
        // Si connecté avec un AUTRE email -> On déconnecte d'abord
        if (session) {
          await supabase.auth.signOut();
        }

        // On envoie le lien magique via notre API Resend
        if (!cleanEmail) throw new Error("Veuillez renseigner un email valide.");
        
        const res = await fetch('/api/auth/magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: cleanEmail,
            name: clientInfo.name,
            phone: clientInfo.phone
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi du lien.");

        setMagicLinkSent(true);
        setStep('auth');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Suppression de verifyOtpAndBook car on utilise maintenant un lien direct

  // Écouteur en temps réel pour l'authentification (pour mettre à jour la fenêtre automatiquement)
  useEffect(() => {
    if (!mounted) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Si l'utilisateur se connecte (via un autre onglet), on le passe au récapitulatif
        if (step === 'auth') {
          setStep('review');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [mounted, step]);

  // Auto-step from URL (Magic Link Redirect)
  useEffect(() => {
    if (!mounted) return;
    const params = new URLSearchParams(window.location.search);
    const urlStep = params.get('step');
    
    // Récupérer les données stockées
    const savedData = localStorage.getItem('pending_booking');
    
    if (urlStep === 'review' && savedData) {
      const parsed = JSON.parse(savedData);
      setAppointmentType(parsed.type);
      setPostalCode(parsed.postalCode || '');
      setSelectedService(parsed.service);
      setSelectedDate(parsed.date);
      setSelectedSlot(parsed.slot);
      setClientInfo(parsed.info);
      setStep('review');
      // Nettoyer l'URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (!urlStep && step === 'type') {
      // SI ON EST AU DÉBUT ET PAS DE RETOUR MAIL -> ON EFFACE TOUT
      localStorage.removeItem('pending_booking');
      setClientInfo({
        name: '',
        email: '',
        phone: '',
        address: '',
        material_ref: '',
        issue: '',
      });
      setPostalCode('');
      setSelectedService(null);
      setSelectedDate('');
      setSelectedSlot(null);
    }
  }, [mounted, step]);

  // Sauvegarde automatique à chaque changement d'étape pour ne rien perdre
  useEffect(() => {
    if (!mounted) return;
    if (step !== 'type' && step !== 'payment') {
      localStorage.setItem('pending_booking', JSON.stringify({
        type: appointmentType,
        postalCode,
        service: selectedService,
        date: selectedDate,
        slot: selectedSlot,
        info: clientInfo
      }));
    }
  }, [step, appointmentType, postalCode, selectedService, selectedDate, selectedSlot, clientInfo, mounted]);

  if (!mounted) return <div className="p-12 text-center text-slate-400">Chargement de l&apos;assistant...</div>;

  const uploadFiles = async () => {
    if (files.length === 0) return [];
    
    setUploading(true);
    const urls = [];
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `appointments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('appointment-attachments')
        .upload(filePath, file);

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('appointment-attachments')
          .getPublicUrl(filePath);
        urls.push(publicUrl);
      }
    }
    
    setUploading(false);
    return urls;
  };

  const createAppointment = async () => {
    setLoading(true);
    setError(null);
    try {
      const attachment_urls = await uploadFiles();

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
          // Nouveaux champs
          equipment_type_id: selectedEquipmentTypeId || null,
          warranty_type_id: selectedWarrantyTypeId || null,
          custom_equipment_question: customQuestion || null,
          attachment_urls: attachment_urls
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
              initial={{ opacity: 1, x: 20 }}
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
                    setStep('postal');
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

          {step === 'postal' && (
            <motion.div
              key="postal"
              initial={{ opacity: 1, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                <MapPin className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Quelle est votre zone ?</h2>
              <p className="text-slate-600">
                Saisissez votre code postal pour que nous puissions optimiser le trajet de votre technicien.
              </p>
              <div className="max-w-[200px] mx-auto pt-4">
                <input
                  type="text"
                  placeholder="Ex: 31000"
                  maxLength={5}
                  autoFocus
                  className="w-full p-4 text-center text-2xl font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                  value={postalCode}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                    setPostalCode(val);
                    if (val.length === 5) {
                      // On attend un tout petit peu pour laisser l'utilisateur voir son code
                      setTimeout(() => setStep('service'), 300);
                    }
                  }}
                />
              </div>
            </motion.div>
          )}

          {step === 'service' && (
            <motion.div
              key="service"
              initial={{ opacity: 1, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-slate-800">Quel type de prestation ?</h2>
              <div className="grid grid-cols-1 gap-3">
                {services.map(service => (
                  <button
                    key={service.id}
                    onClick={() => {
                      setSelectedService(service);
                      setStep('equipment');
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

          {step === 'equipment' && (
            <motion.div
              key="equipment"
              initial={{ opacity: 1, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-slate-800">Détails de l&apos;appareil</h2>
              
              <div className="space-y-4">
                {/* Catégorie */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Thème / Catégorie</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategoryId(cat.id);
                          setSelectedEquipmentTypeId('');
                        }}
                        className={`p-3 text-sm rounded-xl border font-semibold transition-all ${
                          selectedCategoryId === cat.id ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Matériel */}
                {selectedCategoryId && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Type de matériel</label>
                    <div className="grid grid-cols-2 gap-2">
                      {equipmentTypes.map(type => (
                        <button
                          key={type.id}
                          onClick={() => {
                            setSelectedEquipmentTypeId(type.id);
                            setCustomQuestion('');
                          }}
                          className={`p-3 text-sm rounded-xl border font-semibold transition-all ${
                            selectedEquipmentTypeId === type.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {type.name}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setSelectedEquipmentTypeId('');
                          setCustomQuestion('Autre');
                        }}
                        className={`p-3 text-sm rounded-xl border font-semibold transition-all ${
                          !selectedEquipmentTypeId && customQuestion ? 'bg-accent text-slate-900 border-accent' : 'bg-slate-50 text-slate-400 border-dashed border-slate-300'
                        }`}
                      >
                        + Autre / Question
                      </button>
                    </div>
                  </div>
                )}

                {/* Question libre */}
                {(!selectedEquipmentTypeId && customQuestion) && (
                  <div className="animate-in zoom-in-95">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Votre question ou matériel spécifique</label>
                    <textarea
                      placeholder="Précisez votre besoin ici..."
                      className="w-full p-4 rounded-xl border border-slate-200 min-h-[80px] focus:ring-2 focus:ring-primary outline-none"
                      value={customQuestion === 'Autre' ? '' : customQuestion}
                      onChange={e => setCustomQuestion(e.target.value)}
                    />
                  </div>
                )}

                {/* Garantie */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">État de la garantie</label>
                  <select 
                    className="w-full p-4 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-primary"
                    value={selectedWarrantyTypeId}
                    onChange={e => setSelectedWarrantyTypeId(e.target.value)}
                  >
                    <option value="">-- Sélectionnez --</option>
                    {warrantyTypes.map(war => (
                      <option key={war.id} value={war.id}>{war.name}</option>
                    ))}
                  </select>
                </div>

                {/* Fichiers joints */}
                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-sm font-bold text-slate-700 mb-2 italic">Photos ou documents (Max 3 Mo par fichier)</label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={e => {
                        if (e.target.files) {
                          setFiles(Array.from(e.target.files).slice(0, 3)); // Limite à 3 fichiers
                        }
                      }}
                      className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-primary hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>
                  {files.length > 0 && (
                    <div className="mt-2 text-xs text-slate-400 font-medium">
                      {files.length} fichier(s) prêt(s) à l&apos;envoi
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 'slot' && (
            <motion.div
              key="slot"
              initial={{ opacity: 1, x: 20 }}
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
                     <strong>Astuce écologique :</strong> Lors de l&apos;étape suivante, en renseignant votre adresse, nous mettrons en évidence les créneaux où un technicien est déjà dans votre secteur.
                   </p>
                </div>
              )}            </motion.div>
          )}

          {step === 'info' && (
            <motion.div
              key="info"
              initial={{ opacity: 1, x: 20 }}
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
                  onChange={e => {
                    const newInfo = { ...clientInfo, material_ref: e.target.value };
                    setClientInfo(newInfo);
                    sessionStorage.setItem('pending_booking', JSON.stringify({
                      type: appointmentType,
                      service: selectedService,
                      date: selectedDate,
                      slot: selectedSlot,
                      info: newInfo
                    }));
                  }}
                />
                <textarea
                  placeholder="Description de la panne"
                  className="w-full p-4 rounded-xl border border-slate-200 min-h-[100px]"
                  value={clientInfo.issue}
                  onChange={e => {
                    const newInfo = { ...clientInfo, issue: e.target.value };
                    setClientInfo(newInfo);
                    sessionStorage.setItem('pending_booking', JSON.stringify({
                      type: appointmentType,
                      service: selectedService,
                      date: selectedDate,
                      slot: selectedSlot,
                      info: newInfo
                    }));
                  }}
                />
              </div>
            </motion.div>
          )}

          {step === 'auth' && (
            <motion.div
              key="auth"
              initial={{ opacity: 1, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-center max-w-md mx-auto"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                <Mail className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Lien de validation envoyé</h2>
              <p className="text-slate-600">
                Nous avons envoyé un lien de confirmation à <strong>{clientInfo.email}</strong>.
              </p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-500">
                Cliquez sur le lien contenu dans l&apos;email pour valider votre identité et finaliser votre réservation. 
                <br/><br/>
                <em>Cette fenêtre se mettra à jour automatiquement après votre clic.</em>
              </div>
            </motion.div>
          )}

          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 1, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-slate-800">Récapitulatif de votre commande</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Service & RDV</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">Type :</span>
                      <span className="font-bold capitalize">{appointmentType}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">Prestation :</span>
                      <span className="font-bold text-primary">{selectedService?.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">Date :</span>
                      <span className="font-bold">{selectedDate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">Heure :</span>
                      <span className="font-bold">{selectedSlot?.start_time.slice(0, 5)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Vos Coordonnées</h3>
                  <div className="space-y-3">
                    <p className="text-slate-800 font-bold">{clientInfo.name}</p>
                    <p className="text-slate-600 text-sm">{clientInfo.email}</p>
                    <p className="text-slate-600 text-sm">{clientInfo.phone}</p>
                    {appointmentType === 'domicile' && (
                      <p className="text-slate-600 text-sm italic">{clientInfo.address}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-primary">Total à régler maintenant</h4>
                  <p className="text-xs text-primary/60">Paiement sécurisé par Stripe</p>
                </div>
                <div className="text-3xl font-black text-primary">
                  {selectedService?.price}€
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800 italic">
                En cliquant sur &quot;Procéder au paiement&quot;, vous confirmez l&apos;exactitude des informations ci-dessus.
              </div>
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 1, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-primary italic text-sm">Finalisation sécurisée</h4>
                  <p className="text-xs text-primary/60">Référence : {selectedService.name}</p>
                </div>
                <div className="text-2xl font-black text-primary">
                  {selectedService?.price}€
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
        {step !== 'type' && step !== 'payment' && step !== 'auth' ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" /> Retour
          </button>
        ) : (
          <div></div>
        )}

        {step !== 'payment' && step !== 'auth' && (
          <button
            onClick={handleNext}
            disabled={
              loading ||
              (step === 'type' && !appointmentType) ||
              (step === 'postal' && postalCode.length < 5) ||
              (step === 'service' && !selectedService) ||
              (step === 'slot' && (!selectedSlot || !selectedDate)) ||
              (step === 'info' && (!clientInfo.email || !clientInfo.name))
            }
            className="bg-primary text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                {step === 'info' ? 'Vérifier l\'identité' : step === 'review' ? 'Procéder au paiement' : 'Continuer'} <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
