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
  const supabase = createClient();

  useEffect(() => {
    if (view === 'list') {
      fetchAppointments();
    }
  }, [date, view]);

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

  const getStatusBadge = (status: string) => {
    const statusMap: any = {
      pending_payment: { color: 'bg-amber-100 text-amber-700', label: 'Attente Paiement' },
      pending: { color: 'bg-blue-100 text-blue-700', label: 'À Confirmer' },
      confirmed: { color: 'bg-green-100 text-green-700', label: 'Confirmé' },
      completed: { color: 'bg-slate-200 text-slate-700', label: 'Terminé' },
      cancelled: { color: 'bg-red-100 text-red-700', label: 'Annulé' },
    };
    const s = statusMap[status] || { color: 'bg-slate-100 text-slate-700', label: status };
    return <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${s.color}`}>{s.label}</span>;
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
                Répartition Géographique (Rayon 30km)
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
                  <p className="text-xl font-black text-slate-900">30 km</p>
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
                            {getStatusBadge(app.status)}
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
    </div>
  );
}
