import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LayoutDashboard, Users, Calendar, Package, Mail, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Vérification de sécurité : Est-ce un admin ?
  if (!user) {
    redirect('/');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/');
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
