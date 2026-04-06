'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/auth/signout', { method: 'POST' });
    router.refresh(); // Force Next.js à re-rendre la page pour afficher l'écran de login
  };

  return (
    <button 
      onClick={handleLogout}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-900/30 text-red-400 transition-colors"
    >
      <LogOut className="w-5 h-5" /> Déconnexion
    </button>
  );
}
