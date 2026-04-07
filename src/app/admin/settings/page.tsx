'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Settings, ShieldCheck, Users, Save, Loader2, Info } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Valeurs des réglages
  const [minStaff, setMinStaff] = useState(3);
  const [fixedStaff, setFixedStaff] = useState(2);

  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from('admin_settings').select('*');
    
    if (data) {
      const ms = data.find(s => s.key === 'min_staff_store');
      const fs = data.find(s => s.key === 'fixed_staff_store');
      if (ms) setMinStaff(ms.value.value);
      if (fs) setFixedStaff(fs.value.value);
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const updates = [
        { key: 'min_staff_store', value: { value: minStaff } },
        { key: 'fixed_staff_store', value: { value: fixedStaff } }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('admin_settings')
          .upsert(update, { onConflict: 'key' });
        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Paramètres RH mis à jour avec succès !' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center animate-pulse font-bold text-slate-400">Chargement des réglages...</div>;

  return (
    <div className="max-w-4xl space-y-8">
      <header>
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          Paramètres Généraux
        </h1>
        <p className="text-slate-500 mt-1">Configurez les règles métier et la sécurité du magasin.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Règle RH */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-primary">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Sécurité Magasin</h2>
            <p className="text-slate-500 text-sm mt-1">Nombre minimum de personnes requis pour ouvrir la boutique.</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Effectif total minimum</label>
              <input 
                type="number"
                min="1"
                max="10"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                value={minStaff}
                onChange={e => setMinStaff(parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed">
              Le système bloquera automatiquement les interventions à domicile si le départ d&apos;un technicien fait descendre l&apos;effectif sous ce seuil.
            </p>
          </div>
        </div>

        {/* Personnel Fixe */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Personnel Fixe</h2>
            <p className="text-slate-500 text-sm mt-1">Nombre de personnes présentes hors techniciens.</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Gérante + Vendeuses</label>
              <input 
                type="number"
                min="0"
                max="10"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xl outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all"
                value={fixedStaff}
                onChange={e => setFixedStaff(parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3">
            <Info className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <p className="text-xs text-orange-800 leading-relaxed">
              Ces personnes sont comptabilisées d&apos;office dans l&apos;effectif magasin à chaque créneau horaire.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
        {message && (
          <div className={`px-6 py-3 rounded-xl font-bold text-sm animate-in fade-in slide-in-from-left-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
        <button 
          onClick={saveSettings}
          disabled={saving}
          className="ml-auto bg-slate-900 text-white px-10 py-4 rounded-xl font-bold flex items-center gap-3 hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Enregistrer les paramètres
        </button>
      </div>
    </div>
  );
}
