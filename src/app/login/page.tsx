'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  Lock, Mail, Loader2, ArrowLeft, Eye, EyeOff, 
  User, Send, ShieldCheck 
} from 'lucide-react';
import Link from 'next/link';

type LoginMode = 'password' | 'magic-link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<LoginMode>('password');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'password') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        // Check if admin or technician
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role === 'admin') {
          router.push('/admin');
        } else if (profile?.role === 'technician') {
          router.push('/technician');
        } else {
          router.push('/'); // Client
        }
        router.refresh();
      } else {
        // Magic Link
        const { error: magicError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (magicError) throw magicError;
        setMessage({ type: 'success', text: 'Un lien magique a été envoyé à votre adresse email.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Une erreur est survenue lors de la connexion.' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Veuillez saisir votre adresse email pour réinitialiser votre mot de passe.' });
      return;
    }
    
    setLoading(true);
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
        throw new Error("Erreur critique du serveur (Les variables d'environnement sont probablement manquantes).");
      }

      if (!res.ok || data.error) throw new Error(data.error || "Erreur serveur inattendue.");

      setMessage({ type: 'success', text: 'Un lien de réinitialisation a été envoyé via Resend.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/5 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent/5 rounded-full filter blur-3xl"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-primary transition-all font-bold">
            <ArrowLeft className="w-4 h-4" /> Retour au site
          </Link>
        </div>

        <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-8 md:p-10">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl rotate-3 transform transition-transform hover:rotate-0">
              <User className="w-10 h-10 text-accent" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mon Compte</h1>
            <p className="text-slate-500 mt-2">Accédez à vos services ELECTRO&apos;FIX</p>
          </div>

          {/* Toggle Login Mode */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
            <button 
              onClick={() => setMode('password')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'password' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Mot de passe
            </button>
            <button 
              onClick={() => setMode('magic-link')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'magic-link' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Lien Magique
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Adresse Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-300" />
                </div>
                <input
                  type="email"
                  required
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {mode === 'password' && (
              <div>
                <div className="flex justify-between items-center mb-2 px-1">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Mot de passe</label>
                  <button 
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Oublié ?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-300" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-11 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}

            {message && (
              <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
              }`}>
                {message.type === 'success' ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-slate-900/20 active:scale-95"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  {mode === 'password' ? 'Se connecter' : 'Recevoir le lien'} 
                  {mode === 'password' ? <ShieldCheck className="w-5 h-5 text-accent" /> : <Send className="w-5 h-5 text-accent" />}
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-50 text-center">
            <p className="text-sm text-slate-400 font-medium">
              Pas encore de compte ? <Link href="/book" className="text-primary font-bold hover:underline">Prendre rendez-vous</Link>
            </p>
          </div>
        </div>
        
        <p className="text-center text-[10px] text-slate-300 mt-8 uppercase tracking-widest font-black">
          Sécurisé par Supabase Auth &bull; ELECTRO&apos;FIX 2026
        </p>
      </div>
    </div>
  );
}
