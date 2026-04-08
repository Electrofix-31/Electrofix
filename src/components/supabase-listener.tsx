'use client';

import { createClient } from '@/lib/supabase/client';
import { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SupabaseListener({
  accessToken,
  serverSession,
}: {
  accessToken?: string;
  serverSession: Session | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token !== accessToken) {
        // Seulement rafraichir si on passe de connecté à déconnecté ou inversement
        // ou si le token a expiré. On évite de rafraichir en boucle si l'état est stable mais légèrement désynchro.
        const wasSignedOut = !accessToken && !!session?.access_token;
        const wasSignedIn = !!accessToken && !session?.access_token;
        
        if (wasSignedOut || wasSignedIn || event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
           router.refresh();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [accessToken, supabase, router, mounted]);

  return null;
}

