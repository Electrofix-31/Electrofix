'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Users, UserPlus, MapPin, Store, Trash2, 
  CheckCircle2, XCircle, Loader2, Mail, ShieldAlert 
} from 'lucide-react';

export default function TechniciansPage() {
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newTechEmail, setNewTechEmail] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchTechs();
  }, []);

  const fetchTechs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('technicians')
      .select(`
        *,
        profiles!technicians_profile_id_fkey (
          email,
          role
        )
      `);

    if (error) {
      console.error('Fetch error:', error);
    } else {
      setTechs(data || []);
    }
    setLoading(false);
  };

  const toggleAvailability = async (id: string, field: 'is_available_store' | 'is_available_field', currentVal: boolean) => {
    setActionLoading(`${id}-${field}`);
    await supabase.from('technicians').update({ [field]: !currentVal }).eq('id', id);
    await fetchTechs();
    setActionLoading(null);
  };

  const addTech = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('adding');
    
    try {
      const email = newTechEmail.trim().toLowerCase();
      
      // 1. Chercher le profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!profile) throw new Error("Cet email n'existe pas. L'utilisateur doit s'être connecté au moins une fois.");

      // 2. Mettre à jour son rôle en 'technician' (sauf s'il est admin)
      const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', profile.id).single();
      if (currentProfile?.role !== 'admin') {
        await supabase.from('profiles').update({ role: 'technician' }).eq('id', profile.id);
      }

      // 3. Créer la fiche technique
      const { error: insertError } = await supabase.from('technicians').insert({
        profile_id: profile.id,
        is_available_store: true,
        is_available_field: false
      });

      if (insertError) throw new Error("Cette personne est déjà dans l'équipe.");

      setNewTechEmail('');
      setShowAddForm(false);
      await fetchTechs();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const removeTech = async (techId: string, profileId: string) => {
    if (!confirm("Voulez-vous vraiment retirer cette personne de l'équipe ? Elle redeviendra un simple client.")) return;
    
    setActionLoading(techId);
    // 1. Supprimer la fiche technique
    await supabase.from('technicians').delete().eq('id', techId);
    
    // 2. Repasser en rôle client si ce n'est pas un admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', profileId).single();
    if (profile?.role === 'technician') {
      await supabase.from('profiles').update({ role: 'client' }).eq('id', profileId);
    }

    await fetchTechs();
    setActionLoading(null);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">L&apos;Équipe</h1>
          <p className="text-slate-500">Gérez qui apparaît dans le planning et ses capacités.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-800 transition-all shadow-lg"
        >
          <UserPlus className="w-5 h-5" /> Ajouter à l&apos;équipe
        </button>
      </header>

      {showAddForm && (
        <form onSubmit={addTech} className="bg-white p-6 rounded-3xl border-2 border-primary/10 shadow-xl flex gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex-1">
            <input 
              required type="email" placeholder="Email du membre à ajouter..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5"
              value={newTechEmail} onChange={e => setNewTechEmail(e.target.value)}
            />
          </div>
          <button disabled={actionLoading === 'adding'} className="bg-slate-900 text-white px-8 rounded-2xl font-bold hover:bg-black transition-all h-[58px]">
            {actionLoading === 'adding' ? <Loader2 className="w-5 h-5 animate-spin" /> : "Valider"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-bold flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" /> Chargement de l&apos;équipe...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {techs.map(tech => (
            <div key={tech.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all relative group">
              <button 
                onClick={() => removeTech(tech.id, tech.profile_id)}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-accent font-black">
                  {tech.profiles?.email?.[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 truncate max-w-[150px]">{tech.profiles?.email?.split('@')[0]}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Mail className="w-3 h-3" /> {tech.profiles?.email}
                    {tech.profiles?.role === 'admin' && <span className="ml-1 text-purple-600 font-black underline">ADMIN</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => toggleAvailability(tech.id, 'is_available_store', tech.is_available_store)}
                  disabled={actionLoading === `${tech.id}-is_available_store`}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    tech.is_available_store ? 'border-blue-100 bg-blue-50 text-blue-700 font-bold' : 'border-slate-50 bg-slate-50 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm"><Store className="w-4 h-4" /> Magasin</div>
                  {tech.is_available_store ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </button>

                <button 
                  onClick={() => toggleAvailability(tech.id, 'is_available_field', tech.is_available_field)}
                  disabled={actionLoading === `${tech.id}-is_available_field`}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    tech.is_available_field ? 'border-orange-100 bg-orange-50 text-orange-700 font-bold' : 'border-slate-50 bg-slate-50 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4" /> Terrain</div>
                  {tech.is_available_field ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
