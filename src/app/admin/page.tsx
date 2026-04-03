'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  TrendingUp, Wallet, CalendarCheck, Package, AlertCircle, 
  ArrowUpRight, Plus, History, Trophy, TrendingDown 
} from 'lucide-react';
import CashFlowModal from '@/components/admin/CashFlowModal';

export default function AdminDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    pendingRDV: 0,
    bestMonth: { name: '--', amount: 0 },
    bestWeek: { name: '--', amount: 0 }
  });
  const [recentFlow, setRecentFlow] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchStats = async () => {
    setLoading(true);
    
    // 1. Chiffre d'Affaires Total (Paiements Stripe + CashFlow Income)
    const { data: stripePayments } = await supabase.from('appointments').select('services(price)').eq('payment_status', 'paid');
    const { data: cashIncomes } = await supabase.from('cash_flow').select('amount').eq('type', 'income');
    const { data: cashExpenses } = await supabase.from('cash_flow').select('amount').eq('type', 'expense');

    const revStripe = stripePayments?.reduce((acc, curr: any) => acc + (curr.services?.price || 0), 0) || 0;
    const revCash = cashIncomes?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
    const totalExpenses = cashExpenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

    // 2. Dernières opérations
    const { data: recent } = await supabase
      .from('cash_flow')
      .select('*')
      .order('date', { ascending: false })
      .limit(5);

    // 3. RDV en attente
    const { count } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'pending');

    setStats({
      totalRevenue: revStripe + revCash,
      totalExpenses: totalExpenses,
      pendingRDV: count || 0,
      bestMonth: { name: 'Mars 2026', amount: 12450 }, // TODO: Calculer dynamiquement
      bestWeek: { name: 'Semaine 12', amount: 3200 }   // TODO: Calculer dynamiquement
    });
    setRecentFlow(recent || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Pilotage Financier</h1>
          <p className="text-slate-500">Suivi des recettes, dépenses et performances du magasin.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20"
        >
          <Plus className="w-5 h-5" /> Saisir une opération
        </button>
      </div>

      {/* Cartes de statistiques (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="p-3 bg-green-100 rounded-xl text-green-600 w-fit mb-4">
            <Wallet className="w-6 h-6" />
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Trésorerie Net</p>
          <h3 className="text-3xl font-black text-slate-900">{(stats.totalRevenue - stats.totalExpenses).toLocaleString()} €</h3>
          <p className="text-xs text-slate-400 mt-2">Recettes - Dépenses cumulées</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="p-3 bg-blue-100 rounded-xl text-blue-600 w-fit mb-4">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">RDV en Attente</p>
          <h3 className="text-3xl font-black text-slate-900">{stats.pendingRDV}</h3>
          <p className="text-xs text-slate-400 mt-2">Rendez-vous à confirmer</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="p-3 bg-orange-100 rounded-xl text-orange-600 w-fit mb-4">
            <Trophy className="w-6 h-6" />
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Record Mensuel</p>
          <h3 className="text-2xl font-black text-slate-900">{stats.bestMonth.amount.toLocaleString()} €</h3>
          <p className="text-xs text-orange-600 font-semibold mt-2">{stats.bestMonth.name}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="p-3 bg-purple-100 rounded-xl text-purple-600 w-fit mb-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Record Hebdo</p>
          <h3 className="text-2xl font-black text-slate-900">{stats.bestWeek.amount.toLocaleString()} €</h3>
          <p className="text-xs text-purple-600 font-semibold mt-2">{stats.bestWeek.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Historique des opérations */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-slate-400" /> Historique récent
            </h2>
            <button className="text-primary font-bold text-sm hover:underline">Voir le grand livre</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-xs uppercase tracking-widest border-b border-slate-50">
                  <th className="px-6 py-4 font-bold">Date</th>
                  <th className="px-6 py-4 font-bold">Description</th>
                  <th className="px-6 py-4 font-bold">Mode</th>
                  <th className="px-6 py-4 font-bold text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentFlow.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{item.description}</td>
                    <td className="px-6 py-4 text-xs font-bold">
                      <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-600 uppercase">{item.payment_method}</span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${item.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {item.type === 'income' ? '+' : '-'} {item.amount.toLocaleString()} €
                    </td>
                  </tr>
                ))}
                {recentFlow.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">Aucune opération saisie.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rapports IA & Alertes */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xl font-bold mb-4">Conseil d&apos;achat (IA)</h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Votre trésorerie actuelle permet de renouveler le stock de pièces détachées. Nous prévoyons une hausse des demandes informatique la semaine prochaine.
              </p>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-6">
                 <div className="flex items-center gap-2 text-green-400 font-bold text-sm mb-1">
                   <TrendingUp className="w-4 h-4" /> Santé financière : Excellente
                 </div>
                 <p className="text-xs text-slate-500">Ratio revenus/dépenses : 2.4</p>
              </div>
              <button className="w-full bg-accent hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-all">
                Analyser avec Gemini
              </button>
            </div>
            <TrendingUp className="absolute right-[-10%] bottom-[-10%] w-32 h-32 text-white/5" />
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
             <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
               <AlertCircle className="w-5 h-5 text-orange-500" /> Vigilance Stock
             </h3>
             <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                   <span className="text-sm font-semibold">Écrans iPhone 13</span>
                   <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md text-xs font-bold">2 restants</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                   <span className="text-sm font-semibold">Batteries MacBook</span>
                   <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-bold">0 restant</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <CashFlowModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={fetchStats} 
      />
    </div>
  );
}
