'use client';

import { useEffect, useState } from 'react';
import { Calendar, MapPin, Phone, Wrench, Navigation, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function TechnicianDashboard() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const supabase = createClient();
  const router = useRouter();

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/technician/schedule?date=${date}`);
      const data = await res.json();
      if (res.ok) setAppointments(data);
    } catch (err) {
      console.error('Error loading schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [date]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
      {/* Header Mobile */}
      <header className="bg-slate-900 text-white p-6 sticky top-0 z-50 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-slate-900 font-bold">
              TF
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Espace Tech</h1>
              <p className="text-xs text-slate-400">Planning du jour</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 bg-white/10 rounded-lg">
            <LogOut className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          <div className="relative flex-1 min-w-[200px]">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm font-bold outline-none"
            />
          </div>
          <button onClick={fetchSchedule} className="p-2 bg-accent text-slate-900 rounded-lg font-bold">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4 flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm font-medium">Chargement de votre journée...</p>
          </div>
        ) : appointments.length > 0 ? (
          appointments.map((app) => (
            <div key={app.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-black">
                    {app.time.slice(0, 5)}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                    app.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {app.status === 'confirmed' ? 'Confirmé' : 'À valider'}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  {app.profiles.first_name} {app.profiles.last_name}
                </h3>
                
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                  <Wrench className="w-4 h-4" />
                  <span className="font-semibold text-primary">{app.services?.name}</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl space-y-3 mb-6">
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <span className="text-slate-700 leading-snug">{app.client_address}</span>
                  </div>
                  <a href={`tel:${app.client_phone}`} className="flex items-center gap-3 text-sm text-blue-600 font-bold">
                    <Phone className="w-4 h-4 shrink-0" />
                    {app.client_phone}
                  </a>
                </div>

                {app.latitude && app.longitude && (
                  <a 
                    href={`https://maps.google.com/?q=${app.latitude},${app.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-slate-900/20"
                  >
                    <Navigation className="w-5 h-5 text-accent" />
                    Lancer le GPS (Y aller)
                  </a>
                )}
              </div>
              
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Description de la panne</p>
                <p className="text-sm text-slate-600">{app.material_issue || 'Aucun détail fourni.'}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 px-8">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Aucun rendez-vous</h3>
            <p className="text-slate-500 text-sm mt-2">Vous n&apos;avez aucune intervention prévue pour cette date.</p>
          </div>
        )}
      </main>

      {/* Footer Mobile Stats */}
      {appointments.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 px-6 flex justify-between items-center z-50">
           <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total</span>
              <span className="text-lg font-black text-slate-900">{appointments.length} Intervention{appointments.length > 1 ? 's' : ''}</span>
           </div>
           <div className="bg-green-500 h-2 w-24 rounded-full overflow-hidden">
              <div className="bg-green-600 h-full w-1/3"></div>
           </div>
        </div>
      )}
    </div>
  );
}
