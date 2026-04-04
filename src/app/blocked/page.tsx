import { ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function BlockedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Compte Suspendu</h1>
        <p className="text-slate-600 mb-8 leading-relaxed">
          Votre accès au service ELECTRO&apos;FIX a été suspendu par l&apos;administrateur. 
          Veuillez nous contacter si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
        </p>
        
        <div className="space-y-4">
          <form action="/auth/signout" method="post">
            <button 
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" /> Se déconnecter
            </button>
          </form>
          
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Retour à l&apos;accueil
          </Link>
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-50 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          Référence Sécurité : EFIX-BLOCKED-USER
        </div>
      </div>
    </div>
  );
}
