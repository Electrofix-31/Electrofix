'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Users, UserPlus, MapPin, Store, Trash2, 
  CheckCircle2, XCircle, Loader2, Mail, ShieldAlert,
  Calendar, Briefcase, FileSignature, Clock
} from 'lucide-react';

export default function TechniciansPage() {
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newTechEmail, setNewTechEmail] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Nouveaux états pour le module RH
  const [selectedTech, setSelectedTech] = useState<any>(null);
  const [absences, setAbsences] = useState<any[]>([]);
  const [newAbsence, setNewAbsence] = useState({ start_date: '', end_date: '', type: 'vacation' });
  const [contractType, setContractType] = useState('permanent');
  const [contractEndDate, setContractEndDate] = useState('');
  const [isUpdatingContract, setIsUpdatingContract] = useState(false);

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
          role,
          contract_type,
          contract_end_date
        )
      `);

    if (error) {
      console.error('Fetch error:', error);
    } else {
      setTechs(data || []);
    }
    setLoading(false);
  };

  const openTechModal = async (tech: any) => {
    setSelectedTech(tech);
    setContractType(tech.profiles?.contract_type || 'permanent');
    setContractEndDate(tech.profiles?.contract_end_date || '');
    
    // Fetch absences
    const { data } = await supabase
      .from('technician_absences')
      .select('*')
      .eq('technician_id', tech.profile_id)
      .order('start_date', { ascending: true });
    
    setAbsences(data || []);
  };

  const closeTechModal = () => {
    setSelectedTech(null);
    setAbsences([]);
    setNewAbsence({ start_date: '', end_date: '', type: 'vacation' });
  };

  const saveContract = async () => {
    if (!selectedTech) return;
    setIsUpdatingContract(true);
    
    const payload: any = { contract_type: contractType };
    if (contractType !== 'permanent') {
      payload.contract_end_date = contractEndDate || null;
    } else {
      payload.contract_end_date = null;
    }

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', selectedTech.profile_id);

    if (error) {
      alert("Erreur lors de la mise à jour du contrat.");
    } else {
      await fetchTechs();
      // Mettre à jour l'objet sélectionné pour la modale
      setSelectedTech({
        ...selectedTech, 
        profiles: { ...selectedTech.profiles, ...payload }
      });
      alert("Contrat mis à jour avec succès.");
    }
    setIsUpdatingContract(false);
  };

  const addAbsence = async () => {
    if (!selectedTech || !newAbsence.start_date || !newAbsence.end_date) return;
    
    const { data, error } = await supabase
      .from('technician_absences')
      .insert({
        technician_id: selectedTech.profile_id,
        start_date: newAbsence.start_date,
        end_date: newAbsence.end_date,
        type: newAbsence.type
      })
      .select()
      .single();

    if (error) {
      alert("Erreur lors de l'ajout de l'absence. Vérifiez les dates.");
    } else if (data) {
      setAbsences([...absences, data].sort((a, b) => a.start_date.localeCompare(b.start_date)));
      setNewAbsence({ start_date: '', end_date: '', type: 'vacation' });
    }
  };

  const removeAbsence = async (id: string) => {
    if (!confirm("Supprimer cette absence ?")) return;
    const { error } = await supabase.from('technician_absences').delete().eq('id', id);
    if (!error) {
      setAbsences(absences.filter(a => a.id !== id));
    }
  };

  const toggleAvailability = async (profileId: string, field: 'is_available_store' | 'is_available_field', currentVal: boolean) => {
    setActionLoading(`${profileId}-${field}`);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log(`[DEBUG] Tentative update par l'utilisateur:`, user?.email);
      console.log(`[DEBUG] Update de profile_id: ${profileId}, champ: ${field}, future valeur: ${!currentVal}`);

      const { data, error } = await supabase
        .from('technicians')
        .update({ [field]: !currentVal })
        .eq('profile_id', profileId)
        .select();
      
      if (error) {
        console.error("[DEBUG] Erreur Supabase:", error);
        throw error;
      }
      
      console.log(`[DEBUG] Résultat de l'update:`, data);
      await fetchTechs();
    } catch (err: any) {
      console.error("[DEBUG] Erreur catch:", err);
      alert("Erreur de mise à jour : " + (err.message || JSON.stringify(err)));
    } finally {
      setActionLoading(null);
    }
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

  const removeTech = async (profileId: string) => {
    if (!confirm("Voulez-vous vraiment retirer cette personne de l'équipe ? Elle redeviendra un simple client.")) return;
    
    setActionLoading(profileId);
    try {
      // 1. Supprimer la fiche technique
      const { error: deleteError } = await supabase.from('technicians').delete().eq('profile_id', profileId);
      if (deleteError) throw deleteError;
      
      // 2. Repasser en rôle client si ce n'est pas un admin (utilise maybeSingle au lieu de single pour ne pas crasher si le profil est introuvable)
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', profileId).maybeSingle();
      if (profile && profile.role === 'technician') {
        const { error: updateError } = await supabase.from('profiles').update({ role: 'client' }).eq('id', profileId);
        if (updateError) throw updateError;
      }

      await fetchTechs();
    } catch (err: any) {
      alert("Erreur lors de la suppression : " + err.message);
    } finally {
      setActionLoading(null);
    }
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
            <div key={tech.profile_id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all relative group">
              <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={() => openTechModal(tech)}
                  className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  title="Gérer les absences et le contrat"
                >
                  <Calendar className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => removeTech(tech.profile_id)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Retirer de l'équipe"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-accent font-black relative">
                  {tech.profiles?.email?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 truncate max-w-[150px]">
                      {tech.profiles?.email ? tech.profiles.email.split('@')[0] : 'Profil Inconnu'}
                    </h3>
                    {tech.profiles?.contract_type && tech.profiles.contract_type !== 'permanent' && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] uppercase font-black rounded-full tracking-widest">
                        {tech.profiles.contract_type === 'interim' ? 'Intérim' : 'Stagiaire'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Mail className="w-3 h-3" /> {tech.profiles?.email || 'Email supprimé'}
                    {tech.profiles?.role === 'admin' && <span className="ml-1 text-purple-600 font-black underline">ADMIN</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => toggleAvailability(tech.profile_id, 'is_available_store', tech.is_available_store)}
                  disabled={actionLoading === `${tech.profile_id}-is_available_store`}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    tech.is_available_store ? 'border-blue-100 bg-blue-50 text-blue-700 font-bold' : 'border-slate-50 bg-slate-50 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm"><Store className="w-4 h-4" /> Magasin</div>
                  {tech.is_available_store ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </button>

                <button 
                  onClick={() => toggleAvailability(tech.profile_id, 'is_available_field', tech.is_available_field)}
                  disabled={actionLoading === `${tech.profile_id}-is_available_field`}
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

      {/* RH / Calendar Modal */}
      {selectedTech && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in"
          onKeyDown={(e) => { if (e.key === 'Escape') closeTechModal(); }}
          tabIndex={-1}
          autoFocus
        >
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Briefcase className="w-6 h-6 text-primary" />
                Dossier Collaborateur
              </h2>
              <button onClick={closeTechModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Section 1: Contrat */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-slate-400" />
                  Type de contrat
                </h3>
                <div className="space-y-3">
                  <select 
                    value={contractType} 
                    onChange={(e) => setContractType(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="permanent">Permanent (CDI / Gérant)</option>
                    <option value="interim">Intérimaire</option>
                    <option value="intern">Stagiaire</option>
                  </select>
                  
                  {contractType !== 'permanent' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Date de fin de contrat</label>
                      <input 
                        type="date" 
                        value={contractEndDate} 
                        onChange={(e) => setContractEndDate(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 text-slate-700 font-medium outline-none"
                      />
                    </div>
                  )}

                  <button 
                    onClick={saveContract}
                    disabled={isUpdatingContract}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isUpdatingContract ? 'Mise à jour...' : 'Sauvegarder le contrat'}
                  </button>
                </div>
              </div>

              {/* Section 2: Absences */}
              <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Calendrier des absences
                </h3>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Nouvelle période</p>
                  <select 
                    value={newAbsence.type}
                    onChange={(e) => setNewAbsence({...newAbsence, type: e.target.value})}
                    className="w-full p-2 rounded-lg border border-slate-200 text-sm font-medium outline-none"
                  >
                    <option value="vacation">Congés payés</option>
                    <option value="sick">Arrêt maladie</option>
                    <option value="formation">Formation</option>
                  </select>
                  <div className="flex gap-2">
                    <input type="date" value={newAbsence.start_date} onChange={(e) => setNewAbsence({...newAbsence, start_date: e.target.value})} className="w-1/2 p-2 text-sm rounded-lg border border-slate-200 outline-none" title="Début" />
                    <input type="date" value={newAbsence.end_date} onChange={(e) => setNewAbsence({...newAbsence, end_date: e.target.value})} className="w-1/2 p-2 text-sm rounded-lg border border-slate-200 outline-none" title="Fin" />
                  </div>
                  <button 
                    onClick={addAbsence}
                    disabled={!newAbsence.start_date || !newAbsence.end_date}
                    className="w-full bg-primary/10 hover:bg-primary/20 text-primary font-bold py-2 rounded-lg transition-all text-sm disabled:opacity-50"
                  >
                    + Ajouter l'absence
                  </button>
                </div>

                <div className="space-y-2 mt-4 max-h-[150px] overflow-y-auto pr-2">
                  {absences.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">Aucune absence prévue.</p>
                  ) : (
                    absences.map(absence => (
                      <div key={absence.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-xl shadow-sm text-sm">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${absence.type === 'sick' ? 'bg-red-400' : 'bg-green-400'}`}></div>
                          <div>
                            <p className="font-bold text-slate-700">
                              {new Date(absence.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} 
                              <span className="text-slate-400 font-normal mx-1">au</span> 
                              {new Date(absence.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{absence.type === 'vacation' ? 'Congés' : absence.type === 'sick' ? 'Maladie' : 'Formation'}</p>
                          </div>
                        </div>
                        <button onClick={() => removeAbsence(absence.id)} className="p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-md transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
