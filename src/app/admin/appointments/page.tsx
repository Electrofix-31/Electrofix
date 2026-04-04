'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Calendar, Filter, Map, List, ChevronRight } from 'lucide-react';

// Import dynamique de la carte pour éviter les erreurs SSR (Leaflet)
const MapAdmin = dynamic(() => import('@/components/admin/MapAdmin'), { 
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-slate-100 animate-pulse rounded-3xl" />
});

export default function AdminAppointmentsPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [view, setView] = useState<'map' | 'list'>('map');

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
              onClick={() => setView('map')}
              className={`p-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${view === 'map' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Map className="w-4 h-4" /> Carte
            </button>
            <button 
              onClick={() => setView('list')}
              className={`p-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${view === 'list' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <List className="w-4 h-4" /> Liste
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
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-8 text-center text-slate-400 italic">
               La vue liste détaillée avec gestion des statuts est en cours de développement.
               Utilisez la vue Carte pour la supervision géo-optimisée.
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
