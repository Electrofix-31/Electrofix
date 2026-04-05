'use client';

import { useEffect, useState } from 'react';
import { 
  Users, UserPlus, Shield, ShieldOff, Trash2, 
  Search, Filter, Mail, Loader2, MoreVertical, ShieldAlert
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const supabase = createClient();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok) setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdate = async (targetUserId: string, updates: any) => {
    setActionLoading(targetUserId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, updates }),
      });
      if (res.ok) fetchUsers();
      else alert("Erreur lors de la mise à jour");
    } finally {
      setActionLoading(null);
    }
  };

  const sendResetEmail = async (email: string) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Clés d'API manquantes côté serveur.");
      }

      if (!res.ok || data?.error) throw new Error(data?.error || "Erreur serveur inattendue");
      
      alert(`Un email de réinitialisation via Resend a été envoyé à ${email}`);
    } catch (error: any) {
      alert(`Erreur : ${error.message}`);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(search.toLowerCase()) || 
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestion des Comptes</h1>
          <p className="text-slate-500">Gérez les accès, rôles et conformité RGPD de vos utilisateurs.</p>
        </div>
        <button 
          onClick={() => alert("Fonctionnalité d'invitation bientôt disponible")}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20"
        >
          <UserPlus className="w-5 h-5" /> Inviter un collaborateur
        </button>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none"
          >
            <option value="all">Tous les rôles</option>
            <option value="admin">Administrateurs</option>
            <option value="technician">Techniciens</option>
            <option value="client">Clients</option>
          </select>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-xs uppercase tracking-widest border-b border-slate-50">
                <th className="px-6 py-5 font-bold">Utilisateur</th>
                <th className="px-6 py-5 font-bold">Rôle</th>
                <th className="px-6 py-5 font-bold">Statut</th>
                <th className="px-6 py-5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className={`hover:bg-slate-50/50 transition-colors ${user.anonymized_at ? 'opacity-50 grayscale' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">
                        {user.first_name} {user.last_name}
                      </span>
                      <span className="text-xs text-slate-500">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={user.role}
                      onChange={(e) => handleUpdate(user.id, { role: e.target.value })}
                      disabled={actionLoading === user.id || user.anonymized_at}
                      className="text-xs font-bold bg-slate-100 px-3 py-1.5 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="client">Client</option>
                      <option value="technician">Technicien</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_blocked ? (
                      <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                        <ShieldOff className="w-3 h-3" /> Bloqué
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                        <Shield className="w-3 h-3" /> Actif
                      </span>
                    )}
                    {user.anonymized_at && (
                      <span className="ml-2 inline-flex items-center bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                        RGPD (Anonyme)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        title="Réinitialiser le mot de passe"
                        onClick={() => sendResetEmail(user.email)}
                        disabled={user.anonymized_at}
                        className="p-2 text-slate-400 hover:text-primary transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button 
                        title={user.is_blocked ? "Débloquer" : "Bloquer"}
                        onClick={() => handleUpdate(user.id, { is_blocked: !user.is_blocked })}
                        disabled={actionLoading === user.id || user.anonymized_at}
                        className={`p-2 transition-colors ${user.is_blocked ? 'text-green-500 hover:text-green-700' : 'text-orange-400 hover:text-orange-600'}`}
                      >
                        {user.is_blocked ? <Shield className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                      </button>
                      <button 
                        title="Anonymiser (RGPD)"
                        onClick={() => {
                          if (confirm(`Voulez-vous vraiment anonymiser ce compte ? Cette action est irréversible et conforme au droit à l'oubli RGPD.`)) {
                            handleUpdate(user.id, { anonymize: true });
                          }
                        }}
                        disabled={actionLoading === user.id || user.anonymized_at}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredUsers.length === 0 && (
            <div className="p-12 text-center text-slate-400 italic">
              Aucun utilisateur trouvé.
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4">
        <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 mb-1">Rappel de Sécurité & RGPD</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            L&apos;anonymisation d&apos;un compte supprime définitivement les données personnelles (nom, email, adresse) tout en conservant les données financières pour vos statistiques. Cette action répond à l&apos;obligation légale du droit à l&apos;oubli. Bloquer un compte suspend immédiatement tout accès sans supprimer les données.
          </p>
        </div>
      </div>
    </div>
  );
}
