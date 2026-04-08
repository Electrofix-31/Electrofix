'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Settings, ShieldCheck, Users, Save, Loader2, Info, Plus, Trash2, Laptop, Monitor as MonitorIcon, Smartphone, Wrench, CreditCard, Map as MapIcon } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Valeurs des réglages RH
  const [minStaff, setMinStaff] = useState(3);
  const [fixedStaff, setFixedStaff] = useState(2);
  const [maxRadius, setMaxRadius] = useState(20);

  // Valeurs du catalogue
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [types, setTypes] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [services, setServices] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    // Charger les réglages RH
    const { data: settings } = await supabase.from('admin_settings').select('*');
    if (settings) {
      const ms = settings.find(s => s.key === 'min_staff_store');
      const fs = settings.find(s => s.key === 'fixed_staff_store');
      const mr = settings.find(s => s.key === 'max_intervention_radius');
      if (ms) setMinStaff(ms.value.value);
      if (fs) setFixedStaff(fs.value.value);
      if (mr) setMaxRadius(mr.value.value);
    }

    // Charger les catégories et services
    const { data: cats } = await supabase.from('equipment_categories').select('*').order('name');
    const { data: servs } = await supabase.from('services').select('*').order('name');
    setCategories(cats || []);
    setServices(servs || []);
    
    if (cats && cats.length > 0) setSelectedCatId(cats[0].id);
    
    setLoading(false);
  };

  // Charger les types quand la catégorie change
  useEffect(() => {
    if (selectedCatId) {
      fetchTypes(selectedCatId);
    }
  }, [selectedCatId]);

  const fetchTypes = async (catId: string) => {
    const { data } = await supabase.from('equipment_types').select('*').eq('category_id', catId).order('name');
    setTypes(data || []);
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    const { data, error } = await supabase.from('equipment_categories').insert({ name: newCatName.trim() }).select().single();
    if (!error && data) {
      setCategories([...categories, data]);
      setNewCatName('');
      setSelectedCatId(data.id);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Supprimer cette famille ? Cela supprimera tous les types d'appareils rattachés.")) return;
    await supabase.from('equipment_categories').delete().eq('id', id);
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    if (selectedCatId === id) setSelectedCatId(updated[0]?.id || null);
  };

  const addType = async () => {
    if (!newTypeName.trim() || !selectedCatId) return;
    const { data, error } = await supabase.from('equipment_types').insert({ 
      category_id: selectedCatId, 
      name: newTypeName.trim() 
    }).select().single();
    
    if (!error && data) {
      setTypes([...types, data]);
      setNewTypeName('');
    }
  };

  const deleteType = async (id: string) => {
    await supabase.from('equipment_types').delete().eq('id', id);
    setTypes(types.filter(t => t.id !== id));
  };

  const updateCategoryService = async (catId: string, field: string, serviceId: string) => {
    await supabase.from('equipment_categories').update({ [field]: serviceId }).eq('id', catId);
    setCategories(categories.map(c => c.id === catId ? { ...c, [field]: serviceId } : c));
  };

  const updateServicePrice = async (serviceId: string, newPrice: number) => {
    const { error } = await supabase.from('services').update({ price: newPrice }).eq('id', serviceId);
    if (!error) {
      setServices(services.map(s => s.id === serviceId ? { ...s, price: newPrice } : s));
      setMessage({ type: 'success', text: 'Tarif mis à jour !' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const updates = [
        { key: 'min_staff_store', value: { value: minStaff } },
        { key: 'fixed_staff_store', value: { value: fixedStaff } },
        { key: 'max_intervention_radius', value: { value: maxRadius } }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('admin_settings')
          .upsert(update, { onConflict: 'key' });
        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Paramètres RH mis à jour !' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center animate-pulse font-bold text-slate-400">Chargement...</div>;

  return (
    <div className="max-w-6xl space-y-12 pb-20">
      <header>
        <h1 className="text-4xl font-black text-slate-900 flex items-center gap-3">
          <Settings className="w-10 h-10 text-primary" />
          Configuration Gérance
        </h1>
        <p className="text-slate-500 mt-2">Pilotez votre équipe, vos tarifs et votre catalogue de réparations.</p>
      </header>

      {/* SECTION RH */}
      <section className="space-y-6">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Sécurité & Planning
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Règle RH */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Effectif Minimum</h3>
              <p className="text-slate-500 text-sm mt-1">Seuil de sécurité pour autoriser le terrain.</p>
            </div>
            <input 
              type="number" value={minStaff} onChange={e => setMinStaff(parseInt(e.target.value))}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xl outline-none focus:border-primary"
            />
          </div>

          {/* Personnel Fixe */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Accueil & Magasin</h3>
              <p className="text-slate-500 text-sm mt-1">Nombre de personnes fixes (hors techs).</p>
            </div>
            <input 
              type="number" value={fixedStaff} onChange={e => setFixedStaff(parseInt(e.target.value))}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xl outline-none focus:border-orange-500"
            />
          </div>

          {/* Rayon d'intervention */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 space-y-6 md:col-span-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
                <MapIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Zone d&apos;Intervention</h3>
                <p className="text-slate-500 text-sm">Rayon maximum autorisé autour du premier rendez-vous de la journée.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <input 
                type="range" min="5" max="100" step="5"
                value={maxRadius} onChange={e => setMaxRadius(parseInt(e.target.value))}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="bg-purple-50 text-purple-700 px-6 py-3 rounded-2xl font-black text-2xl border border-purple-100 min-w-[120px] text-center">
                {maxRadius} km
              </div>
            </div>
            <p className="text-xs text-slate-400 italic">
              Actuellement réglé sur {maxRadius} km. Si un client est plus loin que cette distance par rapport au point d&apos;ancrage du jour, le domicile lui sera refusé.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={saveSettings} disabled={saving} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-xl shadow-slate-900/10">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Enregistrer les règles RH
          </button>
        </div>
      </section>

      {/* SECTION CATALOGUE */}
      <section className="space-y-6 pt-12 border-t border-slate-100">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
          <MonitorIcon className="w-5 h-5 text-primary" /> Catalogue des Réparations
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Liste des Familles */}
          <div className="lg:col-span-4 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-4">Familles d&apos;appareils</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
              {categories.map(cat => (
                <div 
                  key={cat.id} 
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${
                    selectedCatId === cat.id ? 'bg-primary text-white shadow-lg' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold">{cat.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }} className={`p-2 rounded-lg transition-colors ${selectedCatId === cat.id ? 'hover:bg-white/20 text-white/50 hover:text-white' : 'text-slate-300 hover:text-red-500'}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="pt-4 flex gap-2">
              <input 
                placeholder="Nouvelle famille..." value={newCatName} onChange={e => setNewCatName(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-primary"
              />
              <button onClick={addCategory} className="bg-primary text-white p-2 rounded-xl hover:bg-blue-800 transition-colors">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Détails de la Famille sélectionnée */}
          <div className="lg:col-span-8 space-y-8">
            {selectedCatId ? (
              <>
                {/* Types d'appareils */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900">
                      Types dans &quot;{categories.find(c => c.id === selectedCatId)?.name}&quot;
                    </h3>
                    <span className="text-xs font-black bg-blue-50 text-primary px-3 py-1 rounded-full uppercase">{types.length} modèles</span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {types.map(type => (
                      <div key={type.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                        <span className="text-sm font-semibold text-slate-700">{type.name}</span>
                        <button onClick={() => deleteType(type.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input 
                        placeholder="Ex: PC Portable" value={newTypeName} onChange={e => setNewTypeName(e.target.value)}
                        className="flex-1 bg-white border-2 border-dashed border-slate-200 rounded-xl px-4 text-xs outline-none focus:border-primary focus:border-solid"
                      />
                      <button onClick={addType} className="bg-slate-900 text-white p-2 rounded-xl hover:bg-black">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Liaison Tarifs (Services) */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 space-y-6">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-primary" /> Forfaits rattachés
                  </h3>
                  <p className="text-sm text-slate-500">Choisissez quel tarif &quot;Anti-Lapin&quot; appliquer à cette famille.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Forfait Atelier</label>
                      <select 
                        value={categories.find(c => c.id === selectedCatId)?.service_id_atelier || ''}
                        onChange={(e) => updateCategoryService(selectedCatId, 'service_id_atelier', e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-primary"
                      >
                        <option value="">Sélectionner un service...</option>
                        {services.filter(s => s.name.toLowerCase().includes('atelier') || s.name.toLowerCase().includes('diagnostic')).map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.price}€)</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Forfait Domicile</label>
                      <select 
                        value={categories.find(c => c.id === selectedCatId)?.service_id_domicile || ''}
                        onChange={(e) => updateCategoryService(selectedCatId, 'service_id_domicile', e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-primary"
                      >
                        <option value="">Sélectionner un service...</option>
                        {services.filter(s => s.name.toLowerCase().includes('domicile') || s.name.toLowerCase().includes('déplacement')).map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.price}€)</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center p-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold italic">
                Sélectionnez une famille à gauche pour la gérer.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION TARIFS */}
      <section className="space-y-6 pt-12 border-t border-slate-100">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" /> Grille Tarifaire (Forfaits)
        </h2>
        <p className="text-sm text-slate-500">Modifiez ici les montants des forfaits appliqués lors de la réservation en ligne.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(service => (
            <div key={service.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
              <div className="flex justify-between items-start">
                <div className="font-bold text-slate-900 leading-tight">{service.name}</div>
                <div className="bg-blue-50 text-primary p-2 rounded-xl">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <div className="relative flex-1">
                  <input 
                    type="number" 
                    defaultValue={service.price}
                    onBlur={(e) => {
                      const newP = parseFloat(e.target.value);
                      if (newP !== service.price) updateServicePrice(service.id, newP);
                    }}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all text-right pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">€</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">Le prix est mis à jour dès que vous quittez le champ.</p>
            </div>
          ))}
        </div>
      </section>

      {message && (
        <div className="fixed bottom-8 right-8 animate-in slide-in-from-bottom-4">
          <div className={`px-8 py-4 rounded-2xl font-bold shadow-2xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {message.type === 'success' ? <ShieldCheck className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            {message.text}
          </div>
        </div>
      )}
    </div>
  );
}
