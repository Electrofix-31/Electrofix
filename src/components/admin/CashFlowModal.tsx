'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PlusCircle, Loader2, X } from 'lucide-react';

export default function CashFlowModal({ isOpen, onClose, onRefresh }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [method, setMethod] = useState<'cash' | 'check' | 'card' | 'transfer'>('card');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('cash_flow')
      .insert({
        type,
        amount: parseFloat(amount),
        payment_method: method,
        description,
        category: type === 'income' ? 'store_sale' : 'part_purchase', // À affiner par la suite
      });

    if (error) {
      alert("Erreur lors de la saisie : " + error.message);
    } else {
      setAmount('');
      setDescription('');
      onRefresh();
      onClose();
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
          <h3 className="text-xl font-bold">Nouvelle Opération</h3>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${type === 'income' ? 'bg-green-500 text-white shadow-sm' : 'text-slate-500'}`}
            >
              Recette (+)
            </button>
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${type === 'expense' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500'}`}
            >
              Dépense (-)
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Montant (€)</label>
              <input
                required
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full p-4 rounded-xl border border-slate-200 text-2xl font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Mode de Règlement</label>
              <select
                className="w-full p-4 rounded-xl border border-slate-200 bg-white font-semibold focus:ring-2 focus:ring-primary focus:outline-none appearance-none"
                value={method}
                onChange={e => setMethod(e.target.value as any)}
              >
                <option value="card">Carte Bancaire (CB)</option>
                <option value="cash">Numéraire (Espèces)</option>
                <option value="check">Chèque</option>
                <option value="transfer">Virement</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Description</label>
              <textarea
                placeholder="Ex: Vente chargeur iPhone, Achat écran..."
                className="w-full p-4 rounded-xl border border-slate-200 min-h-[100px] focus:ring-2 focus:ring-primary focus:outline-none"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          <button
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg ${
              type === 'income' ? 'bg-green-500 hover:bg-green-600 shadow-green-900/20' : 'bg-red-500 hover:bg-red-600 shadow-red-900/20'
            }`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                <PlusCircle className="w-5 h-5" /> Enregistrer l&apos;opération
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
