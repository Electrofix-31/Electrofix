'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Wrench, MapPin, Calendar, User, CreditCard, ChevronRight, ChevronLeft, Loader2, Mail } from 'lucide-react';
import StripeWrapper from './StripeWrapper';
import PaymentForm from './PaymentForm';

type Step = 'type' | 'postal' | 'equipment' | 'slot' | 'info' | 'auth' | 'review' | 'payment';

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
    addressLine1: '',
    addressLine2: '',
    city: '',
    access_instructions: '',
    material_ref: '',
    issue: ''
  });

  // Auth State (Magic Link)
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Stripe
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  // Data
  const [slots, setSlots] = useState<any[]>([]);

  const supabase = createClient();

  // Fix Hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load basic data (Categories, Warranties, Services)
  useEffect(() => {
    if (mounted) {
      const fetchData = async () => {
        // Chargement simple des catégories
        const { data: catData } = await supabase.from('equipment_categories').select('*').order('name');
        const { data: warData } = await supabase.from('warranty_types').select('*').order('name');
        const { data: servData } = await supabase.from('services').select('*');
        
        setCategories(catData || []);
        setWarrantyTypes(warData || []);
        
        // On stocke tous les services pour pouvoir les chercher ensuite
        if (servData) {
          // Astuce : on stocke ça dans le localStorage temporairement ou on utilise un state local
          window.sessionStorage.setItem('all_services', JSON.stringify(servData));
        }
      };
      fetchData();
    }
  }, [mounted]);

  // Déterminer le service (prix) quand le type de rdv change (Logique Anti-Lapin)
  useEffect(() => {
    if (appointmentType) {
      const storedServices = window.sessionStorage.getItem('all_services');
      if (storedServices) {
        const allServices = JSON.parse(storedServices);
        // On cherche le service global de déplacement/diagnostic
        const service = allServices.find((s: any) => 
          appointmentType === 'atelier' 
            ? s.name.toLowerCase().includes('atelier') || s.name.toLowerCase().includes('diagnostic')
            : s.name.toLowerCase().includes('domicile') || s.name.toLowerCase().includes('déplacement')
        );
        setSelectedService(service || allServices[0]); // Fallback au premier service si non trouvé
      }
    }
  }, [appointmentType]);

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

  // Load slots when date changes
  useEffect(() => {
    if (selectedDate && appointmentType) {
      const postalCodeQuery = postalCode ? `&postal_code=${postalCode}` : '';
      fetch(`/api/appointments/slots?service_type=${appointmentType}&date=${selectedDate}${postalCodeQuery}`)
        .then(res => res.json())
        .then(data => setSlots(data))
        .catch(err => console.error('Error fetching slots:', err));
    }
  }, [selectedDate, appointmentType, postalCode]);

  const handleNext = async () => {
    if (step === 'type') {
      if (appointmentType === 'domicile') setStep('postal');
      else setStep('equipment');
    }
    else if (step === 'postal' && postalCode.length === 5) setStep('equipment');
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
    else if (step === 'equipment') {
      if (appointmentType === 'domicile') setStep('postal');
      else setStep('type');
    }
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Si l'utilisateur se connecte (via un autre onglet), on bascule l'onglet actuel
        if (step === 'auth' || step === 'info') {
          // On attend un tout petit peu pour laisser le temps aux cookies de se poser
          await new Promise(resolve => setTimeout(resolve, 500));
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
      setSelectedCategoryId(parsed.categoryId || '');
      setSelectedEquipmentTypeId(parsed.equipmentTypeId || '');
      setSelectedWarrantyTypeId(parsed.warrantyTypeId || '');
      setCustomQuestion(parsed.customQuestion || '');
      setStep('review');
      // Nettoyer l'URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (!urlStep) {
      // SI ON EST AU DÉBUT (PAS DE PARAMÈTRE DANS L'URL) -> ON NE FORCE PAS L'ÉTAPE
      // On peut garder les données en mémoire si on veut que le client retrouve son brouillon 
      // mais on reste à l'étape 'type'
      setStep('type');
    }
  }, [mounted]); // On ne surveille plus 'step' ici pour éviter les boucles de restauration

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
        info: clientInfo,
        categoryId: selectedCategoryId,
        equipmentTypeId: selectedEquipmentTypeId,
        warrantyTypeId: selectedWarrantyTypeId,
        customQuestion: customQuestion
      }));
    }
  }, [step, appointmentType, postalCode, selectedService, selectedDate, selectedSlot, clientInfo, selectedCategoryId, selectedEquipmentTypeId, selectedWarrantyTypeId, customQuestion, mounted]);

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
    if (!selectedSlot || !selectedDate || !selectedService) {
      setError("Informations de créneau ou de service manquantes.");
      return;
    }

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
          client_address: `${clientInfo.addressLine1}${clientInfo.addressLine2 ? ', ' + clientInfo.addressLine2 : ''}, ${postalCode} ${clientInfo.city}`,
          geocoding_address: `${clientInfo.addressLine1}, ${postalCode} ${clientInfo.city}`,
          access_instructions: clientInfo.access_instructions,
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

  const formatDateFR = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="flex flex-col min-h-[500px]">
      {/* Progress Bar */}
      <div className="flex border-b border-slate-100 bg-slate-50/50">
        {[
          { id: 'type', label: 'Type', icon: MapPin },
          { id: 'equipment', label: 'Appareil', icon: Wrench },
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
                    setStep('equipment');
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
                      setTimeout(() => setStep('equipment'), 300);
                    }
                  }}
                />
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
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Détails de l&apos;appareil</h2>
                {selectedService && (
                  <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">
                    Forfait Diagnostic : {selectedService.price}€
                  </div>
                )}
              </div>
              
              <div className="space-y-6">
                {/* Catégorie */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">1. Famille d'appareil</label>
                  {categories.length === 0 ? (
                    <div className="text-sm text-slate-400 italic">Chargement des catégories...</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setSelectedCategoryId(cat.id);
                            setSelectedEquipmentTypeId('');
                          }}
                          className={`p-3 text-sm rounded-xl border font-semibold transition-all ${
                            selectedCategoryId === cat.id ? 'bg-primary text-white border-primary shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-primary/50'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Matériel */}
                {selectedCategoryId && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">2. Type exact</label>
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
                  <div className="col-span-full p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-500 font-medium mb-3">
                      {selectedDate 
                        ? (appointmentType === 'domicile' 
                            ? "Nos techniciens ne sont pas disponibles à domicile pour cette date."
                            : "Aucun créneau n'est disponible en atelier pour cette date.")
                        : 'Veuillez sélectionner une date pour voir les disponibilités.'}
                    </p>
                    {selectedDate && appointmentType === 'domicile' && (
                      <button 
                        onClick={() => {
                          setAppointmentType('atelier');
                          setStep('equipment');
                          setSelectedDate('');
                          setSelectedSlot(null);
                        }}
                        className="bg-white text-primary border border-primary/20 px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary hover:text-white transition-all shadow-sm"
                      >
                        Préférer un dépôt en magasin ?
                      </button>
                    )}
                  </div>
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
                <div className="space-y-4">
                  <input
                    placeholder="Adresse ligne 1 (ex: 12 rue des lilas)"
                    className="w-full p-4 rounded-xl border border-slate-200"
                    value={clientInfo.addressLine1}
                    onChange={e => setClientInfo({ ...clientInfo, addressLine1: e.target.value })}
                  />
                  <input
                    placeholder="Adresse complémentaire (Bâtiment, Étage...)"
                    className="w-full p-4 rounded-xl border border-slate-200"
                    value={clientInfo.addressLine2}
                    onChange={e => setClientInfo({ ...clientInfo, addressLine2: e.target.value })}
                  />
                  <div className="flex gap-4">
                    <input
                      placeholder="Code Postal"
                      className="w-1/3 p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-not-allowed"
                      value={postalCode}
                      disabled
                    />
                    <input
                      placeholder="Ville"
                      className="w-2/3 p-4 rounded-xl border border-slate-200"
                      value={clientInfo.city}
                      onChange={e => setClientInfo({ ...clientInfo, city: e.target.value })}
                    />
                  </div>
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
                    <label className="block text-xs font-black text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Instructions d'accès (Optionnel)
                    </label>
                    <textarea
                      placeholder="Code portail, nom sur l'interphone, indication routière, chien méchant..."
                      className="w-full p-4 rounded-xl border border-amber-200 bg-white min-h-[80px] text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                      value={clientInfo.access_instructions}
                      onChange={e => setClientInfo({ ...clientInfo, access_instructions: e.target.value })}
                    />
                  </div>
                </div>
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
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-600 font-medium">Intervention :</span>
                      <span className="font-bold capitalize text-primary">{appointmentType === 'domicile' ? 'À Domicile' : 'En Atelier'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-600 font-medium">Catégorie :</span>
                      <span className="font-bold">
                        {categories.find(c => c.id === selectedCategoryId)?.name || 'Non spécifié'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-600 font-medium">Appareil :</span>
                      <span className="font-bold">
                        {equipmentTypes.find(t => t.id === selectedEquipmentTypeId)?.name || customQuestion || 'Non spécifié'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-600 font-medium">Référence :</span>
                      <span className="font-bold text-xs truncate max-w-[150px]">
                        {clientInfo.material_ref || 'Non précisée'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-600 font-medium">Garantie :</span>
                      <span className="font-bold text-xs uppercase px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                        {warrantyTypes.find(w => w.id === selectedWarrantyTypeId)?.name || 'Non spécifiée'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-600 font-medium">Date :</span>
                      <span className="font-bold capitalize">{formatDateFR(selectedDate)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">Heure :</span>
                      <span className="font-bold text-lg">{selectedSlot?.start_time?.slice(0, 5) || '--:--'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Vos Coordonnées</h3>
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase font-black">Nom & Prénom</span>
                      <p className="text-slate-800 font-bold">{clientInfo.name || 'Non renseigné'}</p>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase font-black">Contact</span>
                      <p className="text-slate-600 text-sm font-medium">{clientInfo.email}</p>
                      <p className="text-slate-600 text-sm font-medium">{clientInfo.phone || 'Pas de téléphone'}</p>
                    </div>
                    {appointmentType === 'domicile' && (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-black">Adresse</span>
                        <p className="text-slate-600 text-sm italic">
                          {clientInfo.addressLine1 ? `${clientInfo.addressLine1}${clientInfo.addressLine2 ? ', ' + clientInfo.addressLine2 : ''}, ${postalCode} ${clientInfo.city}` : 'Non renseignée'}
                        </p>
                      </div>
                    )}
                    {appointmentType === 'domicile' && clientInfo.access_instructions && (
                      <div className="flex flex-col mt-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <span className="text-[10px] text-amber-600 uppercase font-black flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Instructions d'accès
                        </span>
                        <p className="text-amber-800 text-xs mt-1">{clientInfo.access_instructions}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-primary italic">Acompte de réservation</h4>
                  <p className="text-[10px] text-primary/60 uppercase font-black">Diagnostic & Déplacement inclus</p>
                </div>
                <div className="text-3xl font-black text-primary">
                  {selectedService?.price || 0}€
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800 italic text-center">
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
              (step === 'equipment' && (!selectedEquipmentTypeId && !customQuestion)) ||
              (step === 'slot' && (!selectedSlot || !selectedDate)) ||
              (step === 'info' && (!clientInfo.email || !clientInfo.name || (appointmentType === 'domicile' && (!clientInfo.addressLine1 || !clientInfo.city))))
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
