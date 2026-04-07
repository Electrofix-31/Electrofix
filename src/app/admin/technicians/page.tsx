'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Users, UserPlus, MapPin, Store, Trash2, 
  CheckCircle2, XCircle, Loader2, Mail, Phone 
} from 'lucide-react';

export default function TechniciansPage() {
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Formulaire d'ajout
  const [newTechEmail, setNewTechEmail] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchTechs();
  }, []);

  const fetchTechs = async () => {
    setLoading(true);
    // On récupère les techniciens avec les infos de leur profil
    const { data, error } = await supabase
      .from('technicians')
      .select(`
        *,
        profiles:profile_id (
          email,
          full_name,
          phone
        )
      `);

    if (!error) setTechs(data || []);
    setLoading(false);
  };

  const toggleAvailability = async (id: string, field: 'is_available_store' | 'is_available_field', currentVal: boolean) => {
    setActionLoading(`${id}-${field}`);
    const { error } = await supabase
      .from('technicians')
      .update({ [field]: !currentVal })
      .eq('id', id);

    if (!error) await fetchTechs();
    setActionLoading(null);
  };

  const promoteToTech = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('adding');
    
    try {
      // 1. Chercher l'utilisateur par son email dans les profils
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newTechEmail.trim().toLowerCase())
        .single();

      if (profileError || !profile) throw new Error("Cet email n'existe pas encore parmi vos utilisateurs. Le technicien doit d'abord se connecter une fois au site.");

      // 2. Créer l'entrée technicien
      const { error: techError } = await supabase
        .from('technicians')
        .insert({
          profile_id: profile.id,
          is_available_store: true,
          is_available_field: true
        });

      if (techError) throw new Error("Ce profil est déjà un technicien.");

      setNewTechEmail('');
      setShowAddForm(false);
      await fetchTechs();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Gestion de l&apos;Équipe
          </h1>
          <p className="text-slate-500 mt-1">Configurez les techniciens et leurs zones d&apos;intervention.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20"
        >
          <UserPlus className="w-5 h-5" />
          Nouveau Technicien
        </button>
      </header>

      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl border-2 border-primary/10 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <form onSubmit={promoteToTech} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Adresse Email de l&apos;utilisateur</label>
              <input 
                required
                type="email"
                placeholder="ex: tech@electrofix.fr"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none"
                value={newTechEmail}
                onChange={e => setNewTechEmail(e.target.value)}
              />
            </div>
            <button 
              disabled={actionLoading === 'adding'}
              className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-black transition-all disabled:opacity-50 h-[58px]"
            >
              {actionLoading === 'adding' ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ajouter à l'équipe"}
            </button>
          </form>
          <p className="text-[10px] text-slate-400 mt-3 italic">* L&apos;utilisateur doit déjà avoir créé son compte via le lien magique pour être promu.</p>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-bold flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" />
          Chargement de l&apos;équipe...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {techs.map(tech => (
            <div key={tech.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-accent font-black text-xl shadow-lg">
                    {tech.profiles?.email?.[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{tech.profiles?.full_name || 'Technicien'}</h3>
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Mail className="w-3 h-3" /> {tech.profiles?.email}
                    </div>
                  </div>
                </div>
                <div className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100">
                  Actif
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => toggleAvailability(tech.id, 'is_available_store', tech.is_available_store)}
                  disabled={actionLoading === `${tech.id}-is_available_store`}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                    tech.is_available_store 
                      ? 'border-blue-100 bg-blue-50/50 text-blue-700' 
                      : 'border-slate-50 bg-slate-50 text-slate-400 grayscale'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Store className="w-5 h-5" />
                    <span className="font-bold text-sm">Magasin</span>
                  </div>
                  {actionLoading === `${tech.id}-is_available_store` ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    tech.is_available_store ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />
                  )}
                </button>

                <button 
                  onClick={() => toggleAvailability(tech.id, 'is_available_field', tech.is_available_field)}
                  disabled={actionLoading === `${tech.id}-is_available_field`}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                    tech.is_available_field 
                      ? 'border-orange-100 bg-orange-50/50 text-orange-700' 
                      : 'border-slate-50 bg-slate-50 text-slate-400 grayscale'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5" />
                    <span className="font-bold text-sm">Itinérant</span>
                  </div>
                  {actionLoading === `${tech.id}-is_available_field` ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    tech.is_available_field ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
