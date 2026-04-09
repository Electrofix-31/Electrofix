'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Calendar, Filter, Map, List, ChevronRight, Loader2, Wrench, Shield, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Import dynamique de la carte pour éviter les erreurs SSR (Leaflet)
const MapAdmin = dynamic(() => import('@/components/admin/MapAdmin'), { 
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-slate-100 animate-pulse rounded-3xl" />
});

export default function AdminAppointmentsPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [view, setView] = useState<'map' | 'list'>('list'); // Mode liste par défaut pour voir les détails
  
  // États pour la liste
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<{isOpen: boolean, appId: string | null} | null>(null);
  const [maxRadius, setMaxRadius] = useState<number>(20);
  const supabase = createClient();

  useEffect(() => {
    fetchAppointments();
    fetchSettings();
  }, [date]);

  const fetchSettings = async () => {
    const { data } = await supabase.from('admin_settings').select('value').eq('key', 'max_intervention_radius').single();
    if (data?.value?.value) {
      setMaxRadius(data.value.value);
    }
  };

  const fetchAppointments = async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles!appointments_client_id_fkey(email, first_name, last_name, phone),
        services(name, price),
        equipment_types(name, equipment_categories(name)),
        warranty_types(name)
      `)
      .eq('date', date)
      .order('time', { ascending: true });

    if (error) console.error("Erreur de récupération des RDV:", error);
    else setAppointments(data || []);
    setLoadingList(false);
  };

  const handleCancelAction = async (action: 'refund' | 'no_refund' | 'abort') => {
    if (!cancelDialog?.appId || action === 'abort') {
      setCancelDialog(null);
      return;
    }

    const appId = cancelDialog.appId;
    const app = appointments.find(a => a.id === appId);
    if (!app) return;

    // On ferme la modale pour éviter les doubles clics
    setCancelDialog(null);

    if (action === 'refund') {
      if (app.stripe_payment_intent_id) {
         try {
           const res = await fetch('/api/admin/appointments/refund', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ appointmentId: app.id })
           });

           const result = await res.json();

           if (res.ok) {
             alert('Annulation et remboursement confirmés avec succès !');
             setAppointments(appointments.map(a => a.id === app.id ? { ...a, status: 'cancelled', payment_status: 'refunded' } : a));
           } else {
             alert(`Erreur lors du remboursement: ${result.error}`);
           }
         } catch (err) {
           alert('Erreur réseau lors de la demande de remboursement.');
         }
      } else {
        alert('Aucun paiement Stripe associé à ce rendez-vous.');
      }
    } else if (action === 'no_refund') {
      const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', app.id);
      if (!error) {
        setAppointments(appointments.map(a => a.id === app.id ? { ...a, status: 'cancelled' } : a));
      } else {
        alert("Erreur lors de l'annulation.");
      }
    }
  };

  const getStatusBadge = (status: string, payment_status?: string) => {
    const statusMap: any = {
      pending_payment: { color: 'bg-amber-100 text-amber-700', label: 'Attente Paiement' },
      pending: { color: 'bg-blue-100 text-blue-700', label: 'À Confirmer' },
      confirmed: { color: 'bg-green-100 text-green-700', label: 'Confirmé' },
      completed: { color: 'bg-slate-200 text-slate-700', label: 'Terminé' },
      cancelled: { color: 'bg-red-100 text-red-700', label: 'Annulé' },
    };

    let label = statusMap[status]?.label || status;
    let color = statusMap[status]?.color || 'bg-slate-100 text-slate-700';

    if (status === 'cancelled' && payment_status === 'refunded') {
      label = 'Annulé & Remboursé';
      color = 'bg-purple-100 text-purple-700';
    }

    return <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${color}`}>{label}</span>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestion des Tournées</h1>
          <p className="text-slate-500">Supervision géographique et temporelle des interventions.</p>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
            <button 
              onClick={() => setView('list')}
              className={`p-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${view === 'list' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <List className="w-4 h-4" /> Liste
            </button>
            <button 
              onClick={() => setView('map')}
              className={`p-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${view === 'map' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Map className="w-4 h-4" /> Carte
            </button>
          </div>
          
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {view === 'map' ? (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                <Map className="w-5 h-5 text-accent" /> 
                Répartition Géographique (Rayon {maxRadius}km)
              </h2>
              <MapAdmin date={date} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
                  <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-1">Magasin</p>
                  <p className="text-xl font-black text-slate-900">Carbonne</p>
                  <p className="text-sm text-slate-500 mt-2">Point central des tournées</p>
               </div>
               <div className="bg-green-50 border border-green-100 p-6 rounded-2xl">
                  <p className="text-green-600 text-xs font-bold uppercase tracking-widest mb-1">Géo-Optimisation</p>
                  <p className="text-xl font-black text-slate-900">Activée</p>
                  <p className="text-sm text-slate-500 mt-2">Suggests proches activées</p>
               </div>
               <div className="bg-orange-50 border border-orange-100 p-6 rounded-2xl">
                  <p className="text-orange-600 text-xs font-bold uppercase tracking-widest mb-1">Zone Rayon</p>
                  <p className="text-xl font-black text-slate-900">{maxRadius} km</p>
                  <p className="text-sm text-slate-500 mt-2">Limitation automatique active</p>
               </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
            {loadingList ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 gap-4">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="font-bold">Chargement des rendez-vous...</span>
              </div>
            ) : appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 gap-2">
                <Calendar className="w-12 h-12 opacity-50 mb-2" />
                <span className="font-bold text-lg text-slate-500">Aucun rendez-vous</span>
                <span className="text-sm">Il n'y a pas d'interventions prévues pour cette date.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[10px] uppercase tracking-widest border-b border-slate-50 bg-slate-50/50">
                      <th className="px-6 py-4 font-bold">Heure</th>
                      <th className="px-6 py-4 font-bold">Client & Lieu</th>
                      <th className="px-6 py-4 font-bold">Appareil & Problème</th>
                      <th className="px-6 py-4 font-bold">Statut & Prix</th>
                      <th className="px-6 py-4 font-bold text-right">Documents</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {appointments.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/50 transition-colors group">
                        {/* HEURE */}
                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-col">
                            <span className="font-black text-lg text-slate-900">{app.time.slice(0, 5)}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${app.appointment_type === 'domicile' ? 'text-primary' : 'text-orange-500'}`}>
                              {app.appointment_type}
                            </span>
                          </div>
                        </td>
                        
                        {/* CLIENT */}
                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{app.profiles?.first_name || ''} {app.profiles?.last_name || 'Client Inconnu'}</span>
                            <span className="text-xs text-slate-500">{app.profiles?.phone || 'Pas de tél'}</span>
                            {app.appointment_type === 'domicile' && (
                              <div className="mt-2 text-xs text-slate-600 bg-slate-100 p-2 rounded-lg border border-slate-200 flex gap-2 items-start">
                                <Map className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                                <span>{app.client_address}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        
                        {/* APPAREIL */}
                        <td className="px-6 py-4 align-top max-w-[250px]">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center gap-2">
                              <Wrench className="w-4 h-4 text-slate-400" />
                              <span className="font-bold text-slate-800 text-sm">
                                {app.equipment_types?.name || app.custom_equipment_question || 'Non spécifié'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider pl-6">
                              {app.equipment_types?.equipment_categories?.name || 'Catégorie inconnue'}
                            </span>
                            {app.material_ref && (
                              <span className="text-xs text-slate-500 pl-6">Réf: {app.material_ref}</span>
                            )}
                            {app.warranty_types?.name && (
                              <div className="flex items-center gap-1 mt-1 pl-6">
                                <Shield className="w-3 h-3 text-green-500" />
                                <span className="text-[10px] font-bold text-green-700 uppercase">{app.warranty_types.name}</span>
                              </div>
                            )}
                            {app.material_issue && (
                              <p className="text-xs text-slate-600 mt-2 pl-6 border-l-2 border-slate-200 py-1 italic line-clamp-2" title={app.material_issue}>
                                "{app.material_issue}"
                              </p>
                            )}
                          </div>
                        </td>

                        {/* STATUT */}
                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-col items-start gap-2">
                            <select
                              value={app.status}
                              disabled={app.payment_status === 'refunded'}
                              onChange={async (e) => {
                                const newStatus = e.target.value;
                                
                                if (newStatus === 'cancelled') {
                                  setCancelDialog({ isOpen: true, appId: app.id });
                                  return;
                                }
                                
                                // Changement de statut standard (non-annulé)
                                const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', app.id);
                                if (!error) {
                                  setAppointments(appointments.map(a => a.id === app.id ? { ...a, status: newStatus } : a));
                                } else {
                                  alert("Erreur lors de la mise à jour du statut.");
                                }
                              }}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider outline-none cursor-pointer border-none appearance-none pr-6 bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%2020%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%206l5%205%205-5%22%20stroke%3D%22%2394a3b8%22%20fill%3D%22none%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_4px_center] bg-[length:12px] disabled:opacity-50 disabled:cursor-not-allowed
                                ${app.status === 'pending_payment' ? 'bg-amber-100 text-amber-700' : ''}
                                ${app.status === 'pending' ? 'bg-blue-100 text-blue-700' : ''}
                                ${app.status === 'confirmed' ? 'bg-green-100 text-green-700' : ''}
                                ${app.status === 'completed' ? 'bg-slate-200 text-slate-700' : ''}
                                ${app.status === 'cancelled' && app.payment_status !== 'refunded' ? 'bg-red-100 text-red-700' : ''}
                                ${app.payment_status === 'refunded' ? 'bg-purple-100 text-purple-700' : ''}
                              `}
                            >
                              <option value="pending_payment">Attente Paiement</option>
                              <option value="pending">À Confirmer</option>
                              <option value="confirmed">Confirmé</option>
                              <option value="completed">Terminé</option>
                              <option value="cancelled">{app.payment_status === 'refunded' ? 'Annulé & Remboursé' : 'Annulé'}</option>
                            </select>
                            <span className="font-black text-slate-900">{app.services?.price}€</span>
                            <span className="text-[10px] text-slate-400">{app.services?.name}</span>
                          </div>
                        </td>

                        {/* DOCUMENTS */}
                        <td className="px-6 py-4 align-top text-right">
                          <div className="flex flex-col items-end gap-1">
                            {app.attachment_urls && app.attachment_urls.length > 0 ? (
                              app.attachment_urls.map((url: string, index: number) => (
                                <a 
                                  key={index}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-blue-50 px-2 py-1 rounded-lg hover:bg-primary hover:text-white transition-colors border border-blue-100"
                                >
                                  <FileText className="w-3 h-3" /> Pièce {index + 1}
                                </a>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 italic">Aucun fichier</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modale d'Annulation */}
      {cancelDialog?.isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in"
          onKeyDown={(e) => { if (e.key === 'Escape') handleCancelAction('abort'); }}
          tabIndex={-1}
          autoFocus // Permet de capturer les événements clavier immédiatement
        >
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-6">
            <div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Confirmer l'annulation</h3>
              <p className="text-sm text-slate-500">
                Vous êtes sur le point d'annuler ce rendez-vous. Souhaitez-vous également rembourser instantanément l'acompte sur la carte de crédit du client ?
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => handleCancelAction('refund')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                Oui, Annuler ET Rembourser
              </button>
              
              <button 
                onClick={() => handleCancelAction('no_refund')}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 px-4 rounded-xl transition-all border border-red-100"
              >
                Annuler SANS rembourser
              </button>
              
              <button 
                onClick={() => handleCancelAction('abort')}
                className="w-full bg-white hover:bg-slate-50 text-slate-600 font-bold py-3 px-4 rounded-xl transition-all border border-slate-200 mt-2"
              >
                Retour (Touche Échap)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
