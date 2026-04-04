import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LayoutDashboard, Users, Calendar, Package, Mail, Settings, LogOut, Shield } from 'lucide-react';
import Link from 'next/link';
import AdminLoginForm from '@/components/admin/AdminLoginForm';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Vérification de sécurité : Est-ce un admin ?
  if (!user) {
    return <AdminLoginForm />;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 p-4">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-slate-100 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogOut className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Accès Restreint</h1>
          <p className="text-slate-600 mb-6">
            Vous êtes connecté avec l&apos;email : <br/>
            <strong className="text-slate-900">{user.email}</strong>
          </p>
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl mb-8 text-sm text-amber-800">
            Votre rôle actuel est <strong>{profile?.role || 'client'}</strong>. Seuls les administrateurs peuvent accéder à cet espace.
          </div>
          
          <div className="space-y-3">
            <form action="/auth/signout" method="post">
              <button 
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Se déconnecter pour changer de compte
              </button>
            </form>
            <Link 
              href="/" 
              className="block w-full text-slate-500 hover:text-slate-800 font-bold text-sm py-2 transition-colors"
            >
              Retour au site public
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Barre latérale (Sidebar) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col sticky top-0 h-screen">
        <div className="p-6 text-2xl font-bold border-b border-slate-800 flex items-center gap-2">
          <span className="text-accent">ADMIN</span>
          <span>FIX</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors bg-slate-800 text-accent font-semibold">
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </Link>
          <Link href="/admin/appointments" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-400">
            <Calendar className="w-5 h-5" /> Rendez-vous
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-400">
            <Shield className="w-5 h-5" /> Utilisateurs
          </Link>
          <Link href="/admin/technicians" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-400">
            <Users className="w-5 h-5" /> Techniciens
          </Link>
          <Link href="/admin/inventory" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-400">
            <Package className="w-5 h-5" /> Stock & Boutique
          </Link>
          <Link href="/admin/emails" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-400">
            <Mail className="w-5 h-5" /> Emails (IA)
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link href="/admin/settings" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-400">
            <Settings className="w-5 h-5" /> Paramètres
          </Link>
          <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-900/30 text-red-400 transition-colors">
            <LogOut className="w-5 h-5" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Zone de contenu principale */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
