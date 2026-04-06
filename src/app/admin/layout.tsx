import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LayoutDashboard, Users, Calendar, Package, Mail, Settings, LogOut, Shield } from 'lucide-react';
import Link from 'next/link';
import AdminLoginForm from '@/components/admin/AdminLoginForm';
import LogoutButton from '@/components/admin/LogoutButton';

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
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-100">
      {/* Barre de navigation (Sidebar sur Desktop / Header sur Mobile) */}
      <aside className="w-full lg:w-64 bg-slate-900 text-white flex flex-col lg:sticky lg:top-0 lg:h-screen shadow-xl z-50">
        <div className="p-4 lg:p-6 text-xl lg:text-2xl font-bold border-b border-slate-800 flex items-center justify-between lg:justify-start gap-2">
          <div className="flex items-center gap-2">
            <span className="text-accent">ADMIN</span>
            <span>FIX</span>
          </div>
          {/* Optionnel: Bouton Menu pour mobile ici plus tard */}
        </div>

        <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible p-2 lg:p-4 gap-1 lg:gap-2 no-scrollbar">
          <Link href="/admin" className="flex items-center gap-2 lg:gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors bg-slate-800 text-accent font-semibold whitespace-nowrap">
            <LayoutDashboard className="w-5 h-5" /> <span className="text-sm lg:text-base">Dashboard</span>
          </Link>
          <Link href="/admin/appointments" className="flex items-center gap-2 lg:gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 whitespace-nowrap">
            <Calendar className="w-5 h-5" /> <span className="text-sm lg:text-base">Rendez-vous</span>
          </Link>
          <Link href="/admin/users" className="flex items-center gap-2 lg:gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 whitespace-nowrap">
            <Shield className="w-5 h-5" /> <span className="text-sm lg:text-base">Utilisateurs</span>
          </Link>
          <Link href="/admin/technicians" className="flex items-center gap-2 lg:gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 whitespace-nowrap">
            <Users className="w-5 h-5" /> <span className="text-sm lg:text-base">Techniciens</span>
          </Link>
          <Link href="/admin/inventory" className="flex items-center gap-2 lg:gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 whitespace-nowrap">
            <Package className="w-5 h-5" /> <span className="text-sm lg:text-base">Stock</span>
          </Link>
          <Link href="/admin/emails" className="flex items-center gap-2 lg:gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 whitespace-nowrap">
            <Mail className="w-5 h-5" /> <span className="text-sm lg:text-base">Emails</span>
          </Link>
        </nav>

        <div className="hidden lg:flex flex-col p-4 border-t border-slate-800 gap-2 mt-auto">
          <Link href="/admin/settings" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-400">
            <Settings className="w-5 h-5" /> Paramètres
          </Link>
          <LogoutButton />
        </div>
      </aside>

      {/* Zone de contenu principale */}
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto w-full">
        {children}
      </main>
    </div>
  );
}
